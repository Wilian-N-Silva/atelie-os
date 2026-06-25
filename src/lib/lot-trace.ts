export type LotTraceMovementType =
  | "production_consumption"
  | "production_output"
  | "production_release"
  | "quality_loss";

export type LotTraceMovement = {
  id: string;
  type: LotTraceMovementType;
  sku: string;
  itemName: string;
  quantity: number;
  lot: string | null;
  unitCost: number | null;
  lineCost: number | null;
  occurredAt: string;
  reason: string | null;
};

export type LotTraceQuality = {
  decision?: string;
  note?: string;
  lossQty?: number;
  reviewedAt?: string;
} | null;

export type LotTrace = {
  productionId: string;
  productionCode: string;
  productionNum: string;
  lot: string | null;
  productName: string;
  planned: number;
  status: string;
  quality: LotTraceQuality;
  outputQty: number;
  releasedQty: number;
  lossQty: number;
  realCost: number;
  unitCost: number | null;
  movements: LotTraceMovement[];
};

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function movementLineCost(quantity: number, unitCost: number | null | undefined) {
  if (!Number.isFinite(quantity) || quantity <= 0 || unitCost == null || !Number.isFinite(unitCost)) return null;
  return roundMoney(quantity * unitCost);
}

export function summarizeLotTrace(input: {
  productionId: string;
  productionCode: string;
  productionNum: string;
  lot: string | null;
  productName: string;
  planned: number;
  status: string;
  quality: LotTraceQuality;
  movements: LotTraceMovement[];
}): LotTrace {
  const realCost = roundMoney(input.movements.reduce((sum, movement) => (
    movement.type === "production_consumption" ? sum + (movement.lineCost ?? 0) : sum
  ), 0));
  const outputQty = input.movements.reduce((sum, movement) => movement.type === "production_output" ? sum + movement.quantity : sum, 0);
  const releasedQty = input.movements.reduce((sum, movement) => movement.type === "production_release" ? sum + movement.quantity : sum, 0);
  const movementLossQty = input.movements.reduce((sum, movement) => movement.type === "quality_loss" ? sum + movement.quantity : sum, 0);
  const qualityLossQty = Number(input.quality?.lossQty);
  const lossQty = Number.isFinite(qualityLossQty) && qualityLossQty > 0 ? qualityLossQty : movementLossQty;

  return {
    ...input,
    outputQty,
    releasedQty,
    lossQty,
    realCost,
    unitCost: input.planned > 0 && realCost > 0 ? roundMoney(realCost / input.planned) : null,
  };
}
