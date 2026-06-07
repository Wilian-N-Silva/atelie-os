/**
 * Stock count helpers (pure). A count snapshots the expected physical balance
 * per item; the operator enters the counted quantity; divergences become manual
 * adjustments only after explicit confirmation (PRD 7.22 / 10.10).
 */

export type StockCountLine = { itemId: string; sku: string; expected: number; counted: number | null };

export type StockCountAdjustment = { itemId: string; sku: string; direction: "increase" | "decrease"; quantity: number };

export function countDivergence(expected: number, counted: number | null): number | null {
  if (counted == null || !Number.isFinite(counted)) return null;
  return Math.round((counted - expected) * 1000) / 1000;
}

/** Adjustments needed to reconcile counted vs expected. Uncounted or zero-divergence lines are skipped. */
export function stockCountAdjustments(lines: StockCountLine[]): StockCountAdjustment[] {
  const adjustments: StockCountAdjustment[] = [];
  for (const line of lines) {
    const divergence = countDivergence(line.expected, line.counted);
    if (divergence == null || divergence === 0) continue;
    adjustments.push({
      itemId: line.itemId,
      sku: line.sku,
      direction: divergence > 0 ? "increase" : "decrease",
      quantity: Math.abs(divergence),
    });
  }
  return adjustments;
}

export function countSummary(lines: StockCountLine[]) {
  let counted = 0;
  let divergent = 0;
  for (const line of lines) {
    const divergence = countDivergence(line.expected, line.counted);
    if (divergence == null) continue;
    counted += 1;
    if (divergence !== 0) divergent += 1;
  }
  return { total: lines.length, counted, divergent };
}
