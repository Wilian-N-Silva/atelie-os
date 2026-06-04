import * as React from "react";

export type WorkflowEntity = "production" | "order";
export type WorkflowStepColor = "neutral" | "info" | "cure" | "warn" | "ok" | "bad";
export type WorkflowAutomation =
  | "none"
  | "reserve_stock"
  | "release_reservation"
  | "start_production"
  | "consume_materials"
  | "create_output_lot"
  | "block_stock_availability"
  | "release_stock_availability"
  | "request_quality_review"
  | "mark_ready_to_ship"
  | "mark_shipped"
  | "mark_delivered";

export type WorkflowStep = {
  key: string;
  label: string;
  color: WorkflowStepColor;
  automation?: WorkflowAutomation;
  is_initial?: boolean;
  is_final?: boolean;
  blocks_availability?: boolean;
  requires_checklist?: boolean;
  requires_reason?: boolean;
  requires_quantity_input?: boolean;
};

export type WorkflowState = Record<WorkflowEntity, WorkflowStep[]>;

export type WorkflowPreset = {
  id: string;
  name: string;
  entity: WorkflowEntity;
  steps: WorkflowStep[];
};

export const STEP_COLORS: WorkflowStepColor[] = ["neutral", "info", "cure", "warn", "ok", "bad"];

export const AUTOMATIONS: WorkflowAutomation[] = [
  "none",
  "reserve_stock",
  "release_reservation",
  "start_production",
  "consume_materials",
  "create_output_lot",
  "block_stock_availability",
  "release_stock_availability",
  "request_quality_review",
  "mark_ready_to_ship",
  "mark_shipped",
  "mark_delivered",
];

export const AUTO_LABELS: Record<WorkflowAutomation, string> = {
  none: "Nenhuma",
  reserve_stock: "Reservar estoque",
  release_reservation: "Liberar reserva",
  start_production: "Iniciar producao",
  consume_materials: "Consumir materiais",
  create_output_lot: "Gerar lote",
  block_stock_availability: "Bloquear venda",
  release_stock_availability: "Liberar para venda",
  request_quality_review: "Pedir revisao",
  mark_ready_to_ship: "Pronto p/ envio",
  mark_shipped: "Marcar enviado",
  mark_delivered: "Marcar entregue",
};

export const WORKFLOW_PRESETS: Record<WorkflowEntity, WorkflowPreset[]> = {
  production: [
    {
      id: "wf-velas",
      name: "Producao - Velas",
      entity: "production",
      steps: [
        { key: "aguardando_materiais", label: "Aguardando material", color: "warn", automation: "none", is_initial: true },
        { key: "em_producao", label: "Em producao", color: "info", automation: "start_production", requires_quantity_input: true },
        { key: "em_cura", label: "Em cura", color: "cure", automation: "block_stock_availability", blocks_availability: true, requires_checklist: true },
        { key: "aguardando_revisao", label: "Revisao de qualidade", color: "warn", automation: "request_quality_review", requires_checklist: true },
        { key: "liberada", label: "Liberada para venda", color: "ok", automation: "release_stock_availability" },
        { key: "finalizada", label: "Finalizada", color: "neutral", automation: "none", is_final: true },
      ],
    },
    {
      id: "wf-generica",
      name: "Producao - Generica",
      entity: "production",
      steps: [
        { key: "aguardando_materiais", label: "Aguardando material", color: "warn", is_initial: true },
        { key: "em_producao", label: "Em producao", color: "info", automation: "start_production" },
        { key: "aguardando_revisao", label: "Aguardando revisao", color: "warn", requires_checklist: true },
        { key: "liberada", label: "Aprovada", color: "ok", automation: "release_stock_availability" },
        { key: "finalizada", label: "Finalizada", color: "neutral", is_final: true },
      ],
    },
    {
      id: "wf-alimentos",
      name: "Producao - Alimentos",
      entity: "production",
      steps: [
        { key: "aguardando_materiais", label: "Preparando ingredientes", color: "warn", is_initial: true },
        { key: "em_producao", label: "Em preparo", color: "info", automation: "start_production" },
        { key: "em_cura", label: "Resfriamento / descanso", color: "cure", automation: "block_stock_availability", blocks_availability: true },
        { key: "aguardando_revisao", label: "Embalagem", color: "warn" },
        { key: "liberada", label: "Pronta para venda", color: "ok", automation: "release_stock_availability" },
        { key: "finalizada", label: "Finalizada", color: "neutral", is_final: true },
      ],
    },
    {
      id: "wf-kits",
      name: "Producao - Kits",
      entity: "production",
      steps: [
        { key: "aguardando_materiais", label: "Separando componentes", color: "warn", is_initial: true },
        { key: "em_producao", label: "Montando kit", color: "info", automation: "start_production" },
        { key: "aguardando_revisao", label: "Conferencia", color: "warn", requires_checklist: true },
        { key: "liberada", label: "Pronto para estoque", color: "ok" },
        { key: "finalizada", label: "Finalizada", color: "neutral", is_final: true },
      ],
    },
  ],
  order: [
    {
      id: "wf-pedidos",
      name: "Pedidos - Simples",
      entity: "order",
      steps: [
        { key: "aguardando_pagamento", label: "Aguardando pagamento", color: "warn", is_initial: true },
        { key: "pago", label: "Pago", color: "info", automation: "reserve_stock" },
        { key: "a_separar", label: "Separar", color: "info" },
        { key: "separado", label: "Separado", color: "info" },
        { key: "embalado", label: "Embalar", color: "info", requires_checklist: true },
        { key: "pronto_envio", label: "Pronto para envio", color: "ok", automation: "mark_ready_to_ship" },
        { key: "enviado", label: "Enviado", color: "neutral", automation: "mark_shipped", is_final: true },
      ],
    },
  ],
};

export function cloneWorkflowSteps(steps: WorkflowStep[]) {
  return steps.map((step) => ({ ...step }));
}

export function defaultWorkflows(): WorkflowState {
  return {
    production: cloneWorkflowSteps(WORKFLOW_PRESETS.production[0].steps),
    order: cloneWorkflowSteps(WORKFLOW_PRESETS.order[0].steps),
  };
}

export function useWorkflows() {
  const [workflows, setWorkflows] = React.useState<WorkflowState>(() => defaultWorkflows());
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    fetch("/api/app/workflows", { cache: "no-store", credentials: "include" })
      .then((res) => res.ok ? res.json() : null)
      .then((payload: { workflows?: WorkflowState } | null) => {
        if (alive && payload?.workflows) setWorkflows(payload.workflows);
      })
      .catch(() => null)
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => { alive = false; };
  }, []);

  const saveWorkflows = React.useCallback(async (next: WorkflowState) => {
    const res = await fetch("/api/app/workflows", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ workflows: next }),
    });

    if (!res.ok) throw new Error("workflow_save_failed");
    const payload = await res.json() as { workflows: WorkflowState };
    setWorkflows(payload.workflows);
    return payload.workflows;
  }, []);

  return [workflows, setWorkflows, saveWorkflows, loading] as const;
}
