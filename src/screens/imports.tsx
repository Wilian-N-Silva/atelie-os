"use client";

import * as React from "react";
import { Badge, Button, Card, Empty, Field, Icon, Select, Textarea, toast } from "@/components/ui";
import { useItemDirectory } from "@/lib/item-directory";
import {
  discardImport,
  importAllReady,
  importOrder,
  loadImports,
  mapImportSku,
  uploadImportCsv,
  type ImportsData,
} from "@/lib/imports-client";
import type { Go, Route } from "@/lib/types";

const CHANNELS = [
  { value: "mercado_livre", label: "Mercado Livre" },
  { value: "nuvemshop", label: "Nuvemshop" },
  { value: "shopee", label: "Shopee" },
  { value: "outro", label: "Outro" },
];

const STATUS_TONE: Record<string, "ok" | "warn" | "neutral" | "bad" | "info"> = {
  pending: "warn",
  ready: "info",
  imported: "ok",
  discarded: "neutral",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente (mapear SKU)",
  ready: "Pronto p/ importar",
  imported: "Importado",
  discarded: "Descartado",
};

export function ImportsScreen({ go }: { go: Go; route: Route }) {
  const dir = useItemDirectory();
  const [data, setData] = React.useState<ImportsData>({ imports: [], mappings: [], summary: { pending: 0, ready: 0, imported: 0 } });
  const [channel, setChannel] = React.useState("mercado_livre");
  const [csv, setCsv] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    loadImports().then((next) => { if (alive) setData(next); }).catch(() => null);
    return () => { alive = false; };
  }, []);

  const run = async (fn: () => Promise<ImportsData>, ok: string) => {
    setBusy(true);
    try { setData(await fn()); toast(ok, "ok"); } catch { toast("Não foi possível concluir a ação.", "bad"); } finally { setBusy(false); }
  };

  const upload = async () => {
    if (!csv.trim()) { toast("Cole o CSV de pedidos.", "bad"); return; }
    await run(async () => { const d = await uploadImportCsv(channel, csv); setCsv(""); return d; }, "CSV importado para a fila.");
  };

  const itemOptions = dir.items.map((i) => ({ value: i.id, label: `${i.sku} - ${i.name}` }));
  const mappedSkus = new Set(data.mappings.filter((m) => m.itemId).map((m) => `${m.channelKey}:${m.externalSku}`));
  const visible = data.imports.filter((i) => i.status !== "discarded");

  return (
    <div className="page page--wide fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-h1">Importar de marketplace</h1>
          <p className="page-lede">Importe pedidos por CSV, mapeie SKUs externos e gere pedidos internos.</p>
        </div>
        <Button variant="default" icon="check" disabled={busy || data.summary.ready === 0} onClick={() => run(importAllReady, "Pedidos prontos importados.")}>
          Importar prontos{data.summary.ready ? ` (${data.summary.ready})` : ""}
        </Button>
      </div>

      <Card style={{ marginBottom: 14 }}>
        <div style={{ padding: 16 }}>
          <div className="row" style={{ gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 10 }}>
            <Field label="Canal" style={{ width: 200 }}><Select value={channel} onChange={setChannel} options={CHANNELS} /></Field>
            <input type="file" accept=".csv,text/csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) f.text().then(setCsv); }} />
          </div>
          <Field label="CSV (cole aqui) — colunas: pedido; cliente; email; sku; quantidade; preco">
            <Textarea value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={"pedido;cliente;email;sku;quantidade;preco\nML-1;Ana;ana@x.com;SKU-EXT-1;2;75,00"} style={{ minHeight: 110, fontFamily: "ui-monospace, monospace" }} />
          </Field>
          <Button icon="plus" disabled={busy} onClick={upload}>Importar CSV</Button>
        </div>
      </Card>

      <div className="row" style={{ gap: 8, marginBottom: 10 }}>
        <Badge tone="warn">{data.summary.pending} pendentes</Badge>
        <Badge tone="info">{data.summary.ready} prontos</Badge>
        <Badge tone="ok">{data.summary.imported} importados</Badge>
      </div>

      {visible.length === 0 && <Empty icon="inbox" title="Nenhum pedido na fila" hint="Importe um CSV para começar." />}

      {visible.map((imp) => (
        <Card key={imp.id} style={{ marginBottom: 10 }}>
          <div style={{ padding: 14 }}>
            <div className="row between" style={{ marginBottom: 8 }}>
              <div>
                <div className="cell-title">{imp.externalOrderId} · {imp.buyerName || "sem nome"}</div>
                <div className="cell-sub">{CHANNELS.find((c) => c.value === imp.channelKey)?.label ?? imp.channelKey} · {imp.lines.reduce((s, l) => s + l.qty, 0)} un · R$ {imp.total.toFixed(2)}</div>
              </div>
              <Badge tone={STATUS_TONE[imp.status] ?? "neutral"} dot>{STATUS_LABEL[imp.status] ?? imp.status}</Badge>
            </div>

            <table className="om-table" style={{ marginBottom: imp.status === "pending" || imp.status === "ready" ? 10 : 0 }}>
              <tbody>
                {imp.lines.map((line, idx) => {
                  const isMapped = mappedSkus.has(`${imp.channelKey}:${line.sku}`);
                  return (
                    <tr key={idx}>
                      <td><span className="sku">{line.sku}</span> {isMapped ? <Badge tone="ok">mapeado</Badge> : <Badge tone="warn">sem mapa</Badge>}</td>
                      <td className="om-td-right">{line.qty}x</td>
                      {imp.status === "pending" && !isMapped && (
                        <td style={{ width: 320 }}>
                          <MapControl
                            options={itemOptions}
                            disabled={busy}
                            onMap={(itemId) => run(() => mapImportSku(imp.channelKey, line.sku, itemId), "SKU mapeado.")}
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {(imp.status === "pending" || imp.status === "ready") && (
              <div className="row" style={{ gap: 8 }}>
                <Button variant="default" size="sm" icon="check" disabled={busy || imp.status !== "ready"} onClick={() => run(() => importOrder(imp.id), "Pedido importado.")}>Importar pedido</Button>
                <Button variant="ghost" size="sm" icon="x" disabled={busy} onClick={() => run(() => discardImport(imp.id), "Descartado.")}>Descartar</Button>
                {imp.errorReason && <span className="muted" style={{ fontSize: 12.5, alignSelf: "center" }}>{imp.errorReason}</span>}
              </div>
            )}
            {imp.status === "imported" && imp.createdOrderId && (
              <Button variant="outline" size="sm" icon="pedidos" onClick={() => go("pedidos", { open: imp.createdOrderId! })}>Ver pedido</Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function MapControl({ options, disabled, onMap }: { options: { value: string; label: string }[]; disabled: boolean; onMap: (itemId: string) => void }) {
  const [itemId, setItemId] = React.useState("");
  return (
    <div className="row" style={{ gap: 6 }}>
      <Select value={itemId} onChange={setItemId} options={[{ value: "", label: "Mapear para item..." }, ...options]} />
      <Button variant="outline" size="sm" icon="check" disabled={disabled || !itemId} onClick={() => onMap(itemId)}>Mapear</Button>
    </div>
  );
}
