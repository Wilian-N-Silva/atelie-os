"use client";

import * as React from "react";
import { Badge, Button, Card, Empty, Icon, Input, Select, toast } from "@/components/ui";
import { loadAuditLogs, type AuditLogEntry } from "@/lib/audit-logs-client";

const ACTION_LABELS: Record<string, string> = {
  "auth.sign_up": "Cadastro",
  "company.create": "Empresa criada",
  "member.invite": "Convite",
  "branding.update": "Marca",
  "workflow.update": "Fluxo",
  "item.create": "Item criado",
  "item.update": "Item atualizado",
  "order.create": "Pedido criado",
  "order.update": "Pedido atualizado",
  "recipe.create": "Receita criada",
  "recipe.update": "Receita atualizada",
  "production.create": "OP criada",
  "production.update": "OP atualizada",
  "supplier.create": "Fornecedor criado",
  "supplier.update": "Fornecedor atualizado",
  "purchase.create": "Compra criada",
  "finance.create": "Financeiro",
  "incident.create": "Incidente",
  "report.export": "Relatorio",
  "shipping.update": "Envio",
  "shipping.connect": "Envio conectado",
  "shipping.disconnect": "Envio desconectado",
  "shipping.quote": "Cotacao de envio",
  "ai.generate": "IA gerada",
  "ai.approve": "IA aprovada",
  "stock.adjust": "Estoque",
  "seed.run": "Seed",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function metadataSummary(metadata: Record<string, unknown>) {
  const text = JSON.stringify(metadata);
  if (text === "{}") return "-";
  return text.length > 140 ? `${text.slice(0, 137)}...` : text;
}

function actorLabel(log: AuditLogEntry) {
  return log.actorName || log.actorEmail || log.actorUserId || "Sistema";
}

export function AuditLogsScreen() {
  const [logs, setLogs] = React.useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [action, setAction] = React.useState("");
  const [entityType, setEntityType] = React.useState("");
  const [query, setQuery] = React.useState("");

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      setLogs(await loadAuditLogs({ action, entityType }));
    } catch {
      toast("Não foi possível carregar a auditoria.", "bad");
    } finally {
      setLoading(false);
    }
  }, [action, entityType]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const actions = React.useMemo(() => {
    const values = Array.from(new Set(logs.map((log) => log.action))).sort();
    return [{ value: "", label: "Todas as acoes" }, ...values.map((value) => ({ value, label: ACTION_LABELS[value] ?? value }))];
  }, [logs]);
  const entities = React.useMemo(() => {
    const values = Array.from(new Set(logs.map((log) => log.entityType).filter((value): value is string => !!value))).sort();
    return [{ value: "", label: "Todas as entidades" }, ...values.map((value) => ({ value, label: value }))];
  }, [logs]);
  const normalizedQuery = query.trim().toLowerCase();
  const rows = logs.filter((log) => {
    if (!normalizedQuery) return true;
    return `${log.action} ${log.entityType ?? ""} ${log.entityId ?? ""} ${actorLabel(log)} ${metadataSummary(log.metadata)}`
      .toLowerCase()
      .includes(normalizedQuery);
  });

  return (
    <div className="page page--wide fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-h1">Auditoria</h1>
          <p className="page-lede">{rows.length} registros recentes de ações críticas</p>
        </div>
        <Button variant="outline" icon="refresh" onClick={() => void refresh()} disabled={loading}>Atualizar</Button>
      </div>

      <div className="toolbar">
        <div style={{ width: 240 }}>
          <Select value={action} onChange={setAction} options={actions} />
        </div>
        <div style={{ width: 220 }}>
          <Select value={entityType} onChange={setEntityType} options={entities} />
        </div>
        <div className="spacer" />
        <div style={{ width: 320 }}>
          <Input icon="search" placeholder="Buscar ator, entidade, metadados..." value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
      </div>

      <Card style={{ overflow: "hidden" }}>
        <table className="om-table">
          <thead>
            <tr>
              <th>Quando</th>
              <th>Acao</th>
              <th>Ator</th>
              <th>Entidade</th>
              <th>Metadados</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((log) => (
              <tr key={log.id}>
                <td className="muted" style={{ whiteSpace: "nowrap" }}>{formatDate(log.createdAt)}</td>
                <td><Badge tone={log.action.startsWith("stock.") ? "warn" : "neutral"}>{ACTION_LABELS[log.action] ?? log.action}</Badge></td>
                <td>
                  <div style={{ fontWeight: 550 }}>{actorLabel(log)}</div>
                  {log.actorEmail && <div className="cell-sub">{log.actorEmail}</div>}
                </td>
                <td>
                  <div style={{ fontWeight: 550 }}>{log.entityType ?? "-"}</div>
                  {log.entityId && <div className="cell-sub sku">{log.entityId}</div>}
                </td>
                <td style={{ maxWidth: 460 }}>
                  <span className="cell-sub sku" title={JSON.stringify(log.metadata)}>{metadataSummary(log.metadata)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && <Empty icon="fileText" title="Nenhum registro encontrado" hint="Ajuste os filtros ou tente novamente." />}
        {loading && <Empty icon="refresh" title="Carregando auditoria" />}
      </Card>

      <div className="muted" style={{ marginTop: 12, fontSize: 12.5 }}>
        A lista mostra os 100 registros mais recentes da empresa ativa.
      </div>
    </div>
  );
}
