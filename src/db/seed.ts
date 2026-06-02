import "dotenv/config";
import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { db, sqlClient } from "@/db/client";
import { items as sampleItems } from "@/lib/data";
import {
  account,
  auditLogs,
  categories,
  companies,
  companyMembers,
  inventoryLocations,
  items,
  stockMovements,
  units,
  user,
} from "@/db/schema";
import { seedCompanyDefaults } from "@/db/bootstrap";
import { slugify } from "@/lib/slug";

const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL?.trim() || "admin@example.com";
const OWNER_PASSWORD = getSeedOwnerPassword();
const COMPANY_NAME = "Instante Ambar";

function getSeedOwnerPassword() {
  const password = process.env.SEED_OWNER_PASSWORD?.trim();

  if (!password) {
    throw new Error("SEED_OWNER_PASSWORD is required. Set it in .env before running npm run db:seed.");
  }

  return password;
}

const itemTypeMap = {
  pa: "finished_good",
  mp: "raw_material",
  emb: "packaging",
  kit: "kit",
} as const;

async function ensureOwnerUser() {
  const ownerEmail = OWNER_EMAIL.trim().toLowerCase();
  let owner = await db.query.user.findFirst({
    where: eq(user.email, ownerEmail),
  });

  if (!owner) {
    [owner] = await db
      .insert(user)
      .values({
        id: randomUUID(),
        name: "Camila Ribeiro",
        email: ownerEmail,
        emailVerified: true,
      })
      .returning();
  }

  if (!owner) {
    throw new Error("Seed owner user was not created.");
  }

  const password = await hashPassword(OWNER_PASSWORD);
  const credentialAccount = await db.query.account.findFirst({
    where: and(eq(account.userId, owner.id), eq(account.providerId, "credential")),
    columns: { id: true },
  });

  if (credentialAccount) {
    await db
      .update(account)
      .set({
        accountId: owner.id,
        password,
        updatedAt: new Date(),
      })
      .where(eq(account.id, credentialAccount.id));
  } else {
    await db.insert(account).values({
      id: randomUUID(),
      accountId: owner.id,
      providerId: "credential",
      userId: owner.id,
      password,
    });
  }

  return owner;
}

async function ensureCompany(ownerId: string) {
  const slug = slugify(COMPANY_NAME);
  let company = await db.query.companies.findFirst({
    where: eq(companies.slug, slug),
  });

  if (!company) {
    [company] = await db
      .insert(companies)
      .values({
        name: COMPANY_NAME,
        slug,
        segment: "velas",
        teamSize: "small",
      })
      .returning();
  }

  await db
    .insert(companyMembers)
    .values({
      companyId: company.id,
      userId: ownerId,
      role: "owner",
      status: "active",
    })
    .onConflictDoNothing();

  await seedCompanyDefaults(company.id, ownerId);

  return company;
}

async function getLookupMaps(companyId: string) {
  const [categoryRows, unitRows, locationRows] = await Promise.all([
    db.query.categories.findMany({
      where: eq(categories.companyId, companyId),
    }),
    db.query.units.findMany({
      where: eq(units.companyId, companyId),
    }),
    db.query.inventoryLocations.findMany({
      where: eq(inventoryLocations.companyId, companyId),
    }),
  ]);

  return {
    categories: new Map(categoryRows.map((row) => [row.name, row.id])),
    units: new Map(unitRows.map((row) => [row.code, row.id])),
    locations: {
      default: locationRows.find((row) => row.type === "shelf")?.id ?? locationRows[0]?.id,
      packaging: locationRows.find((row) => row.type === "packaging")?.id ?? locationRows[0]?.id,
      cure: locationRows.find((row) => row.type === "cure")?.id ?? locationRows[0]?.id,
      blocked: locationRows.find((row) => row.type === "blocked")?.id ?? locationRows[0]?.id,
    },
  };
}

