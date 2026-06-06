"use client";

import * as React from "react";
import { Badge, Button, Card, Empty, Icon, Input, toast } from "@/components/ui";
import {
  applyStockCount,
  cancelStockCount,
  createStockCount,
  loadStockCount,
  loadStockCounts,
  saveStockCount,
  type StockCountDetail,
  type StockCountListItem,
} from "@/lib/stock-count-client";
import type { Route } from "@/lib/types";

const STATUS_TONE: Record<string, "ok" | "warn" | "neutral" | "bad"> = {
  aberta: "warn",
  ajustada: "ok",
  cancelada: "neutral",
};

const STATUS_LABEL: Record<string, string> = {
  aberta: "Em contagem",
  ajustada: "Ajustada",
  cancelada: "Cancelada",
};

function parseQty(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function CountDetailView({ countId, onClose }: { countId: string; onClose: () => void }) {
  const [detail, setDetail] = React.useState<StockCountDetail | null>(null);
  const [counted, setCounted] = React.useState<Record<string, string>>({});
  const [query, setQuery] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const hydrate = React.useCallback((next: StockCountDetail) => {
    setDetail(next);
    setCounted(Object.fromEntries(next.items.map((item) => [item.itemId, item.counted == null ? "" : String(item.counted).replace(".", ",")])));
  }, []);

  React.useEffect(() => {
    let alive = true;
    loadStockCount(countId).then((next) => { if (alive) hydrate(next); }).catch(() => null);
    return () => { alive = false; };
  }, [countId, hydrate]);

  if (!detail) return <div className="page page--wide fade-in"><Empty icon="estoque" title="Carregando contagem..." /></div>;

  const open = detail.status === "aberta";
  const itemsPayload = detail.items.map((item) => ({ itemId: item.itemId, countedQty: parseQty(counted[item.itemId] ?? "") }));
  const countedNow = itemsPayload.filter((item) => item.countedQty != null).length;

  const run = async (fn: () => Promise<StockCountDetail>, ok: string) => {
    setBusy(true);
    try { hydrate(await fn()); toast(ok, "ok"); } catch { toast("Nao foi possivel concluir a acao.", "bad"); } finally { setBusy(false); }
  };

  const rows = detail.items.filter((item) => !query.trim() || `${item.name} ${item.sku}`.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="page page--wide fade-in">
      <div className="page-head">
        <div>
          <div className="row" style={{ gap: 8, marginBottom: 8 }}>
            <Button variant="ghost" size="sm" icon="arrowLeft" onClick={onClose}>Contagens</Button>
            <Badge tone={STATUS_TONE[detail.status] ?? "neutral"} dot>{STATUS_LABEL[detail.status] ?? detail.status}</Badge>
          </div>
          <h1 className="page-h1">{detail.code}</h1>
          <p className="page-lede">{detail.summary.counted}/{detail.summary.total} contados · {detail.summary.divergent} divergência(s)</p>
        </div>
        {open && (
          <div className="row-wrap">
            <Button variant="outline" icon="x" disabled={busy} onClick={() => run(() => cancelStockCount(detail.id), "Contagem cancelada.")}>Cancelar</Button>
            <Button variant="outline" icon="check" disabled={busy} onClick={() => run(() => saveStockCount(detail.id, itemsPayload), "Contagem salva.")}>Salvar</Button>
            <Button variant="default" icon="check" disabled={busy || countedNow === 0} onClick={() => run(() => applyStockCount(detail.id), "Ajustes aplicados ao estoque.")}>Aplicar ajustes</Button>
          </div>
        )}
      </div>

      <div className="toolbar">
        <div style={{ width: 280 }}><Input icon="search" placeholder="Buscar item..." value={query} onChange={(e) => setQuery(e.target.value)} /></div>
      </div>

      <Card style={{ overflow: "hidden" }}>
        <table className="om-table">
          <thead>
            <tr><th>Item</th><th className="om-td-right">Esperado</th><th className="om-td-right" style={{ width: 140 }}>Contado</th><th className="om-td-right">Divergência</th></tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const value = counted[item.itemId] ?? "";
              const parsed = parseQty(value);
              const divergence = parsed == null ? null : Math.round((parsed - item.expected) * 1000) / 1000;
              return (
                <tr key={item.itemId}>
                  <td><div className="cell-title">{item.name}</div><div className="cell-sub sku">{item.sku}</div></td>
                  <td className="om-td-right">{item.expected}</td>
                  <td className="om-td-right">
                    {open ? (
                      <Input inputMode="decimal" value={value} onChange={(e) => setCounted((c) => ({ ...c, [item.itemId]: e.target.value }))} style={{ width: 120, textAlign: "right" }} placeholder="-" />
                    ) : (item.counted ?? "-")}
                  </td>
                  <td className="om-td-right">
                    {divergence == null ? <span className="muted">-</span> : divergence === 0 ? <Badge tone="ok">0</Badge> : <Badge tone="bad">{divergence > 0 ? `+${divergence}` : divergence}</Badge>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function StockCountScreen(_props: { route: Route }) {
  const [counts, setCounts] = React.useState<StockCountListItem[]>([]);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);

  const refresh = React.useCallback(() => {
    loadStockCounts().then(setCounts).catch(() => null);
  }, []);

  React.useEffect(() => { refresh(); }, [refresh]);

  if (openId) {
    return <CountDetailView countId={openId} onClose={() => { setOpenId(null); refresh(); }} />;
  }

  const startCount = async () => {
    setCreating(true);
    try {
      const detail = await createStockCount();
      setOpenId(detail.id);
    } catch {
      toast("Nao foi possivel iniciar a contagem.", "bad");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page page--wide fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-h1">Contagem de estoque</h1>
          <p className="page-lede">Conte o físico, revise as divergências e ajuste com confirmação.</p>
        </div>
        <Button variant="default" icon="plus" disabled={creating} onClick={startCount}>Nova contagem</Button>
      </div>

      <Card style={{ overflow: "hidden" }}>
        <table className="om-table">
          <thead>
            <tr><th>Contagem</th><th>Status</th><th className="om-td-right">Contados</th><th className="om-td-right">Divergências</th><th>Aplicada</th><th /></tr>
          </thead>
          <tbody>
            {counts.map((count) => (
              <tr key={count.id} className="om-row-click" onClick={() => setOpenId(count.id)}>
                <td><div className="cell-title">{count.code}</div><div className="cell-sub">{count.createdAt ? new Date(count.createdAt).toLocaleDateString("pt-BR") : "-"}</div></td>
                <td><Badge tone={STATUS_TONE[count.status] ?? "neutral"} dot>{STATUS_LABEL[count.status] ?? count.status}</Badge></td>
                <td className="om-td-right">{count.summary.counted}/{count.summary.total}</td>
                <td className="om-td-right">{count.summary.divergent ? <Badge tone="bad">{count.summary.divergent}</Badge> : <span className="muted">0</span>}</td>
                <td className="muted">{count.appliedAt ? new Date(count.appliedAt).toLocaleDateString("pt-BR") : "-"}</td>
                <td className="om-td-right"><Icon name="chevronRight" size={16} className="muted" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {counts.length === 0 && <Empty icon="estoque" title="Nenhuma contagem" hint="Inicie uma contagem para conferir o estoque físico." />}
      </Card>
    </div>
  );
}
