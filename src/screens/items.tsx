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
  Sep,
  SortTh,
  Stat,
  Tabs,
  useSort,
} from "@/components/ui";
import { BRL, num } from "@/lib/format";
import {
  fetchItems,
  ITEM_STATUS_LABELS,
  ITEM_STATUS_TONES,
  ITEM_TYPE_LABELS,
  ITEM_TYPE_TONES,
  type CatalogItem,
  type ItemType,
  type ItemsResponse,
} from "@/lib/items";
import type { Go, Route } from "@/lib/types";

type ItemTab = "all" | ItemType | "below_minimum";

const ITEM_ICONS: Record<ItemType, string> = {
  raw_material: "droplet",
  packaging: "box",
  finished_good: "flame",
  kit: "layers",
  auxiliary: "itens",
};

const EMPTY_CARDS: ItemsResponse["cards"] = {
  total: 0,
  active: 0,
  sellable: 0,
  belowMinimum: 0,
  rawMaterials: 0,
  packaging: 0,
  finishedGoods: 0,
  kits: 0,
};

function stockTone(item: CatalogItem) {
  if (item.stockStatus === "below_minimum") return "bad";
  if (item.stockStatus === "no_minimum") return "neutral";
  return "ok";
}

function stockLabel(item: CatalogItem) {
  if (item.stockStatus === "below_minimum") return "Abaixo do minimo";
  if (item.stockStatus === "no_minimum") return "Sem minimo";
  return "Em dia";
}

function stockFillPct(item: CatalogItem) {
  if (item.min <= 0) return item.available > 0 ? 100 : 0;
  return Math.max(0, Math.min(100, (item.available / item.min) * 100));
}

function itemTitle(item: CatalogItem) {
  return `${item.name}${item.variant ? ` ${item.variant}` : ""}`;
}

function searchableText(item: CatalogItem) {
  return [
    item.name,
    item.variant,
    item.sku,
    item.code,
    item.category,
    item.defaultLocation,
    item.metadata.aroma,
    item.metadata.collection,
  ].filter(Boolean).join(" ").toLowerCase();
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="field">
      <div className="field-k">{label}</div>
      <div className="field-v">{value ?? "-"}</div>
    </div>
  );
}

function ItemDrawer({ item, onClose }: { item: CatalogItem; onClose: () => void }) {
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-head">
          <div className={`swatch swatch--${item.type === "raw_material" ? "mp" : item.type === "packaging" ? "emb" : item.type === "kit" ? "kit" : ""}`}>
            <Icon name={ITEM_ICONS[item.type]} size={17} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="drawer-h1">{itemTitle(item)}</div>
            <div className="row-wrap" style={{ gap: 6, marginTop: 7 }}>
              <span className="code-pill">{item.code}</span>
              <span className="sku">{item.sku}</span>
              <Badge tone={ITEM_TYPE_TONES[item.type]}>{ITEM_TYPE_LABELS[item.type]}</Badge>
              <Badge tone={ITEM_STATUS_TONES[item.status]}>{ITEM_STATUS_LABELS[item.status]}</Badge>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>

        <div className="drawer-body">
          <div className="grid cols-3" style={{ marginBottom: 18 }}>
            <Stat label="Disponivel" value={`${num(item.available)} ${item.unit}`} tone={stockTone(item)} />
            <Stat label="Fisico" value={`${num(item.physical)} ${item.unit}`} />
            <Stat label="Minimo" value={`${num(item.min)} ${item.unit}`} />
          </div>

          <div className="block-label">Estoque</div>
          <table className="minitable" style={{ marginBottom: 18 }}>
            <tbody>
              <tr><td>Reservado</td><td className="r">{num(item.reserved)} {item.unit}</td></tr>
              <tr><td>Em cura</td><td className="r">{num(item.inCure)} {item.unit}</td></tr>
              <tr><td>Bloqueado</td><td className="r">{num(item.blocked)} {item.unit}</td></tr>
              <tr><td>Status</td><td className="r"><Badge tone={stockTone(item)}>{stockLabel(item)}</Badge></td></tr>
            </tbody>
          </table>

          <div className="block-label">Cadastro</div>
          <div style={{ marginBottom: 18 }}>
            <FieldRow label="Categoria" value={item.category} />
            <FieldRow label="Unidade" value={item.unit} />
            <FieldRow label="Local padrao" value={item.defaultLocation} />
            <FieldRow label="Controla lote" value={item.tracksLot ? "Sim" : "Nao"} />
            <FieldRow label="Vendavel" value={item.sellable ? "Sim" : "Nao"} />
            <FieldRow label="Fragil" value={item.fragile ? "Sim" : "Nao"} />
          </div>

          <div className="block-label">Comercial</div>
          <div style={{ marginBottom: 18 }}>
            <FieldRow label="Custo estimado" value={item.estimatedCost == null ? "-" : BRL(item.estimatedCost)} />
            <FieldRow label="Custo medio" value={item.averageCost == null ? "-" : BRL(item.averageCost)} />
            <FieldRow label="Preco sugerido" value={item.suggestedPrice == null ? "-" : BRL(item.suggestedPrice)} />
            <FieldRow label="Preco atual" value={item.currentPrice == null ? "-" : BRL(item.currentPrice)} />
          </div>

          {(item.metadata.aroma || item.metadata.collection || item.metadata.cureDays != null) && (
            <>
              <div className="block-label">Produto</div>
              <div>
                <FieldRow label="Colecao" value={item.metadata.collection} />
                <FieldRow label="Aroma" value={item.metadata.aroma} />
                <FieldRow label="Cura" value={item.metadata.cureDays == null ? "-" : `${item.metadata.cureDays} dias`} />
              </div>
            </>
          )}
        </div>

        <div className="drawer-foot">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </div>
  );
}

