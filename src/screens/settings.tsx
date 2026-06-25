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
import { BRAND_PRESETS } from "@/lib/domain";
import {
  BARCODE_TYPE_OPTIONS,
  type BarcodeType,
  type LabelSheet,
  normalizeLabelSheet,
  useBarcodeType,
  useLabelSheets,
} from "@/lib/label-sheets";
import { useLabelTemplates } from "@/lib/label-templates";
import { Theme, type BrandTheme } from "@/lib/theme";
import { lookupPostalCode } from "@/lib/postal-code-client";
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
import { CatalogTab } from "@/screens/settings-catalog";
import { ExportPanel } from "@/screens/exports";
import type { Go, Route, Session } from "@/lib/types";

type SettingsTab = "branding" | "users" | "workflows" | "labels" | "shipping" | "catalog" | "export";
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
  shape: string;
};

const NAV: { id: SettingsTab; label: string; sub: string; icon: string }[] = [
  { id: "branding", label: "Aparencia da marca", sub: "Cores, tema, logo", icon: "palette" },
  { id: "users", label: "Usuarios e acessos", sub: "Equipe, papeis, convites", icon: "user" },
  { id: "workflows", label: "Fluxos e Kanban", sub: "Etapas configuraveis", icon: "workflow" },
  { id: "labels", label: "Modelos de etiqueta", sub: "Folhas e tamanhos", icon: "tag" },
  { id: "shipping", label: "Envio", sub: "Melhor Envio e fallback manual", icon: "truck" },
  { id: "catalog", label: "Catalogo", sub: "Unidades e categorias", icon: "estoque" },
  { id: "export", label: "Exportar dados", sub: "Baixar CSV", icon: "fileText" },
];

type ShippingSettings = {
  melhorEnvioEnabled: boolean;
  hasMelhorEnvioToken: boolean;
  melhorEnvioConnected: boolean;
  melhorEnvioStatus: string;
  melhorEnvioEnvironment: string;
  melhorEnvioExpiresAt: string | null;
  melhorEnvioOAuthConfigured: boolean;
  originZip: string;
  originCity: string;
  defaultService: string;
  storeDocumentType: "cpf" | "cnpj";
  storeDocument: string;
  storeName: string;
  senderName: string;
  senderPhone: string;
  senderEmail: string;
  senderDocumentType: "cpf" | "cnpj";
  senderDocument: string;
  senderCompanyDocument: string;
  senderStateRegister: string;
  senderAddress: string;
  senderNumber: string;
  senderComplement: string;
  senderDistrict: string;
  senderStateAbbr: string;
  fiscalRegime: string;
  fiscalInvoiceDefault: string;
  defaultShippingAddressId: string;
  shippingAddresses: ShippingAddressSettings[];
};

type ShippingAddressSettings = {
  id: string;
  label: string;
  name: string;
  phone: string;
  email: string;
  documentType: "cpf" | "cnpj";
  document: string;
  companyDocument: string;
  stateRegister: string;
  address: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  stateAbbr: string;
  postalCode: string;
};

type ShippingQuoteService = {
  id: string;
  name: string;
  company: string | null;
  price: number;
  deliveryTime: number | null;
};

function onlyDigits(value: string, max = 32) {
  return value.replace(/\D/g, "").slice(0, max);
}

function maskCep(value: string) {
  const digits = onlyDigits(value, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

function maskPhone(value: string) {
  const digits = onlyDigits(value, 11);
  if (digits.length <= 10) {
    return digits.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_match, ddd, first, last) => [ddd && `(${ddd}`, ddd?.length === 2 && ") ", first, last && `-${last}`].filter(Boolean).join(""));
  }
  return digits.replace(/^(\d{0,2})(\d{0,5})(\d{0,4}).*/, (_match, ddd, first, last) => [ddd && `(${ddd}`, ddd?.length === 2 && ") ", first, last && `-${last}`].filter(Boolean).join(""));
}

