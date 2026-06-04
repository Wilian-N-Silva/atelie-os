import "dotenv/config";
import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { db, sqlClient } from "@/db/client";
import { seedItems, seedOrders } from "@/db/seed-data";
import {
  account,
  auditLogs,
  categories,
  companies,
  companyMembers,
  inventoryLocations,
  items,
  orderItems,
  orders,
  stockMovements,
  units,
  user,
} from "@/db/schema";
import { ensureSeedAuditLog, seedCompanyDefaults } from "@/db/bootstrap";
import { slugify } from "@/lib/slug";

const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL?.trim() || "admin@example.com";
const OWNER_NAME = process.env.SEED_OWNER_NAME?.trim() || OWNER_EMAIL;
const OWNER_PASSWORD = getSeedOwnerPassword();
const COMPANY_NAME = process.env.SEED_COMPANY_NAME?.trim() || "Atelie OS";

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
        name: OWNER_NAME,
        email: ownerEmail,
        emailVerified: true,
      })
      .returning();
  }

  if (!owner) {
    throw new Error("Seed owner user was not created.");
  }

  if (owner.name !== OWNER_NAME) {
    const [updatedOwner] = await db
      .update(user)
      .set({ name: OWNER_NAME, updatedAt: new Date() })
      .where(eq(user.id, owner.id))
      .returning();
    owner = updatedOwner ?? owner;
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

  for (const sample of seedItems) {
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

    const movements: Array<{
      movementType: "adjustment_positive" | "reservation" | "production_output" | "block";
      quantity: string;
      toLocationId?: string;
      reason: string;
      sourceType: string;
      sourceId: string;
    }> = [];

    if (sample.phys > 0) {
      movements.push({
        movementType: "adjustment_positive",
        quantity: sample.phys.toString(),
        toLocationId: defaultLocationId,
        reason: "Seed saldo fisico inicial",
        sourceType: "seed.initial.physical",
        sourceId: sample.sku,
      });
    }

    if (sample.reserved > 0) {
      movements.push({
        movementType: "reservation",
        quantity: sample.reserved.toString(),
        toLocationId: defaultLocationId,
        reason: "Seed reserva inicial",
        sourceType: "seed.initial.reserved",
        sourceId: sample.sku,
      });
    }

    if (sample.cure > 0) {
      movements.push({
        movementType: "production_output",
        quantity: sample.cure.toString(),
        toLocationId: lookup.locations.cure,
        reason: "Seed quantidade em cura",
        sourceType: "seed.initial.cure",
        sourceId: sample.sku,
      });
    }

    if (sample.blocked > 0) {
      movements.push({
        movementType: "block",
        quantity: sample.blocked.toString(),
        toLocationId: lookup.locations.blocked,
        reason: "Seed quantidade bloqueada",
        sourceType: "seed.initial.blocked",
        sourceId: sample.sku,
      });
    }

    for (const movement of movements) {
      const existingMovement = await db.query.stockMovements.findFirst({
        where: and(
          eq(stockMovements.companyId, companyId),
          eq(stockMovements.itemId, item.id),
          eq(stockMovements.sourceType, movement.sourceType),
        ),
        columns: { id: true },
      });

      if (existingMovement) continue;

      await db.insert(stockMovements).values({
        ...movement,
        companyId,
        itemId: item.id,
        createdByUserId: ownerId,
      });
    }
  }
}

async function seedDemoOrders(companyId: string, ownerId: string) {
  const itemRows = await db.query.items.findMany({
    where: eq(items.companyId, companyId),
    columns: { id: true, sku: true },
  });
  const skuToItemId = new Map(itemRows.map((item) => [item.sku, item.id]));

  for (const sample of seedOrders) {
    let order = await db.query.orders.findFirst({
      where: and(eq(orders.companyId, companyId), eq(orders.code, sample.code)),
      columns: { id: true },
    });

    if (!order) {
      [order] = await db
        .insert(orders)
        .values({
          companyId,
          code: sample.code,
          number: sample.number,
          channelKey: sample.channelKey,
          customerName: sample.customerName,
          city: sample.city,
          status: sample.status,
          paymentStatus: sample.paymentStatus,
          labelKind: sample.labelKind ?? "internal",
          freight: sample.freight.toString(),
          discount: sample.discount.toString(),
          total: sample.total.toString(),
          tracking: sample.tracking,
          note: sample.note,
          source: "seed.demo_order",
          createdByUserId: ownerId,
          metadata: { createdAtLabel: sample.createdAtLabel },
        })
        .returning({ id: orders.id });

      await db.insert(auditLogs).values({
        companyId,
        actorUserId: ownerId,
        action: "order.create",
        entityType: "order",
        entityId: order.id,
        metadata: {
          code: sample.code,
          number: sample.number,
          source: "seed.demo_order",
        },
      });
    }

    const existingLine = await db.query.orderItems.findFirst({
      where: eq(orderItems.orderId, order.id),
      columns: { id: true },
    });
    if (existingLine) continue;

    await db.insert(orderItems).values(sample.items.map((line) => ({
      orderId: order.id,
      itemId: skuToItemId.get(line.sku) ?? null,
      sku: line.sku,
      quantity: line.qty.toString(),
      unitPrice: line.unitPrice == null ? null : line.unitPrice.toString(),
    })));
  }
}

async function main() {
  const owner = await ensureOwnerUser();
  const company = await ensureCompany(owner.id);
  await seedCatalog(company.id, owner.id);
  await seedDemoOrders(company.id, owner.id);

  await ensureSeedAuditLog({
    companyId: company.id,
    actorUserId: owner.id,
    entityType: "seed",
    entityId: slugify(COMPANY_NAME),
    metadata: {
      ownerEmail: OWNER_EMAIL,
      catalogItems: seedItems.length,
      orders: seedOrders.length,
    },
  });

  console.log(`Seed concluido: ${COMPANY_NAME}`);
  console.log(`Nome: ${OWNER_NAME}`);
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
