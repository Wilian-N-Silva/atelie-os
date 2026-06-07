import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLogs, workflows, workflowSteps } from "@/db/schema";
import { requireAppRole, requireAppRouteContext } from "@/lib/app-route-context";
import { SETTINGS_WRITE_ROLES } from "@/lib/permissions";
import {
  AUTOMATIONS,
  STEP_COLORS,
  defaultWorkflows,
  type WorkflowEntity,
  type WorkflowState,
  type WorkflowStep,
} from "@/lib/workflows";

export const runtime = "nodejs";

const ENTITIES: WorkflowEntity[] = ["production", "order"];

type StepFlags = Pick<
  WorkflowStep,
  "blocks_availability" | "requires_checklist" | "requires_reason" | "requires_quantity_input"
>;

function parseFlags(checklist: unknown): StepFlags {
  if (!Array.isArray(checklist)) return {};
  const options = checklist.find((item) => item && typeof item === "object" && "stepOptions" in item) as
    | { stepOptions?: StepFlags }
    | undefined;
  return options?.stepOptions ?? {};
}

function serializeFlags(step: WorkflowStep) {
  const stepOptions: StepFlags = {
    blocks_availability: Boolean(step.blocks_availability),
    requires_checklist: Boolean(step.requires_checklist),
    requires_reason: Boolean(step.requires_reason),
    requires_quantity_input: Boolean(step.requires_quantity_input),
  };
  return [{ stepOptions }];
}

function normalizeColor(value: unknown): WorkflowStep["color"] {
  return STEP_COLORS.includes(value as WorkflowStep["color"]) ? value as WorkflowStep["color"] : "neutral";
}

function normalizeAutomation(value: unknown): WorkflowStep["automation"] {
  return AUTOMATIONS.includes(value as NonNullable<WorkflowStep["automation"]>)
    ? value as WorkflowStep["automation"]
    : "none";
}

function normalizeStep(value: unknown, index: number): WorkflowStep | null {
  if (!value || typeof value !== "object") return null;
  const step = value as WorkflowStep;
  const key = String(step.key ?? "").trim();
  const label = String(step.label ?? "").trim();
  if (!key || !label) return null;
  return {
    key,
    label,
    color: normalizeColor(step.color),
    automation: normalizeAutomation(step.automation),
    is_initial: Boolean(step.is_initial || index === 0),
    is_final: Boolean(step.is_final),
    blocks_availability: Boolean(step.blocks_availability),
    requires_checklist: Boolean(step.requires_checklist),
    requires_reason: Boolean(step.requires_reason),
    requires_quantity_input: Boolean(step.requires_quantity_input),
  };
}

function normalizeState(value: unknown): WorkflowState | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<Record<WorkflowEntity, unknown>>;
  const next = {} as WorkflowState;

  for (const entity of ENTITIES) {
    if (!Array.isArray(input[entity])) return null;
    const steps = input[entity]
      .map((step, index) => normalizeStep(step, index))
      .filter((step): step is WorkflowStep => Boolean(step));
    if (!steps.length) return null;
    next[entity] = steps;
  }

  return next;
}

async function readWorkflowState(companyId: string): Promise<WorkflowState> {
  const state = defaultWorkflows();

  const rows = await db.query.workflows.findMany({
    where: and(eq(workflows.companyId, companyId), eq(workflows.isActive, true)),
    columns: { id: true, entity: true },
  });

  for (const workflow of rows) {
    if (workflow.entity !== "production" && workflow.entity !== "order") continue;
    const steps = await db.query.workflowSteps.findMany({
      where: eq(workflowSteps.workflowId, workflow.id),
      orderBy: (table, { asc }) => [asc(table.position)],
    });

    if (!steps.length) continue;
    state[workflow.entity] = steps.map((step) => ({
      key: step.technicalKey,
      label: step.label,
      color: normalizeColor(step.colorToken),
      automation: normalizeAutomation(step.automationType),
      is_initial: step.isInitial,
      is_final: step.isFinal,
      ...parseFlags(step.checklist),
    }));
  }

  return state;
}

async function saveWorkflowState(companyId: string, state: WorkflowState) {
  for (const entity of ENTITIES) {
    const technicalKey = `default_${entity}`;
    const [inserted] = await db
      .insert(workflows)
      .values({
        companyId,
        entity,
        name: entity === "production" ? "Producao" : "Pedidos",
        technicalKey,
      })
      .onConflictDoNothing()
      .returning({ id: workflows.id });

    const workflow = inserted ?? await db.query.workflows.findFirst({
      where: and(
        eq(workflows.companyId, companyId),
        eq(workflows.entity, entity),
        eq(workflows.technicalKey, technicalKey),
      ),
      columns: { id: true },
    });

    if (!workflow) continue;

    await db.delete(workflowSteps).where(eq(workflowSteps.workflowId, workflow.id));

    await db.insert(workflowSteps).values(
      state[entity].map((step, index) => ({
        workflowId: workflow.id,
        technicalKey: step.key,
        label: step.label,
        automationType: step.automation ?? "none",
        colorToken: step.color,
        position: index + 1,
        isInitial: Boolean(step.is_initial || index === 0),
        isFinal: Boolean(step.is_final),
        isProtected: false,
        checklist: serializeFlags(step),
      })),
    );
  }
}

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  return NextResponse.json({ workflows: await readWorkflowState(contextResult.context.company.id) });
}

export async function PATCH(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const roleError = requireAppRole(context, SETTINGS_WRITE_ROLES);
  if (roleError) return roleError;

  const body = await request.json().catch(() => null) as { workflows?: unknown } | null;
  const state = normalizeState(body?.workflows);
  if (!state) return NextResponse.json({ error: "invalid_workflows" }, { status: 400 });

  await saveWorkflowState(context.company.id, state);
  await db.insert(auditLogs).values({
    companyId: context.company.id,
    actorUserId: context.user.id,
    action: "workflow.update",
    entityType: "workflows",
    entityId: context.company.id,
    metadata: { entities: ENTITIES },
  });

  return NextResponse.json({ workflows: await readWorkflowState(context.company.id) });
}
