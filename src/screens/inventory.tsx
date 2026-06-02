"use client";

import * as React from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Empty,
  Icon,
  Input,
  Select,
  Sep,
  SortTh,
  Stat,
  Tabs,
  useSort,
} from "@/components/ui";
import { num } from "@/lib/format";
import {
  fetchInventory,
  type InventoryItemBalance,
  type InventoryLocation,
  type InventoryMovement,
  type InventoryResponse,
} from "@/lib/inventory";
import {
  ITEM_MOVEMENT_LABELS,
  ITEM_TYPE_LABELS,
  ITEM_TYPE_TONES,
  type ItemMovementType,
} from "@/lib/items";
import type { Go, Route } from "@/lib/types";

type InventoryTab = "all" | "with_physical" | "reserved" | "cure" | "blocked" | "below_minimum";

const EMPTY_CARDS: InventoryResponse["cards"] = {
  totalItems: 0,
  belowMinimum: 0,
  physical: 0,
  reserved: 0,
  inCure: 0,
  blocked: 0,
  available: 0,
  locations: 0,
  movements: 0,
};

const LOCATION_TYPE_LABELS: Record<string, string> = {
  shelf: "Prateleira",
  bench: "Bancada",
  cure: "Cura",
  shipping: "Expedicao",
  blocked: "Bloqueado",
  packaging: "Embalagens",
};

function itemTitle(item: { name: string; variant: string | null }) {
  return `${item.name}${item.variant ? ` ${item.variant}` : ""}`;
}

function searchableText(item: InventoryItemBalance) {
  return [
    item.name,
    item.variant,
    item.sku,
    item.code,
    item.category,
    item.defaultLocation,
    item.type,
  ].filter(Boolean).join(" ").toLowerCase();
}

function locationLabel(location: InventoryLocation) {
  return `${location.name} - ${LOCATION_TYPE_LABELS[location.type] ?? location.type}`;
}

function stockTone(item: InventoryItemBalance) {
  if (item.stockStatus === "below_minimum") return "bad";
  if (item.stockStatus === "no_minimum") return "neutral";
  return "ok";
}

function stockLabel(item: InventoryItemBalance) {
  if (item.stockStatus === "below_minimum") return "Abaixo do minimo";
  if (item.stockStatus === "no_minimum") return "Sem minimo";
  return "Em dia";
}

function stockFillPct(item: InventoryItemBalance) {
  if (item.min <= 0) return item.available > 0 ? 100 : 0;
  return Math.max(0, Math.min(100, (item.available / item.min) * 100));
}

function movementTone(type: ItemMovementType) {
  if (["purchase_entry", "adjustment_positive", "production_output", "return", "release"].includes(type)) return "ok";
  if (["adjustment_negative", "loss", "production_consumption", "order_shipment", "block"].includes(type)) return "bad";
  if (["reservation", "reservation_release"].includes(type)) return "info";
  return "neutral";
}

function movementIcon(type: ItemMovementType) {
  if (type === "transfer") return "arrowRight";
  return movementTone(type) === "bad" ? "arrowDown" : "arrowUp";
}

function movementSign(type: ItemMovementType) {
  if (["purchase_entry", "adjustment_positive", "production_output", "return"].includes(type)) return "+";
  if (["adjustment_negative", "loss", "production_consumption", "order_shipment"].includes(type)) return "-";
  return "";
}

function formatMovementDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function movementLocationText(movement: InventoryMovement) {
  if (movement.fromLocation && movement.toLocation) {
    return `${movement.fromLocation.name} -> ${movement.toLocation.name}`;
  }
  if (movement.fromLocation) return `Origem: ${movement.fromLocation.name}`;
  if (movement.toLocation) return `Destino: ${movement.toLocation.name}`;
  return "Sem local informado";
}

function matchesTab(item: InventoryItemBalance, tab: InventoryTab) {
  switch (tab) {
    case "with_physical":
      return item.physical > 0;
    case "reserved":
      return item.reserved > 0;
    case "cure":
      return item.inCure > 0;
    case "blocked":
      return item.blocked > 0;
    case "below_minimum":
      return item.stockStatus === "below_minimum";
    case "all":
    default:
      return true;
  }
}