export function ItemsScreen({ go, route }: { go: Go; route: Route }) {
  const [data, setData] = React.useState<ItemsResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [tab, setTab] = React.useState<ItemTab>("all");

  const load = React.useCallback(() => {
    setLoading(true);
    fetchItems()
      .then((payload) => {
        setData(payload);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Nao foi possivel carregar os itens.");
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const cards = data?.cards ?? EMPTY_CARDS;

  const tabs = React.useMemo(() => ([
    { value: "all", label: "Todos", count: cards.total },
    { value: "finished_good", label: "Produtos", count: cards.finishedGoods },
    { value: "raw_material", label: "Materias-primas", count: cards.rawMaterials },
    { value: "packaging", label: "Embalagens", count: cards.packaging },
    { value: "kit", label: "Kits", count: cards.kits },
    { value: "below_minimum", label: "Abaixo minimo", count: cards.belowMinimum },
  ]), [cards]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    return (data?.items ?? []).filter((item) => {
      const matchesTab =
        tab === "all"
          ? true
          : tab === "below_minimum"
            ? item.stockStatus === "below_minimum"
            : item.type === tab;

      if (!matchesTab) return false;
      return !q || searchableText(item).includes(q);
    });
  }, [data?.items, query, tab]);

  const sortAccessors = React.useMemo(() => ({
    name: (item: CatalogItem) => item.name,
    sku: (item: CatalogItem) => item.sku,
    available: (item: CatalogItem) => item.available,
    min: (item: CatalogItem) => item.min,
    price: (item: CatalogItem) => item.currentPrice ?? 0,
  }), []);

  const sort = useSort(filtered, sortAccessors, "name", "asc");

  const selected = React.useMemo(() => {
    if (!route.open || !data) return null;
    return data.items.find((item) => item.code === route.open || item.sku === route.open || item.id === route.open) ?? null;
  }, [data, route.open]);

  return (
    <div className="page page--wide fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-h1">Itens / SKUs</h1>
          <p className="page-lede">
            Catalogo company-scoped com saldo derivado dos movimentos de estoque.
          </p>
        </div>
        <div className="row-wrap">
          <Button variant="outline" icon="refresh" onClick={load} disabled={loading}>Atualizar</Button>
        </div>
      </div>

      <div className="grid cols-4" style={{ marginBottom: "var(--gap)" }}>
        <Card><CardContent><Stat label="Itens ativos" value={cards.active} sub={`${cards.total} cadastrados`} /></CardContent></Card>
        <Card><CardContent><Stat label="Vendaveis" value={cards.sellable} sub="Produtos e kits no catalogo" tone="ok" /></CardContent></Card>
        <Card><CardContent><Stat label="Abaixo do minimo" value={cards.belowMinimum} sub="Disponivel menor que minimo" tone={cards.belowMinimum > 0 ? "bad" : "ok"} /></CardContent></Card>
        <Card><CardContent><Stat label="Materias-primas" value={cards.rawMaterials} sub={`${cards.packaging} embalagens`} tone="info" /></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Catalogo</CardTitle>
            <div className="section-hint" style={{ marginTop: 2 }}>{filtered.length} itens nesta visao</div>
          </div>
          <div className="row-wrap" style={{ flex: 1, justifyContent: "flex-end" }}>
            <Input
              icon="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por SKU, codigo, nome ou categoria"
              style={{ width: 320, maxWidth: "100%" }}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="toolbar" style={{ marginBottom: 12 }}>
            <Tabs tabs={tabs} value={tab} onChange={(value) => setTab(value as ItemTab)} />
          </div>

          <Sep />

          {error && (
            <Empty icon="alertCircle" title="Itens indisponiveis" hint={error} />
          )}

          {!error && loading && (
            <Empty icon="itens" title="Carregando catalogo" hint="Buscando itens e saldos do banco." />
          )}

          {!error && !loading && sort.sorted.length === 0 && (
            <Empty icon="search" title="Nenhum item encontrado" hint="Ajuste a busca ou troque o filtro selecionado." />
          )}

          {!error && !loading && sort.sorted.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table className="om-table">
                <thead>
                  <tr>
                    <SortTh label="Item" k="name" sort={sort} />
                    <SortTh label="SKU" k="sku" sort={sort} />
                    <th>Tipo</th>
                    <SortTh label="Disponivel" k="available" sort={sort} align="right" />
                    <SortTh label="Minimo" k="min" sort={sort} align="right" />
                    <SortTh label="Preco" k="price" sort={sort} align="right" />
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sort.sorted.map((item) => (
                    <tr key={item.id} className="om-row-click" onClick={() => go("itens", { open: item.code })}>
                      <td style={{ minWidth: 260 }}>
                        <div className="item-cell">
                          <div className={`swatch swatch--${item.type === "raw_material" ? "mp" : item.type === "packaging" ? "emb" : item.type === "kit" ? "kit" : ""}`}>
                            <Icon name={ITEM_ICONS[item.type]} size={16} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div className="cell-title">{itemTitle(item)}</div>
                            <div className="cell-sub">{item.category ?? "Sem categoria"} - {item.defaultLocation ?? "Sem local padrao"}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="sku">{item.sku}</div>
                        <div className="code-pill" style={{ marginTop: 4, display: "inline-flex" }}>{item.code}</div>
                      </td>
                      <td><Badge tone={ITEM_TYPE_TONES[item.type]}>{ITEM_TYPE_LABELS[item.type]}</Badge></td>
                      <td className="om-td-right" style={{ minWidth: 132 }}>
                        <div style={{ fontWeight: 650 }} className={`om-text--${stockTone(item)}`}>{num(item.available)} {item.unit}</div>
                        <div className="qbar" style={{ marginTop: 6, marginLeft: "auto" }}>
                          <div className="qbar-fill" style={{ width: `${stockFillPct(item)}%`, background: `hsl(var(--${stockTone(item)}))` }} />
                        </div>
                      </td>
                      <td className="om-td-right">{num(item.min)} {item.unit}</td>
                      <td className="om-td-right">{item.currentPrice == null || item.currentPrice <= 0 ? "-" : BRL(item.currentPrice)}</td>
                      <td><Badge tone={stockTone(item)}>{stockLabel(item)}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {selected && <ItemDrawer item={selected} onClose={() => go("itens")} />}
    </div>
  );
}
