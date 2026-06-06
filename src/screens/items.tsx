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
  Field,
  Icon,
  Input,
  Modal,
  Sep,
  Select,
  SortTh,
  Stat,
  Tabs,
  Textarea,
  toast,
  useSort,
} from "@/components/ui";
import { BRL, num } from "@/lib/format";
import {
  adjustItemStock,
  createItem,
  fetchItemMovements,
  fetchItems,
  ITEM_MOVEMENT_LABELS,
  ITEM_STATUS_LABELS,
  ITEM_STATUS_TONES,
  ITEM_TYPE_LABELS,
  ITEM_TYPE_TONES,
  updateItem,
  type CatalogItem,
  type ItemFormInput,
  type ItemLookups,
  type ItemMovement,
  type ItemMovementType,
  type ItemMutationResult,
  type ItemStatus,
  type ItemType,
  type ItemsResponse,
  type StockAdjustmentDirection,
} from "@/lib/items";
import { canManageCatalog, canManageInventory } from "@/lib/permissions";
import type { Go, Route, Session } from "@/lib/types";

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

const EMPTY_LOOKUPS: ItemLookups = {
  categories: [],
  units: [],
  locations: [],
};

type ItemFormState = {
  internalCode: string;
  sku: string;
  name: string;
  variant: string;
  type: ItemType;
  categoryId: string;
  baseUnitId: string;
  defaultLocationId: string;
  minStock: string;
  tracksLot: boolean;
  fragile: boolean;
  sellable: boolean;
  status: ItemStatus;
  estimatedCost: string;
  averageCost: string;
  suggestedPrice: string;
  currentPrice: string;
  weightG: string;
  packedWeightG: string;
  dimensions: string;
  packedDimensions: string;
  aroma: string;
  collection: string;
  cureDays: string;
};

const TYPE_OPTIONS = [
  { value: "raw_material", label: ITEM_TYPE_LABELS.raw_material },
  { value: "packaging", label: ITEM_TYPE_LABELS.packaging },
  { value: "finished_good", label: ITEM_TYPE_LABELS.finished_good },
  { value: "kit", label: ITEM_TYPE_LABELS.kit },
  { value: "auxiliary", label: ITEM_TYPE_LABELS.auxiliary },
];

const STATUS_OPTIONS = [
  { value: "active", label: ITEM_STATUS_LABELS.active },
  { value: "blocked", label: ITEM_STATUS_LABELS.blocked },
  { value: "archived", label: ITEM_STATUS_LABELS.archived },
];

const MUTATION_ERROR_LABELS: Record<string, string> = {
  invalid_internal_code: "Codigo interno deve ter 12 digitos numericos.",
  sku_required: "Informe o SKU.",
  name_required: "Informe o nome.",
  invalid_type: "Tipo de item invalido.",
  invalid_status: "Status invalido.",
  unit_required: "Selecione uma unidade.",
  invalid_category: "Categoria nao pertence a esta empresa.",
  invalid_unit: "Unidade nao pertence a esta empresa.",
  invalid_location: "Local padrao nao pertence a esta empresa.",
  sellable_weight_required: "Informe o peso ou peso embalado para itens vendaveis.",
  sellable_dimensions_required: "Informe dimensoes ou dimensoes embaladas no formato CxLxA para itens vendaveis.",
  sku_already_exists: "Ja existe um item com este SKU.",
  internal_code_already_exists: "Ja existe um item com este codigo interno.",
  item_not_found: "Item nao encontrado.",
};

const INTERNAL_CODE_PREFIXES: Record<ItemType, string> = {
  raw_material: "0101",
  packaging: "0102",
  finished_good: "0103",
  kit: "0104",
  auxiliary: "0105",
};

const SKU_TYPE_PREFIXES: Record<ItemType, string> = {
  raw_material: "MP",
  packaging: "EMB",
  finished_good: "VEL",
  kit: "KIT",
  auxiliary: "AUX",
};