export function InventoryScreen({ go, route }: { go: Go; route: Route }) {
  const [data, setData] = React.useState<InventoryResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [tab, setTab] = React.useState<InventoryTab>("all");
  const [locationId, setLocationId] = React.useState(route.filter ?? "");

  const load = React.useCallback(async (nextLocationId: string) => {
    setLoading(true);
    try {
      const payload = await fetchInventory(nextLocationId || null);
      setData(payload);
      setError(null);
      return payload;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar o estoque.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load(locationId);
  }, [load, locationId]);

  React.useEffect(() => {
    if (!data || !locationId) return;
    if (data.selectedLocationId !== locationId) setLocationId(data.selectedLocationId ?? "");
  }, [data, locationId]);

  const cards = data?.cards ?? EMPTY_CARDS;
  const locations = data?.locations ?? [];
  const selectedLocation = locations.find((location) => location.id === locationId) ?? null;

  const tabs = React.useMemo(() => {
    const items = data?.items ?? [];
    return [
      { value: "all", label: "Todos", count: items.length },
      { value: "with_physical", label: "Fisico", count: items.filter((item) => item.physical > 0).length },
      { value: "reserved", label: "Reservado", count: items.filter((item) => item.reserved > 0).length },
      { value: "cure", label: "Cura", count: items.filter((item) => item.inCure > 0).length },
      { value: "blocked", label: "Bloqueado", count: items.filter((item) => item.blocked > 0).length },
      { value: "below_minimum", label: "Abaixo minimo", count: items.filter((item) => item.stockStatus === "below_minimum").length },
    ];
  }, [data?.items]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.items ?? []).filter((item) => matchesTab(item, tab) && (!q || searchableText(item).includes(q)));
  }, [data?.items, query, tab]);

  const sortAccessors = React.useMemo(() => ({
    name: (item: InventoryItemBalance) => item.name,
    location: (item: InventoryItemBalance) => item.defaultLocation ?? "",
    physical: (item: InventoryItemBalance) => item.physical,
    reserved: (item: InventoryItemBalance) => item.reserved,
    available: (item: InventoryItemBalance) => item.available,
    min: (item: InventoryItemBalance) => item.min,
  }), []);

  const sort = useSort(filtered, sortAccessors, "name", "asc");

  const changeLocation = (value: string) => {
    setLocationId(value);
    go("estoque", value ? { filter: value } : {});
  };

  return (
    <div className="page page--wide fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-h1">Estoque</h1>
          <p className="page-lede">
            Saldos derivados de movimentos, com visao por local e historico recente.
          </p>
        </div>
        <div className="row-wrap">
          <Button variant="outline" icon="itens" onClick={() => go("itens")}>Itens / SKUs</Button>
          <Button variant="outline" icon="refresh" onClick={() => void load(locationId)} disabled={loading}>Atualizar</Button>
        </div>
      </div>

      <div className="grid cols-4" style={{ marginBottom: "var(--gap)" }}>
        <Card><CardContent><Stat label="Itens na visao" value={cards.totalItems} sub={selectedLocation ? selectedLocation.name : `${cards.locations} locais ativos`} /></CardContent></Card>
        <Card><CardContent><Stat label="Disponivel agregado" value={num(cards.available)} sub="Fisico - reservas - cura - bloqueios" tone={cards.available < 0 ? "bad" : "ok"} /></CardContent></Card>
        <Card><CardContent><Stat label="Reservado" value={num(cards.reserved)} sub={`${num(cards.inCure)} em cura`} tone={cards.reserved > 0 ? "info" : undefined} /></CardContent></Card>
        <Card><CardContent><Stat label="Abaixo do minimo" value={cards.belowMinimum} sub={`${num(cards.physical)} fisico agregado`} tone={cards.belowMinimum > 0 ? "bad" : "ok"} /></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Saldos por item</CardTitle>
            <div className="section-hint" style={{ marginTop: 2 }}>
              {filtered.length} itens {selectedLocation ? `em ${selectedLocation.name}` : "na empresa"}
            </div>
          </div>
          <div className="row-wrap" style={{ flex: 1, justifyContent: "flex-end" }}>
            <Select
              value={locationId}
              onChange={changeLocation}
              placeholder="Todos os locais"
              options={locations.filter((location) => location.isActive).map((location) => ({
                value: location.id,
                label: locationLabel(location),
              }))}
              style={{ width: 260, maxWidth: "100%" }}
            />
            <Input
              icon="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar item, SKU, codigo ou categoria"
              style={{ width: 320, maxWidth: "100%" }}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="toolbar" style={{ marginBottom: 12 }}>
            <Tabs tabs={tabs} value={tab} onChange={(value) => setTab(value as InventoryTab)} />
          </div>

          <Sep />

          {error && <Empty icon="alertCircle" title="Estoque indisponivel" hint={error} />}

          {!error && loading && <Empty icon="estoque" title="Carregando estoque" hint="Calculando saldos a partir dos movimentos." />}

          {!error && !loading && sort.sorted.length === 0 && (
            <Empty icon="search" title="Nenhum item encontrado" hint="Ajuste a busca, o local ou o filtro selecionado." />
          )}

          {!error && !loading && sort.sorted.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table className="om-table">
                <thead>
                  <tr>
                    <SortTh label="Item" k="name" sort={sort} />
                    <SortTh label="Local padrao" k="location" sort={sort} />
                    <SortTh label="Fisico" k="physical" sort={sort} align="right" />
                    <SortTh label="Reservado" k="reserved" sort={sort} align="right" />
                    <th className="om-td-right">Cura / bloqueio</th>
                    <SortTh label="Disponivel" k="available" sort={sort} align="right" />
                    <SortTh label="Minimo" k="min" sort={sort} align="right" />
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sort.sorted.map((item) => (
                    <tr key={item.id} className="om-row-click" onClick={() => go("itens", { open: item.code })}>
                      <td style={{ minWidth: 260 }}>
                        <div className="item-cell">
                          <div className={`swatch swatch--${item.type === "raw_material" ? "mp" : item.type === "packaging" ? "emb" : item.type === "kit" ? "kit" : ""}`}>
                            <Icon name={item.type === "raw_material" ? "droplet" : item.type === "packaging" ? "box" : item.type === "kit" ? "layers" : "itens"} size={16} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div className="cell-title">{itemTitle(item)}</div>
                            <div className="cell-sub">{item.category ?? "Sem categoria"} - <span className="sku">{item.sku}</span></div>
                          </div>
                        </div>
                      </td>
                      <td style={{ minWidth: 180 }}>
                        <div>{item.defaultLocation ?? "Sem local padrao"}</div>
                        <div className="code-pill" style={{ marginTop: 4, display: "inline-flex" }}>{item.code}</div>
                      </td>
                      <td className="om-td-right">{num(item.physical)} {item.unit}</td>
                      <td className="om-td-right">{num(item.reserved)} {item.unit}</td>
                      <td className="om-td-right">{num(item.inCure)} / {num(item.blocked)} {item.unit}</td>
                      <td className="om-td-right" style={{ minWidth: 132 }}>
                        <div style={{ fontWeight: 650 }} className={`om-text--${stockTone(item)}`}>{num(item.available)} {item.unit}</div>
                        <div className="qbar" style={{ marginTop: 6, marginLeft: "auto" }}>
                          <div className="qbar-fill" style={{ width: `${stockFillPct(item)}%`, background: `hsl(var(--${stockTone(item)}))` }} />
                        </div>
                      </td>
                      <td className="om-td-right">{num(item.min)} {item.unit}</td>
                      <td>
                        <div className="row-wrap" style={{ gap: 6 }}>
                          <Badge tone={stockTone(item)}>{stockLabel(item)}</Badge>
                          <Badge tone={ITEM_TYPE_TONES[item.type]}>{ITEM_TYPE_LABELS[item.type]}</Badge>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card style={{ marginTop: "var(--gap)" }}>
        <CardHeader>
          <div>
            <CardTitle>Movimentacoes recentes</CardTitle>
            <div className="section-hint" style={{ marginTop: 2 }}>
              {cards.movements} movimentos {selectedLocation ? `em ${selectedLocation.name}` : "mais recentes"}
            </div>
          </div>
          <Button variant="ghost" size="sm" iconRight="arrowRight" onClick={() => go("itens")}>Ajustar nos itens</Button>
        </CardHeader>
        <CardContent style={{ paddingTop: 4 }}>
          {error && <div className="section-hint">{error}</div>}
          {!error && loading && <div className="section-hint">Carregando movimentacoes...</div>}
          {!error && !loading && (data?.movements ?? []).length === 0 && (
            <Empty icon="estoque" title="Sem movimentacoes" hint="Nenhum movimento encontrado para o filtro atual." />
          )}
          {!error && !loading && (data?.movements ?? []).map((movement) => (
            <div className="lrow om-row-click" key={movement.id} onClick={() => go("itens", { open: movement.itemCode })}>
              <div className={`chip chip--${movementTone(movement.movementType)}`}>
                <Icon name={movementIcon(movement.movementType)} size={16} />
              </div>
              <div className="lrow-main">
                <div className="lrow-title">
                  {ITEM_MOVEMENT_LABELS[movement.movementType]} - {itemTitle({ name: movement.itemName, variant: movement.itemVariant })}
                </div>
                <div className="lrow-sub">
                  {formatMovementDate(movement.occurredAt)} - {movementLocationText(movement)}
                  {movement.reason ? ` - ${movement.reason}` : ""}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 650 }} className={`om-text--${movementTone(movement.movementType)}`}>
                  {movementSign(movement.movementType)}{num(movement.quantity)} {movement.unit}
                </div>
                <div className="lrow-sub">{movement.actorName ?? movement.sourceType ?? movement.itemSku}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
