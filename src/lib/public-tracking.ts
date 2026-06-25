/**
 * Customer-facing order tracking model.
 *
 * Pure and source-agnostic: it maps an order's internal fields (status,
 * payment, carrier tracking) to a sanitized, customer-friendly view. The same
 * fields can be fed by manual entry, Melhor Envio, or a future marketplace
 * integration without changing this code or
 * the public endpoint. No PII, costs, tokens, or internal labels are exposed.
 */

export type PublicTrackingStageKey =
  | "recebido"
  | "em_preparacao"
  | "embalado"
  | "enviado"
  | "em_transito"
  | "entregue"
  | "cancelado";

export type PublicPaymentStatus = "pago" | "aguardando";

export const PUBLIC_TRACKING_STAGES: { key: Exclude<PublicTrackingStageKey, "cancelado">; label: string }[] = [
  { key: "recebido", label: "Pedido recebido" },
  { key: "em_preparacao", label: "Em preparação" },
  { key: "embalado", label: "Embalado" },
  { key: "enviado", label: "Enviado" },
  { key: "em_transito", label: "Em trânsito" },
  { key: "entregue", label: "Entregue" },
];

const STAGE_LABEL: Record<PublicTrackingStageKey, string> = {
  recebido: "Pedido recebido",
  em_preparacao: "Em preparação",
  embalado: "Embalado",
  enviado: "Enviado",
  em_transito: "Em trânsito",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

// Internal order status technical keys -> coarse customer stage. Unknown keys
// fall back to "em_preparacao" (work in progress). Keep keyed off technical
// keys, never editable display labels.
const STATUS_TO_STAGE: Record<string, PublicTrackingStageKey> = {
  aguardando_pagamento: "recebido",
  novo: "recebido",
  pago: "em_preparacao",
  a_separar: "em_preparacao",
  separando: "em_preparacao",
  separado: "em_preparacao",
  embalando: "embalado",
  embalado: "embalado",
  pronto_envio: "embalado",
  enviado: "enviado",
  entregue: "entregue",
  cancelado: "cancelado",
};

function stageIndex(key: PublicTrackingStageKey) {
  return PUBLIC_TRACKING_STAGES.findIndex((stage) => stage.key === key);
}

export type PublicTrackingInput = {
  number: string;
  placedAt: string | null;
  status: string;
  payment: PublicPaymentStatus;
  tracking: string | null;
  shippingLabel: {
    company?: string | null;
    serviceName?: string | null;
    tracking?: string | null;
    trackingUrl?: string | null;
    generatedAt?: string | null;
    postedAt?: string | null;
    deliveredAt?: string | null;
  } | null;
  shippingQuote: {
    company?: string | null;
    serviceName?: string | null;
    deliveryTime?: number | null;
  } | null;
};

export type PublicTracking = {
  order: { number: string; placedAt: string | null };
  payment: { status: PublicPaymentStatus; label: string };
  status: { stage: PublicTrackingStageKey; label: string };
  timeline: { stage: PublicTrackingStageKey; label: string; at: string | null; done: boolean }[];
  shipping: {
    carrier: string | null;
    service: string | null;
    code: string | null;
    url: string | null;
    estimatedDays: number | null;
  } | null;
};

function resolveStage(input: PublicTrackingInput): PublicTrackingStageKey {
  if (input.status === "cancelado") return "cancelado";
  const label = input.shippingLabel;
  if (label?.deliveredAt) return "entregue";
  let stage = STATUS_TO_STAGE[input.status] ?? "em_preparacao";
  // Carrier signals can advance the stage beyond what the internal status shows.
  if (label?.postedAt && stageIndex("em_transito") > stageIndex(stage)) stage = "em_transito";
  return stage;
}

export function buildPublicTracking(input: PublicTrackingInput): PublicTracking {
  const label = input.shippingLabel;
  const quote = input.shippingQuote;
  const stage = resolveStage(input);

  const stageAt: Partial<Record<PublicTrackingStageKey, string | null>> = {
    recebido: input.placedAt,
    enviado: label?.generatedAt ?? label?.postedAt ?? null,
    em_transito: label?.postedAt ?? null,
    entregue: label?.deliveredAt ?? null,
  };

  const currentIndex = stage === "cancelado" ? 0 : stageIndex(stage);
  const timeline = PUBLIC_TRACKING_STAGES.map((step, index) => ({
    stage: step.key,
    label: step.label,
    at: stageAt[step.key] ?? null,
    done: stage !== "cancelado" && index <= currentIndex,
  }));

  const carrier = label?.company ?? quote?.company ?? null;
  const service = label?.serviceName ?? quote?.serviceName ?? null;
  const code = input.tracking ?? label?.tracking ?? null;
  const url = label?.trackingUrl ?? null;
  const estimatedDays = quote?.deliveryTime ?? null;
  const hasShipping = Boolean(carrier || service || code || url);

  return {
    order: { number: input.number, placedAt: input.placedAt },
    payment: {
      status: input.payment,
      label: input.payment === "pago" ? "Pagamento confirmado" : "Aguardando pagamento",
    },
    status: { stage, label: STAGE_LABEL[stage] },
    timeline,
    shipping: hasShipping ? { carrier, service, code, url, estimatedDays } : null,
  };
}
