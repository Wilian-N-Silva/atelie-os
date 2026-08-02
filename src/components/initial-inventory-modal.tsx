"use client";

import * as React from "react";
import { Badge, Button, Card, CardContent, Empty, Field, Input, Modal, Select, Sep, Tabs, toast } from "@/components/ui";
import { fetchItems, ITEM_TYPE_LABELS, type ItemLookup, type ItemType, type ItemsResponse } from "@/lib/items";

type InitialItemRow = {
  key: string;
  sku: string;
  name: string;
  type: ItemType;
  baseUnitId: string;
  categoryId: string;
  defaultLocationId: string;
  quantity: string;
  unitCost: string;
  totalCost: string;
  currentPrice: string;
  minStock: string;
  sellable: boolean;
  tracksLot: boolean;
  lot: string;
  expiresAt: string;
};

type RecipeComponentRow = {
  key: string;
  sku: string;
  name: string;
  qty: string;
  unit: string;
  loss: string;
};

type RecipeRow = {
  key: string;
  name: string;
  productSku: string;
  productName: string;
  yieldQty: string;
  yieldUnit: string;
  cureDays: string;
  components: RecipeComponentRow[];
};

type Preset = {
  label: string;
  sku: string;
  name: string;
  type: ItemType;
  unitCodes: string[];
  categoryNames: string[];
  sellable?: boolean;
  tracksLot?: boolean;
};

const ITEM_TYPES: { value: ItemType; label: string }[] = [
  { value: "raw_material", label: ITEM_TYPE_LABELS.raw_material },
  { value: "packaging", label: ITEM_TYPE_LABELS.packaging },
  { value: "finished_good", label: ITEM_TYPE_LABELS.finished_good },
  { value: "kit", label: ITEM_TYPE_LABELS.kit },
  { value: "auxiliary", label: ITEM_TYPE_LABELS.auxiliary },
];

const PRESETS: Preset[] = [
  { label: "Cera", sku: "MP-CERA", name: "Cera", type: "raw_material", unitCodes: ["kg", "g"], categoryNames: ["Cera"], tracksLot: true },
  { label: "Essencia", sku: "MP-ESSENCIA", name: "Essencia", type: "raw_material", unitCodes: ["ml", "g"], categoryNames: ["Essencias"], tracksLot: true },
  { label: "Pavio", sku: "MP-PAVIO", name: "Pavio", type: "raw_material", unitCodes: ["un"], categoryNames: ["Pavios"] },
  { label: "Vidro com tampa", sku: "EMB-VIDRO-TAMPA", name: "Vidro com tampa", type: "packaging", unitCodes: ["un"], categoryNames: ["Vidros", "Tampas"] },
  { label: "Caixa", sku: "EMB-CAIXA", name: "Caixa", type: "packaging", unitCodes: ["un"], categoryNames: ["Caixas"] },
  { label: "Vela pronta", sku: "VELA", name: "Vela pronta", type: "finished_good", unitCodes: ["un"], categoryNames: ["Velas"], sellable: true, tracksLot: true },
];

const ERROR_LABELS: Record<string, string> = {
  empty_initial_inventory: "Adicione pelo menos um item ou uma receita.",
  duplicate_sku_in_batch: "Ha SKU repetido na lista de itens.",
  invalid_unit: "Uma unidade selecionada nao existe mais.",
  invalid_category: "Uma categoria selecionada nao existe mais.",
  invalid_location: "Um local selecionado nao existe mais.",
  location_required_for_quantity: "Informe um local para todos os itens com quantidade inicial.",
};

function key() {
  return Math.random().toString(36).slice(2);
}

function numberValue(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function money(value: number | null) {
  return value == null
    ? "-"
    : value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 4 });
}

function findByCode(rows: ItemLookup[], codes: string[]) {
  const wanted = codes.map((code) => code.toLowerCase());
  return rows.find((row) => row.code && wanted.includes(row.code.toLowerCase()))?.id ?? rows[0]?.id ?? "";
}

