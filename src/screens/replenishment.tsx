"use client";

import * as React from "react";
import { Badge, Button, Card, Empty, Icon, Input, SortTh, Stat, Tabs, toast, useSort } from "@/components/ui";
import { num } from "@/lib/domain";
import { loadReplenishment, type ReplenishmentResponse } from "@/lib/replenishment-client";
import type { ReplenishmentSuggestion } from "@/lib/replenishment";
import type { Go } from "@/lib/types";

type ReplenishmentFilter = "todos" | "criticos" | "comprar" | "pedidos" | "producao";

const EMPTY_RESPONSE: ReplenishmentResponse = {
  suggestions: [],
  totals: {
    critical: 0,
    warning: 0,
    suggestedQty: 0,
    orderDemand: 0,
    productionDemand: 0,
  },
};

const TYPE_LABELS: Record<string, string> = {
  raw_material: "Materia-prima",
  packaging: "Embalagem",
  finished_good: "Produto acabado",
  kit: "Kit",
  auxiliary: "Auxiliar",
};

function priorityTone(priority: ReplenishmentSuggestion["priority"]) {
  if (priority === "critical") return "bad";
  if (priority === "warning") return "warn";
  return "neutral";
}

function priorityLabel(priority: ReplenishmentSuggestion["priority"]) {
  if (priority === "critical") return "critico";
  if (priority === "warning") return "comprar";
  return "monitorar";
}

function qty(value: number, unit: string) {
  return `${num(value, value % 1 === 0 ? 0 : 3)} ${unit}`;
}

export function ReplenishmentScreen({ go }: { go: Go }) {
  const [data, setData] = React.useState<ReplenishmentResponse>(EMPTY_RESPONSE);
  const [filter, setFilter] = React.useState<ReplenishmentFilter>("todos");
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(() => {
    setLoading(true);
    loadReplenishment()
      .then(setData)
      .catch(() => toast("Nao foi possivel carregar sugestoes de reposicao.", "bad"))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const groups: Record<ReplenishmentFilter, (item: ReplenishmentSuggestion) => boolean> = {
    todos: () => true,
    criticos: (item) => item.priority === "critical",
    comprar: (item) => item.suggestedQty > 0,
    pedidos: (item) => item.orderDemand > 0,
    producao: (item) => item.productionDemand > 0,
  };

  const normalizedQuery = query.trim().toLowerCase();
  const rows = data.suggestions
    .filter(groups[filter])
    .filter((item) => !normalizedQuery || `${item.sku} ${item.code} ${item.name} ${item.variant ?? ""}`.toLowerCase().includes(normalizedQuery));

  const sort = useSort(rows, {
    priority: (item) => ({ critical: 3, warning: 2, watch: 1 }[item.priority]),
    sku: (item) => item.sku,
    available: (item) => item.available,
    minStock: (item) => item.minStock,
    demand: (item) => item.demand,
    suggestedQty: (item) => item.suggestedQty,
  }, "priority", "desc");

  const tabs = [
    { value: "todos", label: "Todos", count: data.suggestions.length },
    { value: "criticos", label: "Criticos", count: data.suggestions.filter(groups.criticos).length },
    { value: "comprar", label: "Comprar", count: data.suggestions.filter(groups.comprar).length },
    { value: "pedidos", label: "Pedidos", count: data.suggestions.filter(groups.pedidos).length },
    { value: "producao", label: "Producao", count: data.suggestions.filter(groups.producao).length },
  ];

  return (
    <div className="page page--wide fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-h1">Reposicao sugerida</h1>
          <p className="page-lede">Priorize compras e producao a partir de minimo, saldo disponivel e demanda aberta.</p>
        </div>
        <Button variant="outline" icon="refresh" disabled={loading} onClick={refresh}>{loading ? "Atualizando..." : "Atualizar"}</Button>
      </div>

      <div className="grid cols-4" style={{ gap: 12, marginBottom: 14 }}>
        <Stat label="Criticos" value={data.totals.critical} tone={data.totals.critical ? "bad" : undefined} sub="sem cobertura suficiente" />
        <Stat label="Comprar" value={data.totals.warning} tone={data.totals.warning ? "warn" : undefined} sub="abaixo do alvo" />
        <Stat label="Qtd sugerida" value={num(data.totals.suggestedQty, data.totals.suggestedQty % 1 === 0 ? 0 : 3)} sub="unidades agregadas" />
        <Stat label="Demanda aberta" value={num(data.totals.orderDemand + data.totals.productionDemand, 0)} sub="pedidos + producao" />
      </div>

      <div className="toolbar">
        <Tabs tabs={tabs} value={filter} onChange={(value) => setFilter(value as ReplenishmentFilter)} />
        <div className="spacer" />
        <div style={{ width: 280 }}>
          <Input icon="search" placeholder="SKU, codigo ou item..." value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
      </div>

      <Card style={{ overflow: "hidden" }}>
        <table className="om-table">
          <thead>
            <tr>
              <SortTh label="Prioridade" k="priority" sort={sort} />
              <SortTh label="Item" k="sku" sort={sort} />
              <SortTh label="Disponivel" k="available" sort={sort} align="right" />
              <SortTh label="Minimo" k="minStock" sort={sort} align="right" />
              <SortTh label="Demanda" k="demand" sort={sort} align="right" />
              <SortTh label="Sugerido" k="suggestedQty" sort={sort} align="right" />
              <th />
            </tr>
          </thead>
          <tbody>
            {sort.sorted.map((item) => (
              <tr key={item.itemId}>
                <td><Badge tone={priorityTone(item.priority)} dot>{priorityLabel(item.priority)}</Badge></td>
                <td>
                  <div className="item-cell">
                    <div className="swatch"><Icon name={item.type === "finished_good" ? "flame" : "box"} size={15} /></div>
                    <div>
                      <div className="cell-title">{item.name}{item.variant ? ` ${item.variant}` : ""}</div>
                      <div className="cell-sub sku">{item.sku} - {TYPE_LABELS[item.type] ?? item.type}</div>
                    </div>
                  </div>
                </td>
                <td className="om-td-right">{qty(item.available, item.unit)}</td>
                <td className="om-td-right muted">{qty(item.minStock, item.unit)}</td>
                <td className="om-td-right">
                  <div style={{ fontWeight: 600 }}>{qty(item.demand, item.unit)}</div>
                  <div className="cell-sub">{qty(item.orderDemand, item.unit)} pedidos / {qty(item.productionDemand, item.unit)} OP</div>
                </td>
                <td className="om-td-right" style={{ fontWeight: 700 }}>{item.suggestedQty > 0 ? qty(item.suggestedQty, item.unit) : "-"}</td>
                <td className="om-td-right">
                  <Button variant="ghost" size="sm" icon="external" onClick={() => go("itens", { open: item.code })}>Item</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && sort.sorted.length === 0 && <Empty icon="refresh" title="Sem sugestoes nesta visao" hint="Ajuste o filtro ou revise minimos e demandas abertas." />}
        {loading && <Empty icon="refresh" title="Calculando reposicao" hint="Lendo estoque, pedidos e ordens de producao." />}
      </Card>
    </div>
  );
}