const SKU_STOP_WORDS = new Set([
  "A",
  "AS",
  "COM",
  "DA",
  "DAS",
  "DE",
  "DO",
  "DOS",
  "E",
  "EM",
  "PARA",
  "VELA",
  "VELAS",
  "ESSENCIA",
  "ESSENCIAS",
  "CERA",
  "CERAS",
  "VIDRO",
  "VIDROS",
  "TAMPA",
  "TAMPAS",
  "CAIXA",
  "CAIXAS",
]);

const SKU_TOKEN_ALIASES: Record<string, string> = {
  FRANCESA: "FR",
  KRAFT: "KFT",
  PINUS: "PIN",
  SOJA: "SOJ",
};

function normalizeSkuText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function skuTokens(value: string) {
  return normalizeSkuText(value)
    .split(/\s+/)
    .filter((token) => token && !SKU_STOP_WORDS.has(token));
}

function skuTokenCode(token: string, length = 3) {
  const alias = SKU_TOKEN_ALIASES[token];
  if (alias) return alias.slice(0, length);
  return token.replace(/[^A-Z0-9]/g, "").slice(0, length || 3) || "ITEM";
}

function variantCode(variant: string) {
  const normalized = normalizeSkuText(variant);
  const digits = normalized.match(/\d+/g)?.join("");
  if (digits) {
    return digits.length <= 2 ? digits.padStart(3, "0") : digits.slice(0, 6);
  }
  const token = skuTokens(variant)[0];
  return token ? skuTokenCode(token) : "";
}

function skuPrefix(type: ItemType, name: string) {
  const normalized = normalizeSkuText(name);
  if (normalized.includes("VELA")) return "VEL";
  if (normalized.includes("ESSENCIA")) return "ESS";
  if (normalized.includes("CERA")) return "CER";
  if (normalized.includes("VIDRO")) return "VID";
  if (normalized.includes("TAMPA")) return "TMP";
  if (normalized.includes("CAIXA")) return "CXA";
  return SKU_TYPE_PREFIXES[type];
}

