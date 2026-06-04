"use client";

import * as React from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  Icon,
  Input,
  Modal,
  Select,
  Tabs,
  cn,
  toast,
} from "@/components/ui";
import { LabelBarcode } from "@/components/label-barcode";
import { LabelSheetModelModal } from "@/components/label-sheet-model-modal";
import { BRAND_PRESETS } from "@/lib/screen-fixtures";
import {
  BARCODE_TYPE_OPTIONS,
  type BarcodeType,
  type LabelSheet,
  normalizeLabelSheet,
  useBarcodeType,
  useLabelSheets,
} from "@/lib/label-sheets";
import { Theme, type BrandTheme } from "@/lib/theme";
import {
  AUTO_LABELS,
  AUTOMATIONS,
  STEP_COLORS,
  WORKFLOW_PRESETS,
  cloneWorkflowSteps,
  type WorkflowEntity,
  type WorkflowStep,
  type WorkflowStepColor,
  useWorkflows,
} from "@/lib/workflows";
import type { Go, Route, Session } from "@/lib/types";

type SettingsTab = "branding" | "users" | "workflows" | "labels";
type SheetEditForm = {
  name: string;
  brand: string;
  code: string;
  pageW: string;
  pageH: string;
  cols: string;
  rows: string;
  labelW: string;
  labelH: string;
  mTop: string;
  mLeft: string;
  gutX: string;
  gutY: string;
  roll: string;
};

const NAV: { id: SettingsTab; label: string; sub: string; icon: string }[] = [
  { id: "branding", label: "Aparencia da marca", sub: "Cores, tema, logo", icon: "palette" },
  { id: "users", label: "Usuarios e acessos", sub: "Equipe, papeis, convites", icon: "user" },
  { id: "workflows", label: "Fluxos e Kanban", sub: "Etapas configuraveis", icon: "workflow" },
  { id: "labels", label: "Modelos de etiqueta", sub: "Folhas e tamanhos", icon: "tag" },
];

type BrandingResponse = {
  companyName: string;
  logoUrl: string | null;
  themeTokens: BrandTheme | null;
};