function findByName(rows: ItemLookup[], names: string[]) {
  const wanted = names.map((name) => name.toLowerCase());
  return rows.find((row) => wanted.includes(row.name.toLowerCase()))?.id ?? "";
}

function defaultLocationId(lookups: ItemsResponse["lookups"] | null) {
  return lookups?.locations[0]?.id ?? "";
}

function rowFromPreset(preset: Preset, lookups: ItemsResponse["lookups"] | null): InitialItemRow {
  return {
    key: key(),
    sku: preset.sku,
    name: preset.name,
    type: preset.type,
    baseUnitId: lookups ? findByCode(lookups.units, preset.unitCodes) : "",
    categoryId: lookups ? findByName(lookups.categories, preset.categoryNames) : "",
    defaultLocationId: defaultLocationId(lookups),
    quantity: "",
    unitCost: "",
    totalCost: "",
    currentPrice: "",
    minStock: "",
    sellable: Boolean(preset.sellable),
    tracksLot: Boolean(preset.tracksLot),
    lot: "",
    expiresAt: "",
  };
}

function blankItem(lookups: ItemsResponse["lookups"] | null): InitialItemRow {
  return {
    key: key(),
    sku: "",
    name: "",
    type: "raw_material",
    baseUnitId: lookups?.units[0]?.id ?? "",
    categoryId: "",
    defaultLocationId: defaultLocationId(lookups),
    quantity: "",
    unitCost: "",
    totalCost: "",
    currentPrice: "",
    minStock: "",
    sellable: false,
    tracksLot: false,
    lot: "",
    expiresAt: "",
  };
}

function blankComponent(): RecipeComponentRow {
  return { key: key(), sku: "", name: "", qty: "", unit: "g", loss: "" };
}

function blankRecipe(): RecipeRow {
  return {
    key: key(),
    name: "",
    productSku: "",
    productName: "",
    yieldQty: "1",
    yieldUnit: "unidade",
    cureDays: "0",
    components: [blankComponent()],
  };
}

function unitCostPreview(row: InitialItemRow) {
  const quantity = numberValue(row.quantity);
  const unitCost = numberValue(row.unitCost);
  const totalCost = numberValue(row.totalCost);
  if (unitCost != null) return unitCost;
  if (quantity && totalCost != null) return totalCost / quantity;
  return null;
}

function totalCostPreview(row: InitialItemRow) {
  const quantity = numberValue(row.quantity);
  const unitCost = numberValue(row.unitCost);
  const totalCost = numberValue(row.totalCost);
  if (totalCost != null) return totalCost;
  if (quantity && unitCost != null) return quantity * unitCost;
  return null;
}

function errorMessage(message: string) {
  return ERROR_LABELS[message] ?? message;
}