function uniqueSku(baseSku: string, existingItems: CatalogItem[]) {
  const used = new Set(existingItems.map((item) => item.sku.toUpperCase()));
  if (!used.has(baseSku)) return baseSku;
  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${baseSku}-${String(index).padStart(2, "0")}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${baseSku}-${Date.now().toString().slice(-4)}`;
}

function generatedSku(form: ItemFormState, existingItems: CatalogItem[]) {
  const prefix = skuPrefix(form.type, form.name);
  const tokens = skuTokens(form.name);
  const primary = skuTokenCode(tokens[0] ?? "ITEM");
  const secondary = tokens[1] ? skuTokenCode(tokens[1], prefix === "ESS" ? 2 : 3) : "";
  const variant = variantCode(form.variant);
  const tail = prefix === "ESS" && secondary ? secondary : variant || secondary || "001";
  return uniqueSku([prefix, primary, tail].join("-"), existingItems);
}

function generatedInternalCode(type: ItemType, existingItems: CatalogItem[]) {
  const prefix = INTERNAL_CODE_PREFIXES[type];
  const nextSequence = existingItems.reduce((max, item) => {
    if (!item.code.startsWith(prefix)) return max;
    const sequence = Number(item.code.slice(prefix.length));
    return Number.isFinite(sequence) ? Math.max(max, sequence) : max;
  }, 0) + 1;
  return `${prefix}${String(nextSequence).padStart(8, "0")}`;
}

function withGeneratedCodes(form: ItemFormState, existingItems: CatalogItem[]) {
  return {
    ...form,
    internalCode: generatedInternalCode(form.type, existingItems),
    sku: generatedSku(form, existingItems),
  };
}

function defaultForm(lookups: ItemLookups): ItemFormState {
  return {
    internalCode: "",
    sku: "",
    name: "",
    variant: "",
    type: "raw_material",
    categoryId: "",
    baseUnitId: lookups.units[0]?.id ?? "",
    defaultLocationId: lookups.locations[0]?.id ?? "",
    minStock: "0",
    tracksLot: false,
    fragile: false,
    sellable: false,
    status: "active",
    estimatedCost: "",
    averageCost: "",
    suggestedPrice: "",
    currentPrice: "",
    weightG: "",
    packedWeightG: "",
    dimensions: "",
    packedDimensions: "",
    aroma: "",
    collection: "",
    cureDays: "",
  };
}

function formFromItem(item: CatalogItem, lookups: ItemLookups): ItemFormState {
  return {
    internalCode: item.code,
    sku: item.sku,
    name: item.name,
    variant: item.variant ?? "",
    type: item.type,
    categoryId: item.categoryId ?? "",
    baseUnitId: item.baseUnitId ?? lookups.units[0]?.id ?? "",
    defaultLocationId: item.defaultLocationId ?? "",
    minStock: String(item.min),
    tracksLot: item.tracksLot,
    fragile: item.fragile,
    sellable: item.sellable,
    status: item.status,
    estimatedCost: item.estimatedCost == null ? "" : String(item.estimatedCost),
    averageCost: item.averageCost == null ? "" : String(item.averageCost),
    suggestedPrice: item.suggestedPrice == null ? "" : String(item.suggestedPrice),
    currentPrice: item.currentPrice == null ? "" : String(item.currentPrice),
    weightG: item.weightG == null ? "" : String(item.weightG),
    packedWeightG: item.packedWeightG == null ? "" : String(item.packedWeightG),
    dimensions: item.dimensions ?? "",
    packedDimensions: item.packedDimensions ?? "",
    aroma: item.metadata.aroma ?? "",
    collection: item.metadata.collection ?? "",
    cureDays: item.metadata.cureDays == null ? "" : String(item.metadata.cureDays),
  };
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function parseRequiredNumber(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function parseOptionalInteger(value: string) {
  const parsed = parseOptionalNumber(value);
  return parsed == null ? null : Math.round(parsed);
}

function validDimensionText(value: string) {
  if (!value.trim()) return false;
  const parts = value
    .toLowerCase()
    .replace(/cm/g, "")
    .split(/[x×*]/)
    .map((part) => Number(part.trim().replace(",", ".")))
    .filter((part) => Number.isFinite(part) && part > 0);
  return parts.length === 3;
}

function formToInput(form: ItemFormState): { input: ItemFormInput } | { error: string } {
  const minStock = parseRequiredNumber(form.minStock);
  if (minStock == null) return { error: "Estoque minimo deve ser zero ou maior." };
  if (form.sellable && !parseOptionalInteger(form.weightG) && !parseOptionalInteger(form.packedWeightG)) {
    return { error: "sellable_weight_required" };
  }
  if (form.sellable && !validDimensionText(form.dimensions) && !validDimensionText(form.packedDimensions)) {
    return { error: "sellable_dimensions_required" };
  }

  return {
    input: {
      internalCode: form.internalCode.trim(),
      sku: form.sku.trim().toUpperCase(),
      name: form.name.trim(),
      variant: form.variant.trim() || null,
      type: form.type,
      categoryId: form.categoryId || null,
      baseUnitId: form.baseUnitId,
      defaultLocationId: form.defaultLocationId || null,
      minStock,
      tracksLot: form.tracksLot,
      fragile: form.fragile,
      sellable: form.sellable,
      status: form.status,
      estimatedCost: parseOptionalNumber(form.estimatedCost),
      averageCost: parseOptionalNumber(form.averageCost),
      suggestedPrice: parseOptionalNumber(form.suggestedPrice),
      currentPrice: parseOptionalNumber(form.currentPrice),
      weightG: parseOptionalInteger(form.weightG),
      packedWeightG: parseOptionalInteger(form.packedWeightG),
      dimensions: form.dimensions.trim() || null,
      packedDimensions: form.packedDimensions.trim() || null,
      metadata: {
        aroma: form.aroma.trim() || null,
        collection: form.collection.trim() || null,
        cureDays: parseOptionalInteger(form.cureDays),
      },
    },
  };
}

function mutationErrorMessage(message: string) {
  return MUTATION_ERROR_LABELS[message] ?? message;
}

function movementTone(type: ItemMovementType) {
  if (["purchase_entry", "adjustment_positive", "production_output", "return", "release"].includes(type)) return "ok";
  if (["adjustment_negative", "loss", "production_consumption", "order_shipment", "block"].includes(type)) return "bad";
  if (["reservation", "reservation_release"].includes(type)) return "info";
  return "neutral";
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

function ItemFormModal({
  open,
  mode,
  item,
  lookups,
  existingItems,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: "create" | "edit";
  item?: CatalogItem | null;
  lookups: ItemLookups;
  existingItems: CatalogItem[];
  onClose: () => void;
  onSaved: (result: ItemMutationResult) => Promise<void>;
}) {
  const [form, setForm] = React.useState<ItemFormState>(() => withGeneratedCodes(defaultForm(lookups), existingItems));
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setForm(item ? formFromItem(item, lookups) : withGeneratedCodes(defaultForm(lookups), existingItems));
    setError(null);
    setBusy(false);
  }, [open, item, lookups, existingItems]);

  React.useEffect(() => {
    if (!open || mode !== "create") return;
    setForm((current) => {
      const nextInternalCode = generatedInternalCode(current.type, existingItems);
      const nextSku = generatedSku(current, existingItems);
      if (current.internalCode === nextInternalCode && current.sku === nextSku) return current;
      return { ...current, internalCode: nextInternalCode, sku: nextSku };
    });
  }, [open, mode, form.type, form.name, form.variant, existingItems]);

  const setField = <K extends keyof ItemFormState>(key: K, value: ItemFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  };

  const submit = async () => {
    const parsed = formToInput(form);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const result = mode === "create"
        ? await createItem(parsed.input)
        : await updateItem(item?.id ?? "", parsed.input);
      toast(mode === "create" ? "Item criado." : "Item atualizado.", "ok");
      onClose();
      await onSaved(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nao foi possivel salvar o item.";
      setError(mutationErrorMessage(message));
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? "Novo item" : "Editar item"}
      subtitle={mode === "create" ? "Cadastro do catalogo" : item ? itemTitle(item) : undefined}
      icon="itens"
      width={760}
      footer={(
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button variant="default" icon="check" onClick={submit} disabled={busy}>
            {busy ? "Salvando..." : "Salvar item"}
          </Button>
        </>
      )}
    >
      <div className="ff-grid">
        <Field label="Codigo interno" required hint={mode === "create" ? "Gerado automaticamente pelo padrao TTSS + sequencia." : "12 digitos numericos."}>
          <Input
            value={form.internalCode}
            onChange={(event) => setField("internalCode", event.target.value.replace(/\D/g, "").slice(0, 12))}
            placeholder="010100000001"
            inputMode="numeric"
            readOnly={mode === "create"}
          />
        </Field>
        <Field label="SKU" required hint={mode === "create" ? "Sugerido automaticamente a partir de tipo, nome e variante." : undefined}>
          <Input
            value={form.sku}
            onChange={(event) => setField("sku", event.target.value.toUpperCase())}
            placeholder="VEL-EXEMPLO-001"
            readOnly={mode === "create"}
          />
        </Field>
      </div>

      <div className="ff-grid">
        <Field label="Nome" required>
          <Input value={form.name} onChange={(event) => setField("name", event.target.value)} placeholder="Nome do item" />
        </Field>
        <Field label="Variante">
          <Input value={form.variant} onChange={(event) => setField("variant", event.target.value)} placeholder="156ml, 1L, natural" />
        </Field>
      </div>

      <div className="ff-grid-3">
        <Field label="Tipo" required>
          <Select value={form.type} onChange={(value) => setField("type", value as ItemType)} options={TYPE_OPTIONS} />
        </Field>
        <Field label="Status" required>
          <Select value={form.status} onChange={(value) => setField("status", value as ItemStatus)} options={STATUS_OPTIONS} />
        </Field>
        <Field label="Unidade" required>
          <Select
            value={form.baseUnitId}
            onChange={(value) => setField("baseUnitId", value)}
            options={lookups.units.map((unit) => ({ value: unit.id, label: `${unit.code ?? ""} - ${unit.name}` }))}
            placeholder="Selecione"
          />
        </Field>
      </div>

      <div className="ff-grid">
        <Field label="Categoria">
          <Select
            value={form.categoryId}
            onChange={(value) => setField("categoryId", value)}
            options={lookups.categories.map((category) => ({ value: category.id, label: category.name }))}
            placeholder="Sem categoria"
          />
        </Field>
        <Field label="Local padrao">
          <Select
            value={form.defaultLocationId}
            onChange={(value) => setField("defaultLocationId", value)}
            options={lookups.locations.map((location) => ({ value: location.id, label: location.name }))}
            placeholder="Sem local"
          />
        </Field>
      </div>

      <div className="ff-grid-3">
        <Field label="Estoque minimo">
          <Input inputMode="decimal" value={form.minStock} onChange={(event) => setField("minStock", event.target.value)} />
        </Field>
        <Field label="Custo estimado">
          <Input inputMode="decimal" value={form.estimatedCost} onChange={(event) => setField("estimatedCost", event.target.value)} placeholder="0,00" />
        </Field>
        <Field label="Preco atual">
          <Input inputMode="decimal" value={form.currentPrice} onChange={(event) => setField("currentPrice", event.target.value)} placeholder="0,00" />
        </Field>
      </div>

      <div className="ff-grid-3">
        <Field label="Custo medio">
          <Input inputMode="decimal" value={form.averageCost} onChange={(event) => setField("averageCost", event.target.value)} placeholder="0,00" />
        </Field>
        <Field label="Preco sugerido">
          <Input inputMode="decimal" value={form.suggestedPrice} onChange={(event) => setField("suggestedPrice", event.target.value)} placeholder="0,00" />
        </Field>
        <Field label="Dias de cura">
          <Input inputMode="numeric" value={form.cureDays} onChange={(event) => setField("cureDays", event.target.value.replace(/\D/g, ""))} />
        </Field>
      </div>

      <div className="ff-grid">
        <Field label="Dimensoes" required={form.sellable && !form.packedDimensions.trim()}>
          <Input value={form.dimensions} onChange={(event) => setField("dimensions", event.target.value)} placeholder="10x10x11" />
        </Field>
        <Field label="Dimensoes embalado" required={form.sellable && !form.dimensions.trim()}>
          <Input value={form.packedDimensions} onChange={(event) => setField("packedDimensions", event.target.value)} placeholder="13x13x13" />
        </Field>
      </div>

      <div className="ff-grid">
        <Field label="Peso (g)" required={form.sellable && !form.packedWeightG.trim()}>
          <Input inputMode="numeric" value={form.weightG} onChange={(event) => setField("weightG", event.target.value.replace(/\D/g, ""))} />
        </Field>
        <Field label="Peso embalado (g)" required={form.sellable && !form.weightG.trim()}>
          <Input inputMode="numeric" value={form.packedWeightG} onChange={(event) => setField("packedWeightG", event.target.value.replace(/\D/g, ""))} />
        </Field>
      </div>

      <div className="ff-grid">
        <Field label="Colecao">
          <Input value={form.collection} onChange={(event) => setField("collection", event.target.value)} />
        </Field>
        <Field label="Aroma">
          <Input value={form.aroma} onChange={(event) => setField("aroma", event.target.value)} />
        </Field>
      </div>

      <div className="row-wrap" style={{ gap: 16, marginTop: 4 }}>
        <label className="row" style={{ gap: 8, fontSize: 13 }}><input type="checkbox" checked={form.tracksLot} onChange={(event) => setField("tracksLot", event.target.checked)} /> Controla lote</label>
        <label className="row" style={{ gap: 8, fontSize: 13 }}><input type="checkbox" checked={form.sellable} onChange={(event) => setField("sellable", event.target.checked)} /> Vendavel</label>
        <label className="row" style={{ gap: 8, fontSize: 13 }}><input type="checkbox" checked={form.fragile} onChange={(event) => setField("fragile", event.target.checked)} /> Fragil</label>
      </div>

      {error && <div className="ff-error" style={{ marginTop: 12 }}>{error}</div>}
    </Modal>
  );
}

function StockAdjustmentModal({
  item,
  open,
  onClose,
  onAdjusted,
}: {
  item: CatalogItem;
  open: boolean;
  onClose: () => void;
  onAdjusted: () => void;
}) {
  const [direction, setDirection] = React.useState<StockAdjustmentDirection>("increase");
  const [quantity, setQuantity] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setDirection("increase");
    setQuantity("");
    setReason("");
    setError(null);
    setBusy(false);
  }, [open, item.id]);

  const submit = async () => {
    const parsedQuantity = Number(quantity.replace(",", "."));
    const trimmedReason = reason.trim();

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError("Informe uma quantidade maior que zero.");
      return;
    }

    if (!trimmedReason) {
      setError("Informe o motivo do ajuste.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await adjustItemStock(item.id, {
        direction,
        quantity: parsedQuantity,
        reason: trimmedReason,
      });
      toast("Ajuste de estoque registrado.", "ok");
      onClose();
      onAdjusted();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nao foi possivel registrar o ajuste.";
      setError(message === "insufficient_physical_stock" ? "Ajuste deixaria o estoque fisico negativo." : message);
      setBusy(false);
    }
  };

  const nextPhysical = Number.isFinite(Number(quantity.replace(",", ".")))
    ? item.physical + (direction === "increase" ? Number(quantity.replace(",", ".")) : -Number(quantity.replace(",", ".")))
    : item.physical;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ajustar estoque"
      subtitle={itemTitle(item)}
      icon="sliders"
      footer={(
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button variant="default" icon="check" onClick={submit} disabled={busy}>
            {busy ? "Registrando..." : "Registrar ajuste"}
          </Button>
        </>
      )}
    >
      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <Stat label="Fisico atual" value={`${num(item.physical)} ${item.unit}`} />
        <Stat label="Disponivel" value={`${num(item.available)} ${item.unit}`} tone={stockTone(item)} />
        <Stat label="Novo fisico" value={`${num(Math.max(0, nextPhysical))} ${item.unit}`} tone={nextPhysical < 0 ? "bad" : undefined} />
      </div>

      <Field label="Tipo de ajuste" required>
        <Select
          value={direction}
          onChange={(value) => setDirection(value as StockAdjustmentDirection)}
          options={[
            { value: "increase", label: "Entrada manual" },
            { value: "decrease", label: "Saida manual" },
          ]}
        />
      </Field>

      <Field label={`Quantidade (${item.unit})`} required>
        <Input
          inputMode="decimal"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          placeholder="0"
        />
      </Field>

      <Field label="Motivo" required hint="O motivo fica registrado na movimentacao e na auditoria.">
        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Ex.: contagem fisica revisada na prateleira principal"
        />
      </Field>

      {error && <div className="ff-error" style={{ marginTop: -6 }}>{error}</div>}
    </Modal>
  );
}

function ItemDrawer({
  item,
  canEditCatalog,
  canAdjustStock,
  onClose,
  onAdjusted,
  onEdit,
}: {
  item: CatalogItem;
  canEditCatalog: boolean;
  canAdjustStock: boolean;
  onClose: () => void;
  onAdjusted: () => void;
  onEdit: () => void;
}) {
  const [adjustOpen, setAdjustOpen] = React.useState(false);
  const [movements, setMovements] = React.useState<ItemMovement[]>([]);
  const [movementsLoading, setMovementsLoading] = React.useState(false);
  const [movementsError, setMovementsError] = React.useState<string | null>(null);

  const loadMovements = React.useCallback(async () => {
    setMovementsLoading(true);
    try {
      const payload = await fetchItemMovements(item.id);
      setMovements(payload.movements);
      setMovementsError(null);
    } catch (err) {
      setMovementsError(err instanceof Error ? err.message : "Nao foi possivel carregar as movimentacoes.");
    } finally {
      setMovementsLoading(false);
    }
  }, [item.id]);

  React.useEffect(() => {
    void loadMovements();
  }, [loadMovements]);

  return (
    <>
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

            <div className="block-label" style={{ marginTop: 18 }}>Movimentacoes recentes</div>
            {movementsLoading && <div className="section-hint">Carregando movimentacoes...</div>}
            {!movementsLoading && movementsError && <div className="section-hint">{movementsError}</div>}
            {!movementsLoading && !movementsError && movements.length === 0 && (
              <Empty icon="estoque" title="Sem movimentacoes" hint="Este item ainda nao tem historico de estoque." />
            )}
            {!movementsLoading && !movementsError && movements.length > 0 && (
              <div>
                {movements.slice(0, 8).map((movement) => (
                  <div className="lrow" key={movement.id}>
                    <div className={`chip chip--${movementTone(movement.movementType)}`}>
                      <Icon name={movementTone(movement.movementType) === "bad" ? "arrowDown" : "arrowUp"} size={16} />
                    </div>
                    <div className="lrow-main">
                      <div className="lrow-title">{ITEM_MOVEMENT_LABELS[movement.movementType]}</div>
                      <div className="lrow-sub">
                        {formatMovementDate(movement.occurredAt)}
                        {movement.actorName ? ` - ${movement.actorName}` : ""}
                        {movement.reason ? ` - ${movement.reason}` : ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 650 }} className={`om-text--${movementTone(movement.movementType)}`}>
                        {movementSign(movement.movementType)}{num(movement.quantity)} {movement.unit}
                      </div>
                      {movement.sourceType && <div className="lrow-sub">{movement.sourceType}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="drawer-foot">
            {canEditCatalog && <Button variant="outline" icon="itens" onClick={onEdit}>Editar cadastro</Button>}
            {canAdjustStock && <Button variant="default" icon="sliders" onClick={() => setAdjustOpen(true)}>Ajustar estoque</Button>}
            <Button variant="outline" onClick={onClose}>Fechar</Button>
          </div>
        </div>
      </div>

      {canAdjustStock && (
        <StockAdjustmentModal
          item={item}
          open={adjustOpen}
          onClose={() => setAdjustOpen(false)}
          onAdjusted={() => {
            void loadMovements();
            onAdjusted();
          }}
        />
      )}
    </>
  );
}

export function ItemsScreen({ go, route, session }: { go: Go; route: Route; session: Session }) {
  const [data, setData] = React.useState<ItemsResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [tab, setTab] = React.useState<ItemTab>("all");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<CatalogItem | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const payload = await fetchItems();
      setData(payload);
      setError(null);
      return payload;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar os itens.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const cards = data?.cards ?? EMPTY_CARDS;
  const lookups = data?.lookups ?? EMPTY_LOOKUPS;
  const canEditCatalog = canManageCatalog(session.user.role);
  const canAdjustStock = canManageInventory(session.user.role);

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

  const handleItemSaved = React.useCallback(async (result: ItemMutationResult) => {
    await load();
    go("itens", { open: result.code });
  }, [go, load]);

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
          {canEditCatalog && <Button variant="default" icon="plus" onClick={() => setCreateOpen(true)}>Novo item</Button>}
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

      {selected && (
        <ItemDrawer
          item={selected}
          canEditCatalog={canEditCatalog}
          canAdjustStock={canAdjustStock}
          onClose={() => go("itens")}
          onAdjusted={load}
          onEdit={() => setEditingItem(selected)}
        />
      )}

      <ItemFormModal
        open={createOpen}
        mode="create"
        lookups={lookups}
        existingItems={data?.items ?? []}
        onClose={() => setCreateOpen(false)}
        onSaved={handleItemSaved}
      />

      <ItemFormModal
        open={Boolean(editingItem)}
        mode="edit"
        item={editingItem}
        lookups={lookups}
        existingItems={data?.items ?? []}
        onClose={() => setEditingItem(null)}
        onSaved={handleItemSaved}
      />
    </div>
  );
}