function BrandingTab({
  session,
  onSessionPatch,
}: {
  session: Session;
  onSessionPatch?: (patch: Partial<Session>) => void;
}) {
  const [activePreset, setActivePreset] = React.useState<string>(() => session.companyBranding?.themeTokens?.id ?? BRAND_PRESETS[0].id ?? "neutro");
  const [companyName, setCompanyName] = React.useState(session.companyName ?? "");
  const [logoUrl, setLogoUrl] = React.useState<string | null>(session.companyBranding?.logoUrl ?? null);
  const [saving, setSaving] = React.useState(false);

  const syncBranding = React.useCallback((payload: BrandingResponse) => {
    setCompanyName(payload.companyName);
    setLogoUrl(payload.logoUrl);
    setActivePreset(payload.themeTokens?.id ?? "custom");
    if (payload.themeTokens) Theme.apply(payload.themeTokens);
    onSessionPatch?.({
      companyName: payload.companyName,
      companyBranding: {
        logoUrl: payload.logoUrl,
        themeTokens: payload.themeTokens,
      },
    });
  }, [onSessionPatch]);

  React.useEffect(() => {
    let alive = true;
    fetch("/api/app/branding", { cache: "no-store", credentials: "include" })
      .then((res) => res.ok ? res.json() : null)
      .then((payload: BrandingResponse | null) => {
        if (alive && payload) syncBranding(payload);
      })
      .catch(() => null);
    return () => { alive = false; };
  }, [syncBranding]);

  const saveBranding = async (patch: { companyName?: string; logoUrl?: string | null; themeTokens?: BrandTheme }) => {
    setSaving(true);
    try {
      const res = await fetch("/api/app/branding", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
      });

      if (!res.ok) throw new Error("branding_update_failed");
      syncBranding(await res.json() as BrandingResponse);
      toast("Marca atualizada.", "ok");
    } catch {
      toast("Nao foi possivel salvar a marca.", "bad");
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (id: string) => {
    const preset = BRAND_PRESETS.find((item) => item.id === id);
    if (!preset) return;
    void saveBranding({ themeTokens: preset });
  };

  const onLogo = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      void saveBranding({ logoUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr", gap: "var(--gap)" }}>
      <Card>
        <CardHeader><CardTitle>Identidade</CardTitle></CardHeader>
        <CardContent>
          <div className="ff-grid">
            <Field label="Nome exibido no shell"><Input value={companyName} onChange={(event) => setCompanyName(event.target.value)} /></Field>
            <Field label="Logo">
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                <label className="om-btn om-btn--outline" style={{ cursor: "pointer" }}>
                  <Icon name="upload" size={15} /> Escolher arquivo
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onLogo} style={{ display: "none" }} />
                </label>
                {logoUrl && <Button variant="ghost" icon="trash" onClick={() => saveBranding({ logoUrl: null })}>Remover</Button>}
              </div>
            </Field>
          </div>
          <div className="row" style={{ gap: 10, marginTop: 14 }}>
            {logoUrl && <div className="sb-mark"><img src={logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 8 }} /></div>}
            <Button variant="default" icon="check" disabled={saving} onClick={() => saveBranding({ companyName })}>{saving ? "Salvando..." : "Salvar identidade"}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Presets de tema</CardTitle><Button variant="ghost" size="sm" disabled={saving} onClick={() => applyPreset(BRAND_PRESETS[0].id ?? "neutro")}>Restaurar</Button></CardHeader>
        <CardContent>
          <div className="preset-grid">
            {BRAND_PRESETS.map((preset) => (
              <button key={preset.id} className={cn("preset", activePreset === preset.id && "preset--on")} onClick={() => applyPreset(preset.id ?? "")}>
                <div className="preset-swatches">
                  <div style={{ background: preset.colors.background }} />
                  <div style={{ background: preset.colors.primary }} />
                  <div style={{ background: preset.colors.secondary }} />
                  <div style={{ background: preset.colors.accent }} />
                </div>
                <div className="preset-meta">
                  <span className="preset-name">{preset.name}</span>
                  <Badge tone={preset.mode === "dark" ? "neutral" : "outline"}>{preset.mode}</Badge>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UsersTab({ session }: { session: Session }) {
  const users = [
    { name: session.user.name, email: session.user.email, role: session.user.role, status: "ativo" },
    { name: "Camila", email: "camila@example.com", role: "admin", status: "convite pendente" },
    { name: "Operacao", email: "operacao@example.com", role: "operator", status: "ativo" },
  ];

  return (
    <Card style={{ overflow: "hidden" }}>
      <CardHeader><CardTitle>Equipe</CardTitle><Button variant="default" size="sm" icon="plus" onClick={() => toast("Convite registrado nesta sessao.", "info")}>Convidar usuario</Button></CardHeader>
      <table className="om-table">
        <thead><tr><th>Usuario</th><th>Papel</th><th>Status</th><th className="om-td-right">Acoes</th></tr></thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.email}>
              <td><div className="item-cell"><Avatar name={user.name} size={32} /><div><div className="cell-title">{user.name}</div><div className="cell-sub">{user.email}</div></div></div></td>
              <td><Badge tone={user.role === "owner" ? "ok" : user.role === "admin" ? "info" : "neutral"}>{user.role}</Badge></td>
              <td><Badge tone={user.status === "ativo" ? "ok" : "warn"} dot>{user.status}</Badge></td>
              <td className="om-td-right"><Button variant="ghost" size="sm" icon="settings">Permissoes</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

type WorkflowFlagKey = "blocks_availability" | "requires_checklist" | "requires_reason" | "requires_quantity_input";

const WORKFLOW_COLOR_VARS: Record<WorkflowStepColor, string> = {
  neutral: "--muted-foreground",
  info: "--info",
  cure: "--cure",
  warn: "--warn",
  ok: "--ok",
  bad: "--bad",
};

const WORKFLOW_FLAGS: { key: WorkflowFlagKey; label: string }[] = [
  { key: "blocks_availability", label: "Bloqueia venda" },
  { key: "requires_checklist", label: "Exige checklist" },
  { key: "requires_reason", label: "Exige motivo" },
  { key: "requires_quantity_input", label: "Pede quantidade" },
];

function WorkflowsTab() {
  const [workflows, setWorkflows, saveWorkflows] = useWorkflows();
  const [entity, setEntity] = React.useState<WorkflowEntity>("production");
  const [colorPop, setColorPop] = React.useState<number | null>(null);
  const [saved, setSaved] = React.useState(false);
  const steps = workflows[entity] ?? [];

  const update = (next: WorkflowStep[]) => {
    setWorkflows((current) => ({ ...current, [entity]: next }));
  };

  const setStep = (index: number, patch: Partial<WorkflowStep>) => {
    update(steps.map((step, stepIndex) => stepIndex === index ? { ...step, ...patch } : step));
  };

  const move = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= steps.length) return;
    const next = [...steps];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    update(next);
  };

  const archive = (index: number) => {
    update(steps.filter((_, stepIndex) => stepIndex !== index));
  };

  const addStep = () => {
    update([...steps, { key: `etapa_${steps.length + 1}`, label: "Nova etapa", color: "neutral", automation: "none" }]);
  };

  const loadPreset = (id: string) => {
    const preset = WORKFLOW_PRESETS[entity].find((item) => item.id === id);
    if (preset) update(cloneWorkflowSteps(preset.steps));
  };

  const save = async () => {
    try {
      await saveWorkflows(workflows);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
      toast("Fluxo atualizado para o tenant.", "ok");
    } catch {
      toast("Nao foi possivel salvar o fluxo.", "bad");
    }
  };

  const availabilityStep = steps.find((step) => step.blocks_availability)?.key ?? "waiting_release";

  return (
    <div className="wf-editor" onClick={() => setColorPop(null)}>
      <div className="row between" style={{ marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div className="set-section-title">Fluxos e Kanban</div>
          <div className="set-section-lede" style={{ marginBottom: 0 }}>Configure as etapas. O sistema usa a chave tecnica, entao renomear nao quebra nada.</div>
        </div>
        <Button variant="default" icon={saved ? "check" : "workflow"} onClick={save}>{saved ? "Salvo" : "Salvar fluxo"}</Button>
      </div>

      <div className="toolbar">
        <Tabs
          tabs={[
            { value: "production", label: "Producao", icon: "producao" },
            { value: "order", label: "Pedidos", icon: "pedidos" },
          ]}
          value={entity}
          onChange={(value) => setEntity(value as WorkflowEntity)}
        />
        <div className="spacer" />
        <Select
          value=""
          onChange={(value) => value && loadPreset(value)}
          options={WORKFLOW_PRESETS[entity].map((preset) => ({ value: preset.id, label: preset.name }))}
          placeholder="Carregar preset..."
          style={{ width: "auto", minWidth: 210 }}
        />
        <Button variant="outline" icon="plus" onClick={addStep}>Etapa</Button>
      </div>

      <div className="wf-info">
        <Icon name="alertCircle" size={15} />
        <div>Ex.: voce pode renomear <strong>Em cura</strong> para <strong>Secagem</strong> ou <strong>Resfriamento</strong>. A regra interna segue a chave <span className="wf-key">{availabilityStep}</span>, que bloqueia a venda.</div>
      </div>

      {steps.map((step, index) => (
        <div className="wf-step" key={`${step.key}-${index}`}>
          <div className="wf-step-handle">
            <button type="button" className="wf-handle-btn" disabled={index === 0} onClick={() => move(index, -1)}><Icon name="chevronUp" size={14} /></button>
            <button type="button" className="wf-handle-btn" disabled={index === steps.length - 1} onClick={() => move(index, 1)}><Icon name="chevronDown" size={14} /></button>
          </div>
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="wf-color"
              style={{ background: `hsl(var(${WORKFLOW_COLOR_VARS[step.color]}))` }}
              onClick={(event) => {
                event.stopPropagation();
                setColorPop(colorPop === index ? null : index);
              }}
              aria-label="Alterar cor da etapa"
            />
            {colorPop === index && (
              <div className="wf-color-pop" onClick={(event) => event.stopPropagation()}>
                {STEP_COLORS.map((color) => (
                  <button
                    type="button"
                    key={color}
                    className={cn("wf-color-opt", step.color === color && "wf-color-opt--on")}
                    style={{ background: `hsl(var(${WORKFLOW_COLOR_VARS[color]}))` }}
                    onClick={() => {
                      setStep(index, { color });
                      setColorPop(null);
                    }}
                    aria-label={`Cor ${color}`}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="wf-step-main">
            <div className="row" style={{ gap: 8 }}>
              <Input className="wf-label-input" value={step.label} onChange={(event) => setStep(index, { label: event.target.value })} />
              {step.is_initial && <Badge tone="info">inicial</Badge>}
              {step.is_final && <Badge tone="neutral">final</Badge>}
            </div>
            <div className="wf-flags">
              <span className="wf-key">{step.key}</span>
              {WORKFLOW_FLAGS.map((flag) => (
                <button
                  key={flag.key}
                  type="button"
                  className={cn("wf-flag", step[flag.key] && "wf-flag--on")}
                  onClick={() => setStep(index, { [flag.key]: !step[flag.key] })}
                >
                  <span className="wf-flag-dot" />{flag.label}
                </button>
              ))}
              <Select
                className="wf-auto"
                value={step.automation ?? "none"}
                onChange={(value) => setStep(index, { automation: value as WorkflowStep["automation"] })}
                options={AUTOMATIONS.map((automation) => ({ value: automation, label: AUTO_LABELS[automation] }))}
              />
            </div>
          </div>
          <button type="button" className="wf-handle-btn wf-trash-btn" onClick={() => archive(index)} title="Arquivar etapa"><Icon name="trash" size={15} /></button>
        </div>
      ))}

      <div className="muted" style={{ fontSize: 12, marginTop: 12, display: "flex", gap: 7, alignItems: "center" }}>
        <Icon name="lock" size={14} /> Etapas em uso por registros nao sao apagadas de verdade no backend; viram arquivadas e pedem migracao.
      </div>
    </div>
  );
}

const SHEET_PREVIEW_CODES = [
  "010300001287",
  "010300001294",
  "040100000931",
  "030100000208",
  "020300000613",
  "050100000017",
];

function settingsBarcodeHeight(type: BarcodeType) {
  return type === "qr" ? 84 : 54;
}

function settingsBarcodeScale(type: BarcodeType) {
  if (type === "code39") return 0.58;
  if (type === "ean13") return 1.15;
  return 0.95;
}

function sheetPreviewBarcodeHeight(type: BarcodeType, sheet: LabelSheet, scale: number) {
  if (type === "qr") return Math.max(24, Math.min(54, Math.min(sheet.labelW, sheet.labelH) * scale * 0.72));
  return Math.max(12, Math.min(28, sheet.labelH * scale * 0.42));
}

function sheetPreviewBarcodeScale(type: BarcodeType, sheet: LabelSheet, scale: number) {
  const cellWidth = Math.max(18, sheet.labelW * scale - 8);
  if (type === "code39") return Math.max(0.18, Math.min(0.55, cellWidth / 260));
  if (type === "ean13") return Math.max(0.28, Math.min(0.95, cellWidth / 130));
  return Math.max(0.24, Math.min(0.9, cellWidth / 145));
}

function sheetToForm(sheet: LabelSheet): SheetEditForm {
  return {
    name: sheet.name,
    brand: sheet.brand ?? "",
    code: sheet.code,
    pageW: String(sheet.pageW),
    pageH: String(sheet.pageH),
    cols: String(sheet.cols),
    rows: String(sheet.rows),
    labelW: String(sheet.labelW),
    labelH: String(sheet.labelH),
    mTop: String(sheet.mTop),
    mLeft: String(sheet.mLeft),
    gutX: String(sheet.gutX),
    gutY: String(sheet.gutY),
    roll: sheet.roll ? "true" : "",
  };
}

function parsePositive(value: string, fallback = 0) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegative(value: string, fallback = 0) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function formToSheet(sheet: LabelSheet, form: SheetEditForm) {
  return normalizeLabelSheet({
    ...sheet,
    name: form.name.trim() || sheet.name,
    brand: form.brand.trim() || "Personalizado",
    code: form.code.trim().toUpperCase() || sheet.code,
    pageW: parsePositive(form.pageW, sheet.pageW),
    pageH: parsePositive(form.pageH, sheet.pageH),
    cols: Math.max(1, Math.round(parsePositive(form.cols, sheet.cols))),
    rows: Math.max(1, Math.round(parsePositive(form.rows, sheet.rows))),
    labelW: parsePositive(form.labelW, sheet.labelW),
    labelH: parsePositive(form.labelH, sheet.labelH),
    mTop: parseNonNegative(form.mTop, sheet.mTop),
    mLeft: parseNonNegative(form.mLeft, sheet.mLeft),
    gutX: parseNonNegative(form.gutX, sheet.gutX),
    gutY: parseNonNegative(form.gutY, sheet.gutY),
    roll: form.roll === "true",
  });
}

function LabelSheetPreview({ sheet, barcodeType }: { sheet: LabelSheet; barcodeType: BarcodeType }) {
  const scale = Math.min(420 / sheet.pageW, 500 / sheet.pageH, sheet.roll ? 5.2 : 2.2);
  const width = sheet.pageW * scale;
  const height = sheet.pageH * scale;
  const perSheet = Math.min(sheet.cols * sheet.rows, 80);
  const barcodeHeight = sheetPreviewBarcodeHeight(barcodeType, sheet, scale);
  const barcodeScale = sheetPreviewBarcodeScale(barcodeType, sheet, scale);

  return (
    <div className="sheet-detail-stage">
      <div className="sheet-detail-page" style={{ width, height }}>
        {Array.from({ length: perSheet }).map((_, index) => {
          const row = Math.floor(index / sheet.cols);
          const col = index % sheet.cols;
          const code = SHEET_PREVIEW_CODES[index % SHEET_PREVIEW_CODES.length];
          return (
            <div
              key={index}
              className="sheet-detail-label"
              style={{
                left: (sheet.mLeft + col * (sheet.labelW + sheet.gutX)) * scale,
                top: (sheet.mTop + row * (sheet.labelH + sheet.gutY)) * scale,
                width: sheet.labelW * scale,
                height: sheet.labelH * scale,
              }}
            >
              <LabelBarcode code={code} type={barcodeType} height={barcodeHeight} scale={barcodeScale} />
              <span>{code}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LabelSheetDetailModal({
  open,
  sheet,
  barcodeType,
  onClose,
  onSave,
}: {
  open: boolean;
  sheet: LabelSheet | null;
  barcodeType: BarcodeType;
  onClose: () => void;
  onSave: (sheet: LabelSheet) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState<SheetEditForm | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !sheet) return;
    setForm(sheetToForm(sheet));
    setEditing(false);
    setError(null);
  }, [open, sheet]);

  if (!sheet || !form) return null;

  const setField = (field: keyof SheetEditForm, value: string) => {
    setForm((current) => current ? { ...current, [field]: value } : current);
    setError(null);
  };

  const save = () => {
    const next = formToSheet(sheet, form);
    if (!next.name.trim()) {
      setError("Informe o nome do modelo.");
      return;
    }
    if (next.cols * next.rows > 200) {
      setError("O modelo tem posicoes demais para uma folha.");
      return;
    }
    onSave(next);
    setEditing(false);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon="tag"
      title={sheet.name}
      subtitle={`${sheet.code} - ${sheet.roll ? "rolo" : `${sheet.cols}x${sheet.rows}`} - ${sheet.labelW}x${sheet.labelH}mm`}
      width={980}
      footer={editing ? (
        <>
          <Button variant="outline" onClick={() => { setForm(sheetToForm(sheet)); setEditing(false); setError(null); }}>Cancelar</Button>
          <div className="spacer" style={{ flex: 1 }} />
          <Button variant="default" icon="check" onClick={save}>Salvar alteracoes</Button>
        </>
      ) : (
        <>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <div className="spacer" style={{ flex: 1 }} />
          <Button variant="default" icon="settings" onClick={() => setEditing(true)}>Editar modelo</Button>
        </>
      )}
    >
      <div className="sheet-detail-layout">
        <div>
          <div className="block-label">Previa da folha</div>
          <LabelSheetPreview sheet={editing ? formToSheet(sheet, form) : sheet} barcodeType={barcodeType} />
          <div className="section-hint" style={{ marginTop: 10 }}>
            Previa com o tipo padrao atual. As medidas usam margem, espaco entre etiquetas e tamanho da folha.
          </div>
        </div>

        {editing ? (
          <div className="sheet-detail-form">
            <div className="ff-grid">
              <Field label="Nome"><Input value={form.name} onChange={(event) => setField("name", event.target.value)} /></Field>
              <Field label="Marca"><Input value={form.brand} onChange={(event) => setField("brand", event.target.value)} /></Field>
            </div>
            <div className="ff-grid">
              <Field label="Codigo"><Input value={form.code} onChange={(event) => setField("code", event.target.value.toUpperCase())} /></Field>
              <Field label="Rolo continuo">
                <label className="row" style={{ gap: 8, height: 36 }}>
                  <input type="checkbox" checked={form.roll === "true"} onChange={(event) => setField("roll", event.target.checked ? "true" : "")} />
                  <span className="muted" style={{ fontSize: 12.5 }}>Usar como rolo</span>
                </label>
              </Field>
            </div>
            <div className="ff-grid-3">
              <Field label="Largura folha"><Input inputMode="decimal" value={form.pageW} onChange={(event) => setField("pageW", event.target.value)} /></Field>
              <Field label="Altura folha"><Input inputMode="decimal" value={form.pageH} onChange={(event) => setField("pageH", event.target.value)} /></Field>
              <Field label="Colunas"><Input inputMode="numeric" value={form.cols} onChange={(event) => setField("cols", event.target.value.replace(/\D/g, ""))} /></Field>
            </div>
            <div className="ff-grid-3">
              <Field label="Linhas"><Input inputMode="numeric" value={form.rows} onChange={(event) => setField("rows", event.target.value.replace(/\D/g, ""))} /></Field>
              <Field label="Etiqueta L"><Input inputMode="decimal" value={form.labelW} onChange={(event) => setField("labelW", event.target.value)} /></Field>
              <Field label="Etiqueta A"><Input inputMode="decimal" value={form.labelH} onChange={(event) => setField("labelH", event.target.value)} /></Field>
            </div>
            <div className="ff-grid">
              <Field label="Margem superior"><Input inputMode="decimal" value={form.mTop} onChange={(event) => setField("mTop", event.target.value)} /></Field>
              <Field label="Margem esquerda"><Input inputMode="decimal" value={form.mLeft} onChange={(event) => setField("mLeft", event.target.value)} /></Field>
            </div>
            <div className="ff-grid">
              <Field label="Espaco horizontal"><Input inputMode="decimal" value={form.gutX} onChange={(event) => setField("gutX", event.target.value)} /></Field>
              <Field label="Espaco vertical"><Input inputMode="decimal" value={form.gutY} onChange={(event) => setField("gutY", event.target.value)} /></Field>
            </div>
            {error && <div className="ff-error">{error}</div>}
          </div>
        ) : (
          <div className="sheet-detail-summary">
            <div className="field"><span className="field-k">Marca</span><span className="field-v">{sheet.brand ?? "Personalizado"}</span></div>
            <div className="field"><span className="field-k">Folha</span><span className="field-v">{sheet.pageW}x{sheet.pageH}mm</span></div>
            <div className="field"><span className="field-k">Grade</span><span className="field-v">{sheet.cols} coluna(s) x {sheet.rows} linha(s)</span></div>
            <div className="field"><span className="field-k">Etiqueta</span><span className="field-v">{sheet.labelW}x{sheet.labelH}mm</span></div>
            <div className="field"><span className="field-k">Margens</span><span className="field-v">{sheet.mLeft}mm esquerda, {sheet.mTop}mm topo</span></div>
            <div className="field"><span className="field-k">Espacamento</span><span className="field-v">{sheet.gutX}mm horizontal, {sheet.gutY}mm vertical</span></div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function LabelsTab() {
  const [sheets, setSheets] = useLabelSheets();
  const [barcodeType, setBarcodeType] = useBarcodeType();
  const [selected, setSelected] = React.useState(sheets[0]?.id ?? "");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [detailSheetId, setDetailSheetId] = React.useState<string | null>(null);
  const detailSheet = sheets.find((sheet) => sheet.id === detailSheetId) ?? null;

  React.useEffect(() => {
    if (!sheets.some((sheet) => sheet.id === selected)) {
      setSelected(sheets[0]?.id ?? "");
    }
  }, [selected, sheets]);

  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr", gap: "var(--gap)" }}>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Codigo de barras</CardTitle>
            <div className="section-hint" style={{ marginTop: 2 }}>Padrao usado ao adicionar novas etiquetas</div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="settings-label-barcode">
            <div>
              <Field label="Tipo padrao do projeto">
                <Select
                  value={barcodeType}
                  onChange={(value) => setBarcodeType(value as BarcodeType)}
                  options={BARCODE_TYPE_OPTIONS}
                />
              </Field>
              <div className="section-hint">
                Use Code 128 para etiquetas compactas. Se a impressora ou leitor tiver dificuldade, teste Code 39, EAN-13 para codigos numericos ou QR Code.
              </div>
            </div>
            <div className="settings-barcode-preview">
              <LabelBarcode code="010300001287" type={barcodeType} height={settingsBarcodeHeight(barcodeType)} scale={settingsBarcodeScale(barcodeType)} />
              <div className="settings-barcode-code">010300001287</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Folhas cadastradas</CardTitle>
            <div className="section-hint" style={{ marginTop: 2 }}>{sheets.length} modelo(s) disponiveis para o tenant</div>
          </div>
          <Button variant="outline" size="sm" icon="plus" onClick={() => setCreateOpen(true)}>Novo modelo</Button>
        </CardHeader>
        <CardContent>
          <div className="sheet-grid-cards">
            {sheets.map((sheet) => (
              <button
                key={sheet.id}
                type="button"
                className={cn("sheet-card", selected === sheet.id && "sheet-card--on")}
                onClick={() => {
                  setSelected(sheet.id);
                  setDetailSheetId(sheet.id);
                }}
              >
                <div className="sheet-mini" style={{ gridTemplateColumns: `repeat(${Math.min(sheet.cols, 4)}, 1fr)`, width: 84, height: 110 }}>
                  {Array.from({ length: Math.min(sheet.cols * sheet.rows, 24) }).map((_, index) => <span key={index} className="sheet-mini-cell" />)}
                </div>
                <div className="row between"><strong style={{ fontSize: 13 }}>{sheet.name}</strong><Badge tone="outline">{sheet.code}</Badge></div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{sheet.roll ? "rolo" : `${sheet.cols}x${sheet.rows}`} - {sheet.labelW}x{sheet.labelH}mm</div>
                <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>{sheet.brand ?? "Sem marca"} - margem {sheet.mLeft}x{sheet.mTop}mm</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <LabelSheetModelModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(sheet) => {
          setSheets((current) => [sheet, ...current]);
          setSelected(sheet.id);
          toast("Modelo de folha criado para o tenant.", "ok");
        }}
      />
      <LabelSheetDetailModal
        open={!!detailSheet}
        sheet={detailSheet}
        barcodeType={barcodeType}
        onClose={() => setDetailSheetId(null)}
        onSave={(nextSheet) => {
          setSheets((current) => current.map((sheet) => sheet.id === nextSheet.id ? nextSheet : sheet));
          setSelected(nextSheet.id);
          toast("Modelo de folha atualizado para o tenant.", "ok");
        }}
      />
    </div>
  );
}

export function SettingsScreen({
  go,
  route,
  session,
  onSessionPatch,
}: {
  go: Go;
  route: Route;
  session: Session;
  onSessionPatch?: (patch: Partial<Session>) => void;
}) {
  const tab = (route.tab as SettingsTab) || "branding";
  const setTab = (next: SettingsTab) => go("configuracoes", { tab: next });

  return (
    <div className="page page--wide fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-h1">Configuracoes</h1>
          <p className="page-lede">Personalize marca, acessos, fluxos e etiquetas do atelie.</p>
        </div>
      </div>

      <div className="set-layout">
        <nav className="set-nav">
          {NAV.map((item) => (
            <button key={item.id} className={cn("set-nav-item", tab === item.id && "set-nav-item--on")} onClick={() => setTab(item.id)}>
              <Icon name={item.icon} size={18} className="muted" />
              <div><div>{item.label}</div><div className="set-nav-item-sub">{item.sub}</div></div>
            </button>
          ))}
        </nav>

        <div>
          {tab === "branding" && <BrandingTab session={session} onSessionPatch={onSessionPatch} />}
          {tab === "users" && <UsersTab session={session} />}
          {tab === "workflows" && <WorkflowsTab />}
          {tab === "labels" && <LabelsTab />}
        </div>
      </div>
    </div>
  );
}
