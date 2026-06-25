import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  auditLogs,
  brandThemes,
  categories,
  codeSequences,
  companies,
  companyBrandSettings,
  companyMembers,
  companySettings,
  helpArticles,
  helpChecklistItems,
  helpChecklists,
  inventoryLocations,
  pendingInvites,
  salesChannels,
  units,
  workflows,
  workflowSteps,
  type MemberRole,
} from "@/db/schema";
import {
  DEFAULT_CHANNELS,
  DEFAULT_LOCATIONS,
  DEFAULT_THEME,
  DEFAULT_UNITS,
  DEFAULT_WORKFLOWS,
  FIRST_STEPS,
  type OnboardingInvite,
} from "@/lib/seed-defaults";
import { sendTeamInviteEmail } from "@/lib/email-server";
import { slugify } from "@/lib/slug";

export async function uniqueCompanySlug(name: string) {
  const base = slugify(name);
  let candidate = base;
  let suffix = 2;

  while (true) {
    const existing = await db.query.companies.findFirst({
      where: eq(companies.slug, candidate),
      columns: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${base}-${suffix++}`;
  }
}

export async function ensureSeedAuditLog(input: {
  companyId: string;
  actorUserId?: string | null;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}) {
  const existing = await db.query.auditLogs.findFirst({
    where: and(
      eq(auditLogs.companyId, input.companyId),
      eq(auditLogs.action, "seed.run"),
      eq(auditLogs.entityType, input.entityType),
      eq(auditLogs.entityId, input.entityId),
    ),
    columns: { id: true },
  });

  if (existing) return;

  await db.insert(auditLogs).values({
    companyId: input.companyId,
    actorUserId: input.actorUserId ?? null,
    action: "seed.run",
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata ?? {},
  });
}

export async function seedCompanyDefaults(companyId: string, actorUserId?: string | null) {
  await db.insert(companySettings).values({ companyId }).onConflictDoNothing();

  const [insertedTheme] = await db
    .insert(brandThemes)
    .values({
      companyId,
      name: DEFAULT_THEME.name,
      tokens: DEFAULT_THEME,
      isPreset: true,
    })
    .onConflictDoNothing()
    .returning({ id: brandThemes.id });

  const theme = insertedTheme ?? (await db.query.brandThemes.findFirst({
    where: and(eq(brandThemes.companyId, companyId), eq(brandThemes.name, DEFAULT_THEME.name)),
    columns: { id: true },
  }));

  await db
    .insert(companyBrandSettings)
    .values({
      companyId,
      activeThemeId: theme?.id,
      themeTokens: DEFAULT_THEME,
    })
    .onConflictDoNothing();

  await db
    .insert(units)
    .values(DEFAULT_UNITS.map((unit) => ({ companyId, ...unit })))
    .onConflictDoNothing();

  await db
    .insert(inventoryLocations)
    .values(DEFAULT_LOCATIONS.map((location) => ({ companyId, ...location })))
    .onConflictDoNothing();

  await db
    .insert(salesChannels)
    .values(DEFAULT_CHANNELS.map((channel) => ({ companyId, ...channel })))
    .onConflictDoNothing();

  const categoryNames = [
    ["item", "Velas"],
    ["item", "Kits"],
    ["item", "Cera"],
    ["item", "Essencias"],
    ["item", "Pavios"],
    ["item", "Vidros"],
    ["item", "Tampas"],
    ["item", "Caixas"],
    ["item", "Brindes"],
  ];

  await db
    .insert(categories)
    .values(categoryNames.map(([kind, name]) => ({ companyId, kind, name })))
    .onConflictDoNothing();

  for (const workflow of DEFAULT_WORKFLOWS) {
    const [row] = await db
      .insert(workflows)
      .values({
        companyId,
        entity: workflow.entity,
        name: workflow.name,
        technicalKey: workflow.technicalKey,
      })
      .onConflictDoNothing()
      .returning({ id: workflows.id });

    const existing = row ?? (await db.query.workflows.findFirst({
      where: and(
        eq(workflows.companyId, companyId),
        eq(workflows.entity, workflow.entity),
        eq(workflows.technicalKey, workflow.technicalKey),
      ),
      columns: { id: true },
    }));

    if (!existing) continue;

    await db
      .insert(workflowSteps)
      .values(
        workflow.steps.map(([technicalKey, label, automationType, colorToken, isInitial, isFinal], index) => ({
          workflowId: existing.id,
          technicalKey: String(technicalKey),
          label: String(label),
          automationType: String(automationType),
          colorToken: String(colorToken),
          position: index + 1,
          isInitial: Boolean(isInitial),
          isFinal: Boolean(isFinal),
          isProtected: true,
        })),
      )
      .onConflictDoNothing();
  }

  await db
    .insert(codeSequences)
    .values(
      ["0101", "0102", "0103", "0104", "0203", "0301", "0401", "0501"].map((prefix) => ({
        companyId,
        prefix,
        nextValue: 1,
      })),
    )
    .onConflictDoNothing();

  await db
    .insert(helpArticles)
    .values([
      {
        companyId,
        slug: "primeiros-passos",
        module: "inicio",
        title: "Primeiros passos no Atelie OS",
        body: "Use o checklist inicial para configurar catalogo, estoque, receitas, pedidos e etiquetas sem partir de uma tela vazia.",
      },
      {
        companyId,
        slug: "estoque-por-movimentos",
        module: "estoque",
        title: "Estoque por movimentos",
        body: "Saldos nao sao editados diretamente. Entradas, perdas, reservas, consumo e envio devem gerar movimentos auditaveis.",
      },
    ])
    .onConflictDoNothing();

  const existingChecklist = await db.query.helpChecklists.findFirst({
    where: and(eq(helpChecklists.companyId, companyId), eq(helpChecklists.technicalKey, "first_steps")),
    columns: { id: true },
  });

  const [checklist] = existingChecklist
    ? [existingChecklist]
    : await db
        .insert(helpChecklists)
        .values({ companyId, technicalKey: "first_steps", title: "Primeiros passos" })
        .returning({ id: helpChecklists.id });

  await db
    .insert(helpChecklistItems)
    .values(
      FIRST_STEPS.map(([technicalKey, label, targetRoute, isOptional], index) => ({
        checklistId: checklist.id,
        technicalKey,
        label,
        targetRoute,
        isOptional,
        position: index + 1,
      })),
    )
    .onConflictDoNothing();

  await ensureSeedAuditLog({
    companyId,
    actorUserId: actorUserId ?? null,
    entityType: "company",
    entityId: companyId,
    metadata: { scope: "company_defaults" },
  });
}

export async function createCompanyForUser(input: {
  userId: string;
  companyName: string;
  segment?: string | null;
  teamSize?: string | null;
  invites?: OnboardingInvite[];
  logoUrl?: string | null;
}) {
  const existingMembership = await db.query.companyMembers.findFirst({
    where: and(eq(companyMembers.userId, input.userId), eq(companyMembers.status, "active")),
    columns: { companyId: true },
  });

  if (existingMembership) {
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, existingMembership.companyId),
      columns: { name: true },
    });
    return { companyId: existingMembership.companyId, companyName: company?.name ?? input.companyName };
  }

  const slug = await uniqueCompanySlug(input.companyName);
  const [company] = await db
    .insert(companies)
    .values({
      name: input.companyName,
      slug,
      segment: input.segment ?? null,
      teamSize: input.teamSize ?? null,
    })
    .returning({ id: companies.id, name: companies.name });

  if (!company) {
    throw new Error("Company creation did not return a row.");
  }

  await db.insert(companyMembers).values({
    companyId: company.id,
    userId: input.userId,
    role: "owner",
    status: "active",
  });

  await seedCompanyDefaults(company.id, input.userId);

  if (input.logoUrl) {
    await db
      .update(companyBrandSettings)
      .set({ logoUrl: input.logoUrl, updatedAt: new Date() })
      .where(eq(companyBrandSettings.companyId, company.id));
  }

  const validInvites = (input.invites ?? []).filter((invite): invite is { email: string; role: MemberRole } =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invite.email) &&
    ["admin", "operator"].includes(invite.role),
  );

  if (validInvites.length) {
    await db
      .insert(pendingInvites)
      .values(
        validInvites.map((invite) => ({
          companyId: company.id,
          email: invite.email.toLowerCase(),
          role: invite.role,
          invitedByUserId: input.userId,
        })),
      )
      .onConflictDoNothing();

    await db.insert(auditLogs).values(
      validInvites.map((invite) => ({
        companyId: company.id,
        actorUserId: input.userId,
        action: "member.invite" as const,
        entityType: "pending_invite",
        entityId: invite.email.toLowerCase(),
        metadata: { role: invite.role },
      })),
    );

    await Promise.all(validInvites.map((invite) => sendTeamInviteEmail({
      to: invite.email.toLowerCase(),
      companyName: company.name,
      role: invite.role,
    }).catch((error) => {
      console.warn("[email:invite_failed]", invite.email, error);
    })));
  }

  await db.insert(auditLogs).values({
    companyId: company.id,
    actorUserId: input.userId,
    action: "company.create",
    entityType: "company",
    entityId: company.id,
    metadata: { source: "onboarding" },
  });

  return { companyId: company.id, companyName: company.name };
}
