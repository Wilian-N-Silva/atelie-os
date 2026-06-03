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
  Select,
  cn,
  toast,
} from "@/components/ui";
import { BRAND_PRESETS, LABEL_SHEETS, PRODUCTION_WORKFLOW } from "@/lib/screen-fixtures";
import { Theme } from "@/lib/theme";
import type { Go, Route, Session } from "@/lib/types";

type SettingsTab = "branding" | "users" | "workflows" | "labels";
type WorkflowStep = { key: string; label: string; color: string };

const NAV: { id: SettingsTab; label: string; sub: string; icon: string }[] = [
  { id: "branding", label: "Aparencia da marca", sub: "Cores, tema, logo", icon: "palette" },
  { id: "users", label: "Usuarios e acessos", sub: "Equipe, papeis, convites", icon: "user" },
  { id: "workflows", label: "Fluxos e Kanban", sub: "Etapas configuraveis", icon: "workflow" },
  { id: "labels", label: "Modelos de etiqueta", sub: "Folhas e tamanhos", icon: "tag" },
];

function BrandingTab() {
  const [activePreset, setActivePreset] = React.useState<string>(() => BRAND_PRESETS[0].id ?? "neutro");
  const [companyName, setCompanyName] = React.useState("Instante Ambar");

  const applyPreset = (id: string) => {
    const preset = BRAND_PRESETS.find((item) => item.id === id);
    if (!preset) return;
    setActivePreset(id);
    Theme.apply(preset);
    toast(`Tema "${preset.name}" aplicado.`, "info");
  };

  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr", gap: "var(--gap)" }}>
      <Card>
        <CardHeader><CardTitle>Identidade</CardTitle></CardHeader>
        <CardContent>
          <div className="ff-grid">
            <Field label="Nome exibido no shell"><Input value={companyName} onChange={(event) => setCompanyName(event.target.value)} /></Field>
            <Field label="Logo"><Button variant="outline" icon="upload" onClick={() => toast("Upload de logo ficara conectado ao backend depois.", "info")}>Escolher arquivo</Button></Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Presets de tema</CardTitle><Button variant="ghost" size="sm" onClick={() => { Theme.restore(); toast("Tema restaurado.", "info"); }}>Restaurar</Button></CardHeader>
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

function WorkflowsTab() {
  const [steps, setSteps] = React.useState<WorkflowStep[]>(() => PRODUCTION_WORKFLOW.map((step) => ({ ...step })));

  return (
    <Card>
      <CardHeader><CardTitle>Fluxo de producao</CardTitle><Button variant="outline" size="sm" icon="plus" onClick={() => setSteps((current) => [...current, { key: `etapa_${current.length + 1}`, label: "Nova etapa", color: "neutral" }])}>Adicionar etapa</Button></CardHeader>
      <CardContent style={{ paddingTop: 8 }}>
        {steps.map((step, index) => (
          <div className="wf-step" key={step.key}>
            <div className="wf-step-handle"><Icon name="gripVertical" size={16} /></div>
            <div className={`wf-color chip--${step.color}`} />
            <div className="wf-step-main">
              <Input className="wf-label-input" value={step.label} onChange={(event) => setSteps((current) => current.map((item) => item.key === step.key ? { ...item, label: event.target.value } : item))} />
              <div className="wf-flags">
                <span className="wf-key">{step.key}</span>
                {index === 0 && <span className="wf-flag wf-flag--on"><span className="wf-flag-dot" />Inicial</span>}
                {index === steps.length - 1 && <span className="wf-flag wf-flag--on"><span className="wf-flag-dot" />Final</span>}
              </div>
            </div>
            <Select value={step.color} onChange={(value) => setSteps((current) => current.map((item) => item.key === step.key ? { ...item, color: value } : item))} options={["neutral", "info", "cure", "warn", "ok", "bad"].map((value) => ({ value, label: value }))} style={{ width: 128 }} />
            <button className="wf-handle-btn" onClick={() => setSteps((current) => current.filter((item) => item.key !== step.key))}><Icon name="trash" size={15} /></button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function LabelsTab() {
  const [selected, setSelected] = React.useState(LABEL_SHEETS[0].id);

  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr", gap: "var(--gap)" }}>
      <Card>
        <CardHeader><CardTitle>Folhas cadastradas</CardTitle><Button variant="outline" size="sm" icon="plus" onClick={() => toast("Modelo de folha salvo nesta sessao.", "info")}>Novo modelo</Button></CardHeader>
        <CardContent>
          <div className="sheet-grid-cards">
            {LABEL_SHEETS.map((sheet) => (
              <button key={sheet.id} className={cn("sheet-card", selected === sheet.id && "sheet-card--on")} onClick={() => setSelected(sheet.id)}>
                <div className="sheet-mini" style={{ gridTemplateColumns: `repeat(${Math.min(sheet.cols, 4)}, 1fr)`, width: 84, height: 110 }}>
                  {Array.from({ length: Math.min(sheet.cols * sheet.rows, 24) }).map((_, index) => <span key={index} className="sheet-mini-cell" />)}
                </div>
                <div className="row between"><strong style={{ fontSize: 13 }}>{sheet.name}</strong><Badge tone="outline">{sheet.code}</Badge></div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{sheet.roll ? "rolo" : `${sheet.cols}x${sheet.rows}`} - {sheet.labelW}x{sheet.labelH}mm</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function SettingsScreen({ go, route, session }: { go: Go; route: Route; session: Session }) {
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
          {tab === "branding" && <BrandingTab />}
          {tab === "users" && <UsersTab session={session} />}
          {tab === "workflows" && <WorkflowsTab />}
          {tab === "labels" && <LabelsTab />}
        </div>
      </div>
    </div>
  );
}
