import type { WorkflowStep } from "@/lib/workflows";

// Status display (label, tone, ordering) is derived from the company-configured
// workflow returned by /api/app/workflows. Technical keys remain stable identifiers;
// only presentation comes from the workflow. Icons are a UI default keyed by the
// technical key (not business data the user edits) with a neutral fallback.

export type StatusTone = WorkflowStep["color"];

export type StatusInfo = {
  key: string;
  label: string;
  tone: StatusTone;
  step: number;
  isFinal: boolean;
  icon: string;
};

const DEFAULT_STATUS_ICONS: Record<string, string> = {
  // production
  aguardando_materiais: "box",
  em_producao: "producao",
  em_cura: "thermometer",
  aguardando_revisao: "listChecks",
  liberada: "checkCircle",
  finalizada: "check",
  // orders
  aguardando_pagamento: "banknote",
  pago: "banknote",
  a_separar: "scan",
  separado: "checkCircle",
  embalado: "box",
  pronto_envio: "truck",
  enviado: "truck",
  entregue: "checkCircle",
};

export function statusIcon(key: string) {
  return DEFAULT_STATUS_ICONS[key] ?? "circle";
}

export function buildStatusMap(steps: WorkflowStep[]): Map<string, StatusInfo> {
  const map = new Map<string, StatusInfo>();
  steps.forEach((step, index) => {
    map.set(step.key, {
      key: step.key,
      label: step.label,
      tone: step.color,
      step: index,
      isFinal: Boolean(step.is_final),
      icon: statusIcon(step.key),
    });
  });
  return map;
}

export function statusInfo(map: Map<string, StatusInfo>, key: string): StatusInfo {
  return (
    map.get(key) ?? {
      key,
      label: key,
      tone: "neutral",
      step: map.size,
      isFinal: false,
      icon: statusIcon(key),
    }
  );
}