async function seedCatalog(companyId: string, ownerId: string) {
  const lookup = await getLookupMaps(companyId);

  for (const sample of sampleItems) {
    const defaultLocationId =
      sample.type === "emb"
        ? lookup.locations.packaging
        : lookup.locations.default;

    await db
      .insert(items)
      .values({
        companyId,
        internalCode: sample.code,
        sku: sample.sku,
        name: sample.name,
        variant: sample.variant,
        type: itemTypeMap[sample.type],
        categoryId: lookup.categories.get(sample.cat),
        baseUnitId: lookup.units.get(sample.unit),
        defaultLocationId,
        minStock: sample.min.toString(),
        tracksLot: sample.type === "mp" || sample.type === "pa",
        estimatedCost: sample.costAvg.toString(),
        averageCost: sample.costAvg.toString(),
        suggestedPrice: sample.priceSugg ? sample.priceSugg.toString() : null,
        currentPrice: sample.price ? sample.price.toString() : null,
        weightG: sample.weightG ?? null,
        packedWeightG: sample.packWeightG ?? null,
        dimensions: sample.dims ?? null,
        packedDimensions: sample.packDims ?? null,
        fragile: Boolean(sample.fragile),
        sellable: Boolean(sample.sell),
        metadata: {
          aroma: sample.aroma,
          collection: sample.collection,
          cureDays: sample.cureDays,
        },
      })
      .onConflictDoNothing();

    const item = await db.query.items.findFirst({
      where: and(eq(items.companyId, companyId), eq(items.sku, sample.sku)),
      columns: { id: true },
    });

    if (!item) continue;

    const existingMovement = await db.query.stockMovements.findFirst({
      where: and(eq(stockMovements.companyId, companyId), eq(stockMovements.itemId, item.id)),
      columns: { id: true },
    });

    if (existingMovement) continue;

    const movements: Array<{
      movementType: "adjustment_positive" | "reservation" | "production_output" | "block";
      quantity: string;
      toLocationId?: string;
      reason: string;
      sourceType: string;
    }> = [];

    if (sample.phys > 0) {
      movements.push({
        movementType: "adjustment_positive",
        quantity: sample.phys.toString(),
        toLocationId: defaultLocationId,
        reason: "Seed saldo fisico inicial",
        sourceType: "seed.initial.physical",
      });
    }

    if (sample.reserved > 0) {
      movements.push({
        movementType: "reservation",
        quantity: sample.reserved.toString(),
        toLocationId: defaultLocationId,
        reason: "Seed reserva inicial",
        sourceType: "seed.initial.reserved",
      });
    }

    if (sample.cure > 0) {
      movements.push({
        movementType: "production_output",
        quantity: sample.cure.toString(),
        toLocationId: lookup.locations.cure,
        reason: "Seed quantidade em cura",
        sourceType: "seed.initial.cure",
      });
    }

    if (sample.blocked > 0) {
      movements.push({
        movementType: "block",
        quantity: sample.blocked.toString(),
        toLocationId: lookup.locations.blocked,
        reason: "Seed quantidade bloqueada",
        sourceType: "seed.initial.blocked",
      });
    }

    if (movements.length) {
      await db.insert(stockMovements).values(
        movements.map((movement) => ({
          ...movement,
          companyId,
          itemId: item.id,
          createdByUserId: ownerId,
        })),
      );
    }
  }
}

async function main() {
  const owner = await ensureOwnerUser();
  const company = await ensureCompany(owner.id);
  await seedCatalog(company.id, owner.id);

  await db.insert(auditLogs).values({
    companyId: company.id,
    actorUserId: owner.id,
    action: "seed.run",
    entityType: "seed",
    entityId: "instante-ambar",
    metadata: {
      ownerEmail: OWNER_EMAIL,
      catalogItems: sampleItems.length,
    },
  });

  console.log(`Seed concluido: ${COMPANY_NAME}`);
  console.log(`Login: ${OWNER_EMAIL}`);
  console.log("Senha: use SEED_OWNER_PASSWORD from your local .env");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sqlClient.end({ timeout: 5 });
  });