export function InitialInventoryModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone?: () => void;
}) {
  const [tab, setTab] = React.useState("items");
  const [lookups, setLookups] = React.useState<ItemsResponse["lookups"] | null>(null);
  const [items, setItems] = React.useState<InitialItemRow[]>([]);
  const [recipes, setRecipes] = React.useState<RecipeRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetchItems()
      .then((payload) => {
        setLookups(payload.lookups);
        setItems((current) => current.length ? current : PRESETS.slice(0, 4).map((preset) => rowFromPreset(preset, payload.lookups)));
        setRecipes((current) => current.length ? current : [blankRecipe()]);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Nao foi possivel carregar unidades e locais."))
      .finally(() => setLoading(false));
  }, [open]);

  const patchItem = (rowKey: string, patch: Partial<InitialItemRow>) => {
    setItems((current) => current.map((row) => row.key === rowKey ? { ...row, ...patch } : row));
  };

  const patchRecipe = (rowKey: string, patch: Partial<RecipeRow>) => {
    setRecipes((current) => current.map((row) => row.key === rowKey ? { ...row, ...patch } : row));
  };

  const patchComponent = (recipeKey: string, componentKey: string, patch: Partial<RecipeComponentRow>) => {
    setRecipes((current) => current.map((recipe) => recipe.key !== recipeKey ? recipe : {
      ...recipe,
      components: recipe.components.map((component) => component.key === componentKey ? { ...component, ...patch } : component),
    }));
  };

  const submit = async () => {
    const itemPayload = items
      .filter((row) => row.sku.trim() || row.name.trim())
      .map((row) => ({
        sku: row.sku,
        name: row.name,
        type: row.type,
        baseUnitId: row.baseUnitId,
        categoryId: row.categoryId || null,
        defaultLocationId: row.defaultLocationId || null,
        quantity: numberValue(row.quantity) ?? 0,
        unitCost: numberValue(row.unitCost),
        totalCost: numberValue(row.totalCost),
        currentPrice: numberValue(row.currentPrice),
        minStock: numberValue(row.minStock) ?? 0,
        sellable: row.sellable,
        tracksLot: row.tracksLot,
        lot: row.lot || null,
        expiresAt: row.expiresAt || null,
      }));
    const recipePayload = recipes
      .filter((row) => row.name.trim() || row.productSku.trim())
      .map((row) => ({
        name: row.name,
        productSku: row.productSku,
        productName: row.productName || row.productSku,
        yieldQty: numberValue(row.yieldQty) ?? 1,
        yieldUnit: row.yieldUnit || "unidade",
        cureDays: numberValue(row.cureDays) ?? 0,
        components: row.components
          .filter((component) => component.sku.trim())
          .map((component) => ({
            sku: component.sku,
            name: component.name || component.sku,
            qty: numberValue(component.qty) ?? 0,
            unit: component.unit || "un",
            loss: numberValue(component.loss) ?? 0,
          })),
      }));

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/app/initial-inventory", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ items: itemPayload, recipes: recipePayload }),
      });
      const payload = await res.json().catch(() => null) as {
        error?: string;
        itemsCreated?: number;
        itemsUpdated?: number;
        movementsCreated?: number;
        recipesCreated?: number;
      } | null;
      if (!res.ok) throw new Error(payload?.error ?? "Nao foi possivel salvar a entrada inicial.");
      toast(
        `Entrada inicial salva: ${payload?.itemsCreated ?? 0} itens novos, ${payload?.movementsCreated ?? 0} movimentos.`,
        "ok",
      );
      onDone?.();
      onClose();
    } catch (err) {
      setError(errorMessage(err instanceof Error ? err.message : "Nao foi possivel salvar a entrada inicial."));
    } finally {
      setSaving(false);
    }
  };

  const canSave = !saving && !loading && (items.some((row) => row.sku.trim() && row.name.trim()) || recipes.some((row) => row.name.trim() && row.productSku.trim()));

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon="listChecks"
      title="Entrada inicial"
      subtitle="Cadastre o que ja existe no atelie sem criar uma compra ficticia"
      width={1120}
      footer={(
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Fechar</Button>
          <Button variant="default" icon="check" onClick={submit} disabled={!canSave}>
            {saving ? "Salvando..." : "Salvar entrada inicial"}
          </Button>
        </>
      )}
    >
      <Tabs
        tabs={[
          { value: "items", label: "Itens", icon: "estoque", count: items.length },
          { value: "recipes", label: "Receitas", icon: "receitas", count: recipes.length },
        ]}
        value={tab}
        onChange={setTab}
      />

      {error && <div className="ff-error" style={{ marginTop: 12 }}>{error}</div>}
      {loading && <Empty icon="refresh" title="Carregando cadastros" hint="Buscando unidades, categorias e locais." />}

      {!loading && tab === "items" && (
        <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
          <div className="row-wrap" style={{ gap: 8 }}>
            {PRESETS.map((preset) => (
              <Button key={preset.label} variant="outline" size="sm" icon="plus" onClick={() => setItems((current) => [...current, rowFromPreset(preset, lookups)])}>
                {preset.label}
              </Button>
            ))}
            <Button variant="ghost" size="sm" icon="plus" onClick={() => setItems((current) => [...current, blankItem(lookups)])}>Item livre</Button>
          </div>

          {items.map((row, index) => (
            <Card key={row.key}>
              <CardContent style={{ display: "grid", gap: 12 }}>
                <div className="row between" style={{ gap: 10 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <Badge tone="neutral">#{index + 1}</Badge>
                    <strong>{row.name || "Novo item"}</strong>
                  </div>
                  <Button variant="ghost" size="sm" icon="trash" onClick={() => setItems((current) => current.filter((item) => item.key !== row.key))}>Remover</Button>
                </div>
                <div className="grid cols-4" style={{ gap: 10 }}>
                  <Field label="SKU" required><Input value={row.sku} onChange={(event) => patchItem(row.key, { sku: event.target.value.toUpperCase() })} placeholder="MP-CERA-001" /></Field>
                  <Field label="Nome" required><Input value={row.name} onChange={(event) => patchItem(row.key, { name: event.target.value })} placeholder="Cera de coco" /></Field>
                  <Field label="Tipo" required><Select value={row.type} onChange={(value) => patchItem(row.key, { type: value as ItemType })} options={ITEM_TYPES} /></Field>
                  <Field label="Unidade" required>
                    <Select value={row.baseUnitId} onChange={(value) => patchItem(row.key, { baseUnitId: value })} placeholder="Selecione" options={(lookups?.units ?? []).map((unit) => ({ value: unit.id, label: `${unit.code} - ${unit.name}` }))} />
                  </Field>
                </div>
                <div className="grid cols-4" style={{ gap: 10 }}>
                  <Field label="Categoria"><Select value={row.categoryId} onChange={(value) => patchItem(row.key, { categoryId: value })} placeholder="Sem categoria" options={(lookups?.categories ?? []).map((category) => ({ value: category.id, label: category.name }))} /></Field>
                  <Field label="Local inicial"><Select value={row.defaultLocationId} onChange={(value) => patchItem(row.key, { defaultLocationId: value })} placeholder="Sem local" options={(lookups?.locations ?? []).map((location) => ({ value: location.id, label: location.name }))} /></Field>
                  <Field label="Quantidade inicial"><Input inputMode="decimal" value={row.quantity} onChange={(event) => patchItem(row.key, { quantity: event.target.value })} placeholder="0" /></Field>
                  <Field label="Estoque minimo"><Input inputMode="decimal" value={row.minStock} onChange={(event) => patchItem(row.key, { minStock: event.target.value })} placeholder="0" /></Field>
                </div>
                <div className="grid cols-4" style={{ gap: 10 }}>
                  <Field label="Total da compra" hint="Pode informar o total pago pelo lote."><Input inputMode="decimal" value={row.totalCost} onChange={(event) => patchItem(row.key, { totalCost: event.target.value })} placeholder="0,00" /></Field>
                  <Field label="Custo unitario" hint={`Calculado: ${money(unitCostPreview(row))}`}><Input inputMode="decimal" value={row.unitCost} onChange={(event) => patchItem(row.key, { unitCost: event.target.value })} placeholder="0,00" /></Field>
                  <Field label="Preco de venda"><Input inputMode="decimal" value={row.currentPrice} onChange={(event) => patchItem(row.key, { currentPrice: event.target.value })} placeholder="0,00" /></Field>
                  <Field label="Total valorizado" hint={money(totalCostPreview(row))}><Input value="" disabled placeholder="automatico" /></Field>
                </div>
                <div className="grid cols-4" style={{ gap: 10, alignItems: "end" }}>
                  <Field label="Lote"><Input value={row.lot} onChange={(event) => patchItem(row.key, { lot: event.target.value })} placeholder="opcional" /></Field>
                  <Field label="Validade"><Input type="date" value={row.expiresAt} onChange={(event) => patchItem(row.key, { expiresAt: event.target.value })} /></Field>
                  <label className="row" style={{ gap: 8, minHeight: 38 }}><input type="checkbox" checked={row.tracksLot} onChange={(event) => patchItem(row.key, { tracksLot: event.target.checked })} /> Controla lote</label>
                  <label className="row" style={{ gap: 8, minHeight: 38 }}><input type="checkbox" checked={row.sellable} onChange={(event) => patchItem(row.key, { sellable: event.target.checked })} /> Vendavel</label>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && tab === "recipes" && (
        <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
          <div className="row-wrap" style={{ justifyContent: "space-between", gap: 10 }}>
            <div className="muted" style={{ fontSize: 13 }}>Use SKUs ja cadastrados ou os SKUs criados na aba Itens.</div>
            <Button variant="outline" size="sm" icon="plus" onClick={() => setRecipes((current) => [...current, blankRecipe()])}>Nova receita</Button>
          </div>
          {recipes.map((recipe, index) => (
            <Card key={recipe.key}>
              <CardContent style={{ display: "grid", gap: 12 }}>
                <div className="row between" style={{ gap: 10 }}>
                  <div className="row" style={{ gap: 8 }}><Badge tone="neutral">#{index + 1}</Badge><strong>{recipe.name || "Nova receita"}</strong></div>
                  <Button variant="ghost" size="sm" icon="trash" onClick={() => setRecipes((current) => current.filter((row) => row.key !== recipe.key))}>Remover</Button>
                </div>
                <div className="grid cols-4" style={{ gap: 10 }}>
                  <Field label="Nome da receita" required><Input value={recipe.name} onChange={(event) => patchRecipe(recipe.key, { name: event.target.value })} placeholder="Vela lavanda 180g" /></Field>
                  <Field label="SKU do produto" required><Input value={recipe.productSku} onChange={(event) => patchRecipe(recipe.key, { productSku: event.target.value.toUpperCase() })} placeholder="VELA-LAV-180" /></Field>
                  <Field label="Produto"><Input value={recipe.productName} onChange={(event) => patchRecipe(recipe.key, { productName: event.target.value })} placeholder="Vela lavanda" /></Field>
                  <Field label="Cura (dias)"><Input inputMode="numeric" value={recipe.cureDays} onChange={(event) => patchRecipe(recipe.key, { cureDays: event.target.value })} /></Field>
                </div>
                <div className="grid cols-4" style={{ gap: 10 }}>
                  <Field label="Rendimento"><Input inputMode="decimal" value={recipe.yieldQty} onChange={(event) => patchRecipe(recipe.key, { yieldQty: event.target.value })} /></Field>
                  <Field label="Unidade de rendimento"><Input value={recipe.yieldUnit} onChange={(event) => patchRecipe(recipe.key, { yieldUnit: event.target.value })} /></Field>
                </div>
                <Sep />
                {recipe.components.map((component) => (
                  <div key={component.key} className="grid cols-4" style={{ gap: 10, alignItems: "end" }}>
                    <Field label="SKU do insumo" required><Input value={component.sku} onChange={(event) => patchComponent(recipe.key, component.key, { sku: event.target.value.toUpperCase() })} /></Field>
                    <Field label="Nome"><Input value={component.name} onChange={(event) => patchComponent(recipe.key, component.key, { name: event.target.value })} /></Field>
                    <Field label="Quantidade"><Input inputMode="decimal" value={component.qty} onChange={(event) => patchComponent(recipe.key, component.key, { qty: event.target.value })} /></Field>
                    <Field label="Unidade"><Input value={component.unit} onChange={(event) => patchComponent(recipe.key, component.key, { unit: event.target.value })} /></Field>
                    <div className="row" style={{ gap: 8 }}>
                      <Field label="Perda %"><Input inputMode="decimal" value={component.loss} onChange={(event) => patchComponent(recipe.key, component.key, { loss: event.target.value })} /></Field>
                      <Button variant="ghost" size="icon" icon="trash" aria-label="Remover componente" onClick={() => patchRecipe(recipe.key, { components: recipe.components.filter((row) => row.key !== component.key) })} />
                    </div>
                  </div>
                ))}
                <Button variant="ghost" size="sm" icon="plus" onClick={() => patchRecipe(recipe.key, { components: [...recipe.components, blankComponent()] })}>Adicionar insumo</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Modal>
  );
}
