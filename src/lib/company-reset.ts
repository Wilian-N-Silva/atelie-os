import { eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { seedCompanyDefaults } from "@/db/bootstrap";
import {
  aiGenerations,
  auditLogs,
  brandThemes,
  categories,
  channelSkuMappings,
  codeSequences,
  companyBrandSettings,
  companySettings,
  customers,
  financeEntries,
  helpArticles,
  helpChecklistItems,
  helpChecklists,
  importOrders,
  incidents,
  integrationCredentials,
  inventoryLocations,
  inventoryLots,
  items,
  orderItems,
  orders,
  pendingInvites,
  priceHistory,
  productionOrders,
  purchaseItems,
  purchases,
  recipeComponents,
  recipes,
  recipeTests,
  recipeVersions,
  salesChannels,
  stockCountItems,
  stockCounts,
  stockMovements,
  suppliers,
  units,
  workflowSteps,
  workflows,
} from "@/db/schema";

export async function hardResetCompanyData(companyId: string, actorUserId?: string | null) {
  const recipeIds = (await db.query.recipes.findMany({
    where: eq(recipes.companyId, companyId),
    columns: { id: true },
  })).map((row) => row.id);
  const recipeVersionIds = recipeIds.length
    ? (await db.query.recipeVersions.findMany({
        where: inArray(recipeVersions.recipeId, recipeIds),
        columns: { id: true },
      })).map((row) => row.id)
    : [];
  const stockCountIds = (await db.query.stockCounts.findMany({
    where: eq(stockCounts.companyId, companyId),
    columns: { id: true },
  })).map((row) => row.id);
  const purchaseIds = (await db.query.purchases.findMany({
    where: eq(purchases.companyId, companyId),
    columns: { id: true },
  })).map((row) => row.id);
  const orderIds = (await db.query.orders.findMany({
    where: eq(orders.companyId, companyId),
    columns: { id: true },
  })).map((row) => row.id);
  const workflowIds = (await db.query.workflows.findMany({
    where: eq(workflows.companyId, companyId),
    columns: { id: true },
  })).map((row) => row.id);
  const checklistIds = (await db.query.helpChecklists.findMany({
    where: eq(helpChecklists.companyId, companyId),
    columns: { id: true },
  })).map((row) => row.id);

  await db.transaction(async (tx) => {
    await tx.delete(auditLogs).where(eq(auditLogs.companyId, companyId));

    if (recipeVersionIds.length) {
      await tx.delete(recipeComponents).where(inArray(recipeComponents.recipeVersionId, recipeVersionIds));
      await tx.delete(recipeTests).where(inArray(recipeTests.recipeVersionId, recipeVersionIds));
    }
    if (stockCountIds.length) {
      await tx.delete(stockCountItems).where(inArray(stockCountItems.countId, stockCountIds));
    }
    if (purchaseIds.length) {
      await tx.delete(purchaseItems).where(inArray(purchaseItems.purchaseId, purchaseIds));
    }
    if (orderIds.length) {
      await tx.delete(orderItems).where(inArray(orderItems.orderId, orderIds));
    }
    if (workflowIds.length) {
      await tx.delete(workflowSteps).where(inArray(workflowSteps.workflowId, workflowIds));
    }
    if (checklistIds.length) {
      await tx.delete(helpChecklistItems).where(inArray(helpChecklistItems.checklistId, checklistIds));
    }

    await tx.delete(stockMovements).where(eq(stockMovements.companyId, companyId));
    await tx.delete(inventoryLots).where(eq(inventoryLots.companyId, companyId));
    await tx.delete(incidents).where(eq(incidents.companyId, companyId));
    await tx.delete(productionOrders).where(eq(productionOrders.companyId, companyId));
    await tx.delete(importOrders).where(eq(importOrders.companyId, companyId));
    await tx.delete(channelSkuMappings).where(eq(channelSkuMappings.companyId, companyId));
    await tx.delete(priceHistory).where(eq(priceHistory.companyId, companyId));
    await tx.delete(financeEntries).where(eq(financeEntries.companyId, companyId));
    await tx.delete(orders).where(eq(orders.companyId, companyId));
    await tx.delete(purchases).where(eq(purchases.companyId, companyId));
    await tx.delete(customers).where(eq(customers.companyId, companyId));
    await tx.delete(suppliers).where(eq(suppliers.companyId, companyId));
    await tx.delete(stockCounts).where(eq(stockCounts.companyId, companyId));
    if (recipeVersionIds.length) {
      await tx.delete(recipeVersions).where(inArray(recipeVersions.id, recipeVersionIds));
    }
    await tx.delete(recipes).where(eq(recipes.companyId, companyId));
    await tx.delete(items).where(eq(items.companyId, companyId));

    await tx.delete(integrationCredentials).where(eq(integrationCredentials.companyId, companyId));
    await tx.delete(aiGenerations).where(eq(aiGenerations.companyId, companyId));
    await tx.delete(pendingInvites).where(eq(pendingInvites.companyId, companyId));
    await tx.delete(companyBrandSettings).where(eq(companyBrandSettings.companyId, companyId));
    await tx.delete(brandThemes).where(eq(brandThemes.companyId, companyId));
    await tx.delete(workflows).where(eq(workflows.companyId, companyId));
    await tx.delete(codeSequences).where(eq(codeSequences.companyId, companyId));
    await tx.delete(helpChecklists).where(eq(helpChecklists.companyId, companyId));
    await tx.delete(helpArticles).where(eq(helpArticles.companyId, companyId));
    await tx.delete(salesChannels).where(eq(salesChannels.companyId, companyId));
    await tx.delete(inventoryLocations).where(eq(inventoryLocations.companyId, companyId));
    await tx.delete(categories).where(eq(categories.companyId, companyId));
    await tx.delete(units).where(eq(units.companyId, companyId));
    await tx.delete(companySettings).where(eq(companySettings.companyId, companyId));
  });

  await seedCompanyDefaults(companyId, actorUserId ?? null, { audit: false });
}
