"use client";

import * as React from "react";
import { Button, Card, Icon } from "@/components/ui";

const REPORTS = [
  { id: "stock-ledger", title: "Livro de estoque", sub: "Movimentos, origem e quantidade", icon: "estoque" },
  { id: "orders", title: "Pedidos", sub: "Cabecalho, status, pagamento e total", icon: "pedidos" },
  { id: "order-lines", title: "Itens de pedido", sub: "Linhas vendidas por SKU", icon: "itens" },
  { id: "purchases", title: "Compras", sub: "Recebimentos e fornecedores", icon: "inbox" },
  { id: "finance", title: "Financeiro", sub: "Entradas, saidas e pendencias", icon: "banknote" },
  { id: "audit", title: "Auditoria", sub: "Acoes criticas exportadas", icon: "fileText" },
  { id: "sales-summary", title: "Resumo de vendas", sub: "Tendencia diaria de pedidos e total", icon: "trendUp" },
  { id: "production-summary", title: "Resumo de producao", sub: "OPs, lotes em cura e liberados", icon: "producao" },
  { id: "purchase-summary", title: "Resumo de compras", sub: "Tendencia diaria de compras", icon: "inbox" },
];

type ReportPreset = { id: string; name: string; from: string; to: string };

export function ReportsScreen() {
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [presets, setPresets] = React.useState<ReportPreset[]>([]);
  const query = [from ? `from=${from}` : "", to ? `to=${to}` : ""].filter(Boolean).join("&");
  const reportHref = (id: string) => `/api/app/reports/${id}${query ? `?${query}` : ""}`;

  React.useEffect(() => {
    try {
      setPresets(JSON.parse(localStorage.getItem("atelie-report-presets") || "[]") as ReportPreset[]);
    } catch {
      setPresets([]);
    }
  }, []);

  const persistPresets = (next: ReportPreset[]) => {
    setPresets(next);
    localStorage.setItem("atelie-report-presets", JSON.stringify(next));
  };

  const savePreset = () => {
    if (!from && !to) return;
    const label = `${from || "inicio"} ate ${to || "hoje"}`;
    const next = [{ id: `${Date.now()}`, name: label, from, to }, ...presets].slice(0, 6);
    persistPresets(next);
  };

  return (
    <div className="page page--wide fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-h1">Relatorios</h1>
          <p className="page-lede">Exports CSV para conferencia e reconciliacao</p>
        </div>
      </div>

      <Card style={{ marginBottom: 14 }}>
        <div className="om-card-body">
          <div className="row between" style={{ gap: 12, flexWrap: "wrap" }}>
            <div>
              <div className="block-label">Periodo</div>
              <div className="section-hint">Filtros salvos ficam neste navegador para repetir relatorios frequentes.</div>
            </div>
            <div className="row-wrap" style={{ gap: 8 }}>
              <label className="field" style={{ margin: 0 }}><span className="field-k">De</span><input className="om-input" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
              <label className="field" style={{ margin: 0 }}><span className="field-k">Ate</span><input className="om-input" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
              <Button variant="outline" icon="check" onClick={savePreset} disabled={!from && !to}>Salvar preset</Button>
              <Button variant="ghost" icon="x" onClick={() => { setFrom(""); setTo(""); }}>Limpar</Button>
            </div>
          </div>
          {presets.length > 0 && (
            <div className="row-wrap" style={{ gap: 8, marginTop: 12 }}>
              {presets.map((preset) => (
                <button key={preset.id} type="button" className="code-pill" onClick={() => { setFrom(preset.from); setTo(preset.to); }}>
                  {preset.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      <div className="grid cols-3" style={{ gap: 14 }}>
        {REPORTS.map((report) => (
          <Card key={report.id}>
            <div className="om-card-body">
              <div className="row" style={{ gap: 10, marginBottom: 12 }}>
                <div className="chip chip--brand"><Icon name={report.icon} size={17} /></div>
                <div>
                  <div style={{ fontWeight: 700 }}>{report.title}</div>
                  <div className="muted" style={{ fontSize: 12.5 }}>{report.sub}</div>
                </div>
              </div>
              <Button icon="arrowDown" variant="outline" onClick={() => { window.location.href = reportHref(report.id); }}>
                Baixar CSV
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