function maskCpf(value: string) {
  return onlyDigits(value, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function maskCnpj(value: string) {
  return onlyDigits(value, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function maskDocument(value: string, type: "cpf" | "cnpj") {
  return type === "cnpj" ? maskCnpj(value) : maskCpf(value);
}

function isValidCpf(value: string) {
  const cpf = onlyDigits(value, 11);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (length: number) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) sum += Number(cpf[index]) * (length + 1 - index);
    const digit = (sum * 10) % 11;
    return digit === 10 ? 0 : digit;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

function isValidCnpj(value: string) {
  const cnpj = onlyDigits(value, 14);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (weights: number[]) => {
    const sum = weights.reduce((total, weight, index) => total + Number(cnpj[index]) * weight, 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  return calc([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(cnpj[12])
    && calc([6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(cnpj[13]);
}

function shippingAddressDocument(address: ShippingAddressSettings) {
  return address.documentType === "cnpj" ? address.companyDocument : address.document;
}

function shippingAddressComplete(address: ShippingAddressSettings) {
  const document = shippingAddressDocument(address);
  const documentOk = address.documentType === "cnpj" ? isValidCnpj(document) : isValidCpf(document);
  return Boolean(
    address.label.trim()
      && address.name.trim()
      && onlyDigits(address.phone, 16).length >= 10
      && address.email.includes("@")
      && documentOk
      && address.address.trim()
      && address.number.trim()
      && address.district.trim()
      && address.city.trim()
      && /^[A-Z]{2}$/.test(address.stateAbbr.trim())
      && onlyDigits(address.postalCode, 8).length === 8,
  );
}

function emptyShippingAddress(label = "Loja"): ShippingAddressSettings {
  return {
    id: `addr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label,
    name: "",
    phone: "",
    email: "",
    documentType: "cnpj",
    document: "",
    companyDocument: "",
    stateRegister: "",
    address: "",
    number: "",
    complement: "",
    district: "",
    city: "",
    stateAbbr: "",
    postalCode: "",
  };
}

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
    shape: sheet.shape === "circle" ? "circle" : "rect",
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
    shape: form.shape === "circle" ? "circle" : "rect",
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
                borderRadius: sheet.shape === "circle" ? "999px" : undefined,
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
            <div className="ff-grid">
              <Field label="Formato circular">
                <label className="row" style={{ gap: 8, height: 36 }}>
                  <input type="checkbox" checked={form.shape === "circle"} onChange={(event) => setField("shape", event.target.checked ? "circle" : "rect")} />
                  <span className="muted" style={{ fontSize: 12.5 }}>Etiqueta circular</span>
                </label>
              </Field>
              <div />
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
            <div className="field"><span className="field-k">Formato</span><span className="field-v">{sheet.shape === "circle" ? "Circular" : "Retangular"}</span></div>
            <div className="field"><span className="field-k">Margens</span><span className="field-v">{sheet.mLeft}mm esquerda, {sheet.mTop}mm topo</span></div>
            <div className="field"><span className="field-k">Espacamento</span><span className="field-v">{sheet.gutX}mm horizontal, {sheet.gutY}mm vertical</span></div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function LabelsTab({ go }: { go: Go }) {
  const [sheets, setSheets] = useLabelSheets();
  const [templates] = useLabelTemplates();
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
                Use Code 128 para codigos internos de 12 digitos. EAN-13 adiciona um digito verificador em codigos externos e pode ser lido sem o zero inicial.
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
            <CardTitle>Tipos de etiqueta</CardTitle>
            <div className="section-hint" style={{ marginTop: 2 }}>{templates.length} layout(s) salvos no tenant</div>
          </div>
          <Button variant="outline" size="sm" icon="palette" onClick={() => go("labelEditor")}>Abrir editor</Button>
        </CardHeader>
        <CardContent>
          <div className="sheet-grid-cards">
            {templates.map((template) => (
              <button key={template.id} type="button" className="sheet-card" onClick={() => go("labelEditor")}>
                <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                  <div className="chip chip--neutral"><Icon name={template.icon} size={15} /></div>
                  <strong style={{ fontSize: 13 }}>{template.name}</strong>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>{template.w}x{template.h}mm - {template.target}</div>
                <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>{template.elements?.length ?? 0} bloco(s) no layout</div>
              </button>
            ))}
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
                  {Array.from({ length: Math.min(sheet.cols * sheet.rows, 24) }).map((_, index) => <span key={index} className="sheet-mini-cell" style={{ borderRadius: sheet.shape === "circle" ? "999px" : undefined }} />)}
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
        onSave={(sheet) => {
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

function ShippingTab() {
  const [settings, setSettings] = React.useState<ShippingSettings>({
    melhorEnvioEnabled: false,
    hasMelhorEnvioToken: false,
    melhorEnvioConnected: false,
    melhorEnvioStatus: "disconnected",
    melhorEnvioEnvironment: "production",
    melhorEnvioExpiresAt: null,
    melhorEnvioOAuthConfigured: false,
    originZip: "",
    originCity: "",
    defaultService: "manual",
    storeDocumentType: "cnpj",
    storeDocument: "",
    storeName: "",
    senderName: "",
    senderPhone: "",
    senderEmail: "",
    senderDocumentType: "cpf",
    senderDocument: "",
    senderCompanyDocument: "",
    senderStateRegister: "",
    senderAddress: "",
    senderNumber: "",
    senderComplement: "",
    senderDistrict: "",
    senderStateAbbr: "",
    fiscalRegime: "",
    fiscalInvoiceDefault: "",
    defaultShippingAddressId: "",
    shippingAddresses: [emptyShippingAddress()],
  });
  const [destinationZip, setDestinationZip] = React.useState("");
  const [weightG, setWeightG] = React.useState("500");
  const [lengthCm, setLengthCm] = React.useState("16");
  const [widthCm, setWidthCm] = React.useState("11");
  const [heightCm, setHeightCm] = React.useState("4");
  const [quoteMessage, setQuoteMessage] = React.useState<string | null>(null);
  const [quoteServices, setQuoteServices] = React.useState<ShippingQuoteService[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [quoting, setQuoting] = React.useState(false);
  const [editingAddressId, setEditingAddressId] = React.useState<string | null>(null);
  const autoLookedUpAddressCep = React.useRef("");
  const defaultAddress = settings.shippingAddresses.find((address) => address.id === settings.defaultShippingAddressId) ?? settings.shippingAddresses[0];
  const editingAddress = settings.shippingAddresses.find((address) => address.id === editingAddressId) ?? null;
  const addressErrors = settings.shippingAddresses.filter((address) => !shippingAddressComplete(address)).length;

  const setSetting = <K extends keyof ShippingSettings>(key: K, value: ShippingSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const setAddress = (id: string, patch: Partial<ShippingAddressSettings>) => {
    setSettings((current) => ({
      ...current,
      shippingAddresses: current.shippingAddresses.map((address) => address.id === id ? { ...address, ...patch } : address),
    }));
  };

  const addAddress = () => {
    const next = emptyShippingAddress(`Expedicao ${settings.shippingAddresses.length + 1}`);
    setSettings((current) => ({
      ...current,
      shippingAddresses: [...current.shippingAddresses, next],
      defaultShippingAddressId: current.defaultShippingAddressId || next.id,
    }));
    setEditingAddressId(next.id);
  };

  const removeAddress = (id: string) => {
    setSettings((current) => {
      const next = current.shippingAddresses.filter((address) => address.id !== id);
      const fallback = next[0] ?? emptyShippingAddress();
      return {
        ...current,
        shippingAddresses: next.length ? next : [fallback],
        defaultShippingAddressId: current.defaultShippingAddressId === id ? fallback.id : current.defaultShippingAddressId,
      };
    });
  };

  const lookupAddressCep = async (id: string) => {
    const address = settings.shippingAddresses.find((item) => item.id === id);
    if (!address) return;
    try {
      const found = await lookupPostalCode(address.postalCode);
      setAddress(id, {
        postalCode: found.postalCode,
        address: found.address || address.address,
        district: found.district || address.district,
        city: found.city || address.city,
        stateAbbr: found.stateAbbr || address.stateAbbr,
        complement: address.complement || found.complement,
      });
    } catch {
      toast("Nao foi possivel buscar o CEP.", "bad");
    }
  };

  const sync = React.useCallback((payload: { shipping?: ShippingSettings } | null) => {
    if (!payload?.shipping) return;
    const addresses = payload.shipping.shippingAddresses?.length ? payload.shipping.shippingAddresses : [emptyShippingAddress()];
    setSettings({
      ...payload.shipping,
      shippingAddresses: addresses,
      defaultShippingAddressId: payload.shipping.defaultShippingAddressId || addresses[0]?.id || "",
    });
  }, []);

  React.useEffect(() => {
    let alive = true;
    fetch("/api/app/shipping", { cache: "no-store", credentials: "include" })
      .then((res) => res.ok ? res.json() : null)
      .then((payload) => { if (alive) sync(payload as { shipping?: ShippingSettings } | null); })
      .catch(() => null);
    return () => { alive = false; };
  }, [sync]);

  React.useEffect(() => {
    if (!editingAddress) return;
    const cep = onlyDigits(editingAddress.postalCode, 8);
    const key = `${editingAddress.id}:${cep}`;
    if (cep.length !== 8 || autoLookedUpAddressCep.current === key) return;
    autoLookedUpAddressCep.current = key;
    void lookupAddressCep(editingAddress.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingAddress?.id, editingAddress?.postalCode]);

  const save = async () => {
    if (settings.melhorEnvioEnabled && (!defaultAddress || !shippingAddressComplete(defaultAddress))) {
      toast("Complete o endereco de expedicao padrao antes de ativar o Melhor Envio.", "bad");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/app/shipping", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          melhorEnvioEnabled: settings.melhorEnvioEnabled,
          originZip: settings.originZip,
          originCity: settings.originCity,
          defaultService: settings.defaultService,
          storeDocumentType: settings.storeDocumentType,
          storeDocument: onlyDigits(settings.storeDocument, settings.storeDocumentType === "cnpj" ? 14 : 11),
          storeName: settings.storeName,
          senderName: defaultAddress?.name ?? settings.senderName,
          senderPhone: defaultAddress?.phone ?? settings.senderPhone,
          senderEmail: settings.senderEmail,
          senderDocumentType: defaultAddress?.documentType ?? settings.senderDocumentType,
          senderDocument: settings.senderDocument,
          senderCompanyDocument: settings.senderCompanyDocument,
          senderStateRegister: settings.senderStateRegister,
          senderAddress: settings.senderAddress,
          senderNumber: settings.senderNumber,
          senderComplement: settings.senderComplement,
          senderDistrict: settings.senderDistrict,
          senderStateAbbr: settings.senderStateAbbr,
          fiscalRegime: settings.fiscalRegime,
          fiscalInvoiceDefault: settings.fiscalInvoiceDefault,
          defaultShippingAddressId: settings.defaultShippingAddressId,
          shippingAddresses: settings.shippingAddresses.map((address) => ({
            ...address,
            phone: onlyDigits(address.phone, 16),
            document: address.documentType === "cpf" ? onlyDigits(address.document, 11) : "",
            companyDocument: address.documentType === "cnpj" ? onlyDigits(address.companyDocument, 14) : "",
            postalCode: onlyDigits(address.postalCode, 8),
            stateAbbr: address.stateAbbr.toUpperCase(),
          })),
        }),
      });
      if (!res.ok) throw new Error("shipping_save_failed");
      sync(await res.json() as { shipping?: ShippingSettings });
      toast("Configuração de envio salva.", "ok");
    } catch {
      toast("Não foi possível salvar o envio.", "bad");
    } finally {
      setSaving(false);
    }
  };

  const quote = async () => {
    setQuoting(true);
    setQuoteServices([]);
    try {
      const res = await fetch("/api/app/shipping", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          destinationZip,
          weightG: Number(weightG) || 0,
          lengthCm: Number(lengthCm) || 0,
          widthCm: Number(widthCm) || 0,
          heightCm: Number(heightCm) || 0,
        }),
      });
      if (!res.ok) throw new Error("shipping_quote_failed");
      const payload = await res.json() as { quote?: { message?: string; services?: ShippingQuoteService[] } };
      setQuoteMessage(payload.quote?.message ?? "Cotação indisponível. Use o preenchimento manual.");
      setQuoteServices(payload.quote?.services ?? []);
    } catch {
      setQuoteMessage("Cotação indisponível. Use frete, etiqueta e rastreio manualmente.");
    } finally {
      setQuoting(false);
    }
  };

  const connect = () => {
    if (!settings.melhorEnvioOAuthConfigured) {
      toast("OAuth do Melhor Envio ainda nao foi configurado no servidor.", "bad");
      return;
    }
    window.location.href = "/api/app/shipping/oauth/start";
  };

  const disconnect = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/app/shipping", {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("shipping_disconnect_failed");
      sync(await res.json() as { shipping?: ShippingSettings });
      toast("Melhor Envio desconectado.", "info");
    } catch {
      toast("Nao foi possivel desconectar o Melhor Envio.", "bad");
    } finally {
      setSaving(false);
    }
  };

  const expires = settings.melhorEnvioExpiresAt
    ? new Date(settings.melhorEnvioExpiresAt).toLocaleDateString("pt-BR")
    : null;

  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr", gap: "var(--gap)" }}>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Melhor Envio</CardTitle>
            <div className="section-hint" style={{ marginTop: 2 }}>A integração é opcional. O pedido continua aceitando frete, etiqueta e rastreio manuais.</div>
          </div>
          <Badge tone={settings.melhorEnvioEnabled && settings.hasMelhorEnvioToken ? "ok" : "neutral"} dot>
            {settings.melhorEnvioEnabled && settings.hasMelhorEnvioToken ? "configurado" : "manual"}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="ff-grid">
            <Field label="Ativar integração">
              <label className="row" style={{ gap: 8, height: 36 }}>
                <input
                  type="checkbox"
                  checked={settings.melhorEnvioEnabled}
                  onChange={(event) => setSettings((current) => ({ ...current, melhorEnvioEnabled: event.target.checked }))}
                />
                <span className="muted" style={{ fontSize: 12.5 }}>Usar Melhor Envio quando a conta estiver conectada</span>
              </label>
            </Field>
            <Field label="Serviço padrão">
              <Select
                value={settings.defaultService}
                onChange={(value) => setSettings((current) => ({ ...current, defaultService: value }))}
                options={[
                  { value: "manual", label: "Manual" },
                  { value: "melhor_envio", label: "Melhor Envio" },
                ]}
              />
            </Field>
          </div>
          <div className="row between" style={{ gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            <div style={{ minWidth: 220, flex: "1 1 260px" }}>
              <div className="block-label">Conexao segura</div>
              <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                {settings.melhorEnvioConnected
                  ? `OAuth conectado em ${settings.melhorEnvioEnvironment}${expires ? `, expira em ${expires}` : ""}.`
                  : settings.melhorEnvioOAuthConfigured
                    ? "Conecte com OAuth. O token fica criptografado e nunca aparece no navegador."
                    : "Configure MELHOR_ENVIO_CLIENT_ID, MELHOR_ENVIO_CLIENT_SECRET e MELHOR_ENVIO_REDIRECT_URI no servidor."}
              </div>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              {settings.melhorEnvioConnected ? (
                <Button variant="outline" icon="unlock" disabled={saving} onClick={disconnect}>Desconectar</Button>
              ) : (
                <Button variant="outline" icon="lock" disabled={saving || !settings.melhorEnvioOAuthConfigured} onClick={connect}>Conectar Melhor Envio</Button>
              )}
              <Button variant="default" icon="check" disabled={saving} onClick={save}>{saving ? "Salvando..." : "Salvar envio"}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Dados da loja</CardTitle>
            <div className="section-hint" style={{ marginTop: 2 }}>Cadastro fiscal e identificação do tenant.</div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="ff-grid">
            <Field label="Nome da loja" required>
              <Input value={settings.storeName} onChange={(event) => setSetting("storeName", event.target.value)} />
            </Field>
            <Field label="Documento da loja" required>
              <div className="row" style={{ gap: 8 }}>
                <Select
                  value={settings.storeDocumentType}
                  onChange={(value) => setSettings((current) => ({
                    ...current,
                    storeDocumentType: value as "cpf" | "cnpj",
                    storeDocument: "",
                  }))}
                  options={[
                    { value: "cnpj", label: "CNPJ" },
                    { value: "cpf", label: "CPF" },
                  ]}
                  style={{ width: 104 }}
                />
                <Input
                  value={maskDocument(settings.storeDocument, settings.storeDocumentType)}
                  onChange={(event) => setSetting("storeDocument", onlyDigits(event.target.value, settings.storeDocumentType === "cnpj" ? 14 : 11))}
                  placeholder={settings.storeDocumentType === "cnpj" ? "00.000.000/0000-00" : "000.000.000-00"}
                />
              </div>
            </Field>
          </div>
          <div className="ff-grid-3">
            <Field label="Inscrição estadual">
              <Input value={settings.senderStateRegister} onChange={(event) => setSetting("senderStateRegister", event.target.value)} />
            </Field>
            <Field label="Regime fiscal">
              <Input value={settings.fiscalRegime} onChange={(event) => setSetting("fiscalRegime", event.target.value)} placeholder="Simples Nacional, MEI..." />
            </Field>
            <Field label="NF padrão">
              <Input value={settings.fiscalInvoiceDefault} onChange={(event) => setSetting("fiscalInvoiceDefault", event.target.value)} placeholder="Declaracao ou NF-e" />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Endereços de expedição</CardTitle>
            <div className="section-hint" style={{ marginTop: 2 }}>
              {addressErrors ? `${addressErrors} endereco(s) com dados pendentes.` : "Enderecos prontos para cotacao e etiqueta."}
            </div>
          </div>
          <Button variant="outline" size="sm" icon="plus" onClick={addAddress}>Adicionar endereço</Button>
        </CardHeader>
        <CardContent>
          <div className="shipping-address-grid">
            {settings.shippingAddresses.map((address) => {
              const complete = shippingAddressComplete(address);
              return (
                <button
                  key={address.id}
                  type="button"
                  className={cn("shipping-address-card", settings.defaultShippingAddressId === address.id && "shipping-address-card--on")}
                  onClick={() => setEditingAddressId(address.id)}
                >
                  <div className="row between" style={{ gap: 10 }}>
                    <strong>{address.label || "Endereco"}</strong>
                    <Badge tone={complete ? "ok" : "warn"}>{complete ? "completo" : "pendente"}</Badge>
                  </div>
                  <div className="shipping-address-card-body">
                    <span>{address.name || "Remetente pendente"}</span>
                    <span>{address.city ? `${address.city}${address.stateAbbr ? ` - ${address.stateAbbr}` : ""}` : "Cidade pendente"}</span>
                    <span>{address.postalCode ? maskCep(address.postalCode) : "CEP pendente"}</span>
                  </div>
                  <div className="row between" style={{ gap: 8, marginTop: 10 }}>
                    <Badge tone={settings.defaultShippingAddressId === address.id ? "info" : "outline"}>
                      {settings.defaultShippingAddressId === address.id ? "padrao" : "alternativo"}
                    </Badge>
                    <span className="muted" style={{ fontSize: 12 }}>Editar</span>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Teste de cotação</CardTitle>
            <div className="section-hint" style={{ marginTop: 2 }}>Consulta o Melhor Envio quando a conta OAuth estiver conectada; caso contrário, mantém o fallback manual.</div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="ff-grid">
            <Field label="CEP destino"><Input value={destinationZip} onChange={(event) => setDestinationZip(event.target.value)} placeholder="00000-000" /></Field>
            <Field label="Peso embalado (g)"><Input value={weightG} inputMode="numeric" onChange={(event) => setWeightG(event.target.value.replace(/\D/g, ""))} /></Field>
          </div>
          <div className="ff-grid-3">
            <Field label="Comprimento (cm)"><Input value={lengthCm} inputMode="decimal" onChange={(event) => setLengthCm(event.target.value.replace(/[^\d,.]/g, ""))} /></Field>
            <Field label="Largura (cm)"><Input value={widthCm} inputMode="decimal" onChange={(event) => setWidthCm(event.target.value.replace(/[^\d,.]/g, ""))} /></Field>
            <Field label="Altura (cm)"><Input value={heightCm} inputMode="decimal" onChange={(event) => setHeightCm(event.target.value.replace(/[^\d,.]/g, ""))} /></Field>
          </div>
          <div className="row" style={{ gap: 10, alignItems: "center" }}>
            <Button variant="outline" icon="truck" disabled={quoting} onClick={quote}>{quoting ? "Consultando..." : "Testar cotação"}</Button>
            {quoteMessage && <span className="muted" style={{ fontSize: 13 }}>{quoteMessage}</span>}
          </div>
          {quoteServices.length > 0 && (
            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              {quoteServices.slice(0, 4).map((service) => (
                <div key={`${service.id}-${service.name}`} className="row between" style={{ gap: 10, padding: "9px 0", borderTop: "1px solid hsl(var(--border))" }}>
                  <div>
                    <div className="cell-title">{service.company ? `${service.company} - ${service.name}` : service.name}</div>
                    <div className="cell-sub">{service.deliveryTime === null ? "Prazo indisponível" : `Até ${service.deliveryTime} dia(s)`}</div>
                  </div>
                  <strong>{service.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        open={!!editingAddress}
        onClose={() => setEditingAddressId(null)}
        title={editingAddress ? `Endereço: ${editingAddress.label || "expedição"}` : "Endereço de expedição"}
        subtitle="Os dados completos do remetente serão usados automaticamente nos pedidos."
        icon="mapPin"
        width={860}
        footer={editingAddress && (
          <>
            {settings.shippingAddresses.length > 1 && (
              <Button variant="ghost" icon="trash" onClick={() => {
                removeAddress(editingAddress.id);
                setEditingAddressId(null);
              }}>
                Remover
              </Button>
            )}
            <div className="spacer" />
            <Button variant="outline" onClick={() => setEditingAddressId(null)}>Fechar</Button>
            <Button variant="default" icon="check" onClick={() => {
              setSetting("defaultShippingAddressId", editingAddress.id);
              setEditingAddressId(null);
            }}>
              Usar como padrão
            </Button>
          </>
        )}
      >
        {editingAddress && (
          <div className="shipping-address-form">
            <div className="ff-grid">
              <Field label="CEP" required>
                <div className="row" style={{ gap: 8 }}>
                  <Input value={maskCep(editingAddress.postalCode)} onChange={(event) => setAddress(editingAddress.id, { postalCode: onlyDigits(event.target.value, 8) })} placeholder="00000-000" />
                  <Button variant="outline" size="sm" icon="search" onClick={() => lookupAddressCep(editingAddress.id)}>Buscar</Button>
                </div>
              </Field>
              <Field label="Nome do card" required>
                <Input value={editingAddress.label} onChange={(event) => setAddress(editingAddress.id, { label: event.target.value })} placeholder="Loja, estoque, fabrica..." />
              </Field>
            </div>
            <div className="ff-grid">
              <Field label="Endereço" required>
                <Input value={editingAddress.address} onChange={(event) => setAddress(editingAddress.id, { address: event.target.value })} />
              </Field>
              <Field label="Número" required>
                <Input value={editingAddress.number} onChange={(event) => setAddress(editingAddress.id, { number: event.target.value })} />
              </Field>
            </div>
            <div className="ff-grid-3">
              <Field label="Bairro" required>
                <Input value={editingAddress.district} onChange={(event) => setAddress(editingAddress.id, { district: event.target.value })} />
              </Field>
              <Field label="Cidade" required>
                <Input value={editingAddress.city} onChange={(event) => setAddress(editingAddress.id, { city: event.target.value })} />
              </Field>
              <Field label="UF" required>
                <Input value={editingAddress.stateAbbr} maxLength={2} onChange={(event) => setAddress(editingAddress.id, { stateAbbr: event.target.value.toUpperCase() })} />
              </Field>
            </div>
            <Field label="Complemento">
              <Input value={editingAddress.complement} onChange={(event) => setAddress(editingAddress.id, { complement: event.target.value })} />
            </Field>
            <div className="ff-grid">
              <Field label="Remetente" required>
                <Input value={editingAddress.name} onChange={(event) => setAddress(editingAddress.id, { name: event.target.value })} />
              </Field>
              <Field label="CPF/CNPJ do remetente" required>
                <div className="row" style={{ gap: 8 }}>
                  <Select
                    value={editingAddress.documentType}
                    onChange={(value) => setAddress(editingAddress.id, {
                      documentType: value as "cpf" | "cnpj",
                      document: "",
                      companyDocument: "",
                    })}
                    options={[
                      { value: "cpf", label: "CPF" },
                      { value: "cnpj", label: "CNPJ" },
                    ]}
                    style={{ width: 92 }}
                  />
                  <Input
                    value={maskDocument(shippingAddressDocument(editingAddress), editingAddress.documentType)}
                    onChange={(event) => {
                      const digits = onlyDigits(event.target.value, editingAddress.documentType === "cnpj" ? 14 : 11);
                      setAddress(editingAddress.id, editingAddress.documentType === "cnpj" ? { companyDocument: digits } : { document: digits });
                    }}
                    placeholder={editingAddress.documentType === "cnpj" ? "00.000.000/0000-00" : "000.000.000-00"}
                  />
                </div>
              </Field>
            </div>
            <div className="ff-grid-3">
              <Field label="Telefone" required>
                <Input value={maskPhone(editingAddress.phone)} onChange={(event) => setAddress(editingAddress.id, { phone: onlyDigits(event.target.value, 11) })} placeholder="(00) 00000-0000" />
              </Field>
              <Field label="E-mail" required>
                <Input value={editingAddress.email} onChange={(event) => setAddress(editingAddress.id, { email: event.target.value })} />
              </Field>
              <Field label="Inscrição estadual">
                <Input value={editingAddress.stateRegister} onChange={(event) => setAddress(editingAddress.id, { stateRegister: event.target.value })} />
              </Field>
            </div>
          </div>
        )}
      </Modal>
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
          {tab === "labels" && <LabelsTab go={go} />}
          {tab === "shipping" && <ShippingTab />}
          {tab === "catalog" && <CatalogTab />}
          {tab === "export" && <ExportPanel />}
        </div>
      </div>
    </div>
  );
}
