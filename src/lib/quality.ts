/**
 * Lot quality control (PRD 7.21). After cure, a produced lot is reviewed against
 * a checklist and released, blocked, or written off. Only an approved lot becomes
 * available; blocked/loss lots never reach sellable stock. The lot here is the
 * production order (it carries the lot code, cure location, and output stock).
 */

export const QC_CHECKLIST = [
  { key: "aroma", label: "Aroma aprovado" },
  { key: "intensidade", label: "Intensidade do aroma aceitável" },
  { key: "vidro", label: "Vidro sem trinca" },
  { key: "acabamento", label: "Acabamento da cera aprovado" },
  { key: "pavio", label: "Pavio centralizado" },
  { key: "tampa", label: "Tampa correta" },
  { key: "etiqueta", label: "Etiqueta aplicada corretamente" },
  { key: "dust_cover", label: "Dust cover aplicado (quando houver)" },
  { key: "lote", label: "Lote identificado" },
  { key: "embalagem", label: "Embalagem sem defeito" },
] as const;

export type QcChecklistItem = { key: string; label: string; checked: boolean };

export type QualityDecision = "approve" | "approve_note" | "partial" | "block" | "loss";

export function emptyQcChecklist(): QcChecklistItem[] {
  return QC_CHECKLIST.map((item) => ({ key: item.key, label: item.label, checked: false }));
}

export function isQualityDecision(value: unknown): value is QualityDecision {
  return value === "approve" || value === "approve_note" || value === "partial" || value === "block" || value === "loss";
}

/** Internal production status a quality decision moves the lot to. */
export function statusForDecision(decision: QualityDecision): string {
  if (decision === "block") return "bloqueada";
  if (decision === "loss") return "finalizada";
  return "liberada"; // approve / approve_note / partial -> release approved stock
}

export function qualityQuantities(decision: QualityDecision, planned: number, rawLossQty: number) {
  const total = Number.isFinite(planned) && planned > 0 ? planned : 0;
  const enteredLoss = Number.isFinite(rawLossQty) && rawLossQty > 0 ? rawLossQty : 0;
  const lossQty = decision === "loss"
    ? total
    : decision === "partial"
      ? Math.min(enteredLoss, Math.max(0, total - 0.001))
      : 0;
  const releaseQty = decision === "approve" || decision === "approve_note"
    ? total
    : decision === "partial"
      ? Math.max(0, total - lossQty)
      : 0;
  return {
    lossQty: Math.round(lossQty * 1000) / 1000,
    releaseQty: Math.round(releaseQty * 1000) / 1000,
  };
}

export function qualityRequiresNote(decision: QualityDecision) {
  return decision === "approve_note" || decision === "partial" || decision === "block" || decision === "loss";
}
