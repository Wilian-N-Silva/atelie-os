import * as React from "react";

export type LabelTarget = "item" | "lote" | "op" | "pedido" | "local";
export type LabelField =
  | "name"
  | "variant"
  | "sku"
  | "code"
  | "barcode"
  | "lot"
  | "prodDate"
  | "opNum"
  | "productName"
  | "planned"
  | "recipe"
  | "orderNum"
  | "customer"
  | "city"
  | "channel"
  | "locName"
  | "locType";

export type LabelTemplate = {
  id: string;
  name: string;
  target: LabelTarget;
  icon: string;
  w: number;
  h: number;
  desc: string;
  fields: LabelField[];
  elements?: LabelTemplateElement[];
};

export type LabelTemplateElementType = "text" | "field" | "icon";

export type LabelTemplateElement = {
  id: string;
  type: LabelTemplateElementType;
  value: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fontSize: number;
  fontWeight?: "400" | "600" | "700";
  align?: "left" | "center" | "right";
};

export const LABEL_TARGET_OPTIONS: { value: LabelTarget; label: string }[] = [
  { value: "item", label: "Item / SKU" },
  { value: "lote", label: "Lote" },
  { value: "op", label: "Ordem de producao" },
  { value: "pedido", label: "Pedido" },
  { value: "local", label: "Local" },
];

export const FIELD_LABELS: Record<LabelField, string> = {
  name: "Nome do item",
  variant: "Variacao",
  sku: "SKU humano",
  code: "Codigo interno",
  barcode: "Codigo de barras",
  lot: "Numero do lote",
  prodDate: "Data de producao",
  opNum: "Numero da OP",
  productName: "Produto",
  planned: "Quantidade planejada",
  recipe: "Receita",
  orderNum: "Numero do pedido",
  customer: "Cliente",
  city: "Cidade",
  channel: "Canal",
  locName: "Nome do local",
  locType: "Tipo de local",
};

export const DEFAULT_LABEL_TEMPLATES: LabelTemplate[] = [
  { id: "item", name: "Etiqueta de item", target: "item", icon: "tag", w: 50, h: 30, desc: "Produto ou insumo com SKU e codigo", fields: ["name", "variant", "sku", "code", "barcode"] },
  { id: "lote", name: "Etiqueta de lote", target: "lote", icon: "layers", w: 50, h: 30, desc: "Lote produzido com data", fields: ["name", "lot", "prodDate", "code", "barcode"] },
  { id: "op", name: "Etiqueta de OP", target: "op", icon: "producao", w: 60, h: 40, desc: "Ordem de producao", fields: ["opNum", "productName", "planned", "recipe", "barcode"] },
  { id: "pedido", name: "Etiqueta de pedido interno", target: "pedido", icon: "pedidos", w: 100, h: 60, desc: "Organizacao interna do pedido", fields: ["orderNum", "customer", "city", "channel", "barcode"] },
  { id: "local", name: "Etiqueta de local", target: "local", icon: "mapPin", w: 60, h: 40, desc: "Prateleira, caixa ou bancada", fields: ["locName", "locType", "code", "barcode"] },
];

export const LABEL_ICON_OPTIONS = [
  "flame",
  "tag",
  "box",
  "package2",
  "droplet",
  "gift",
  "instagram",
  "whatsapp",
  "truck",
  "mapPin",
  "circle",
  "checkCircle",
  "star",
  "heart",
  "leaf",
  "sparkles",
  "scan",
  "printer",
].filter(Boolean);

export function createLabelTemplate(input: Omit<LabelTemplate, "id"> & { id?: string }): LabelTemplate {
  const safeName = input.name.trim() || "Etiqueta personalizada";
  const safeId = input.id?.trim() || `tpl-${Date.now()}`;
  return {
    id: safeId,
    name: safeName,
    target: input.target,
    icon: input.icon.trim() || "tag",
    w: Math.max(10, input.w),
    h: Math.max(10, input.h),
    desc: input.desc.trim(),
    fields: Array.from(new Set(input.fields.length ? input.fields : ["name", "barcode"])),
    elements: input.elements?.map(normalizeElement).filter(Boolean) as LabelTemplateElement[] | undefined,
  };
}

export function normalizeElement(value: unknown): LabelTemplateElement | null {
  if (!value || typeof value !== "object") return null;
  const element = value as Partial<LabelTemplateElement>;
  if (!element.type || !["text", "field", "icon"].includes(element.type)) return null;
  const safeValue = String(element.value ?? "").trim();
  if (!safeValue) return null;
  return {
    id: String(element.id || `el-${Date.now()}`),
    type: element.type,
    value: safeValue,
    x: Math.max(0, Math.min(100, Number(element.x ?? 10))),
    y: Math.max(0, Math.min(100, Number(element.y ?? 10))),
    w: Math.max(5, Math.min(100, Number(element.w ?? 40))),
    h: Math.max(5, Math.min(100, Number(element.h ?? 12))),
    fontSize: Math.max(6, Math.min(48, Number(element.fontSize ?? 12))),
    fontWeight: element.fontWeight === "400" || element.fontWeight === "600" || element.fontWeight === "700" ? element.fontWeight : "600",
    align: element.align === "center" || element.align === "right" ? element.align : "left",
  };
}

export function useLabelTemplates() {
  const [templates, setLocalTemplates] = React.useState<LabelTemplate[]>([]);

  React.useEffect(() => {
    let alive = true;
    fetch("/api/app/label-settings", { cache: "no-store", credentials: "include" })
      .then((res) => res.ok ? res.json() : null)
      .then((payload: { templates?: LabelTemplate[] } | null) => {
        if (alive && payload?.templates) setLocalTemplates(payload.templates);
      })
      .catch(() => null);
    return () => { alive = false; };
  }, []);

  const setTemplates = React.useCallback((updater: React.SetStateAction<LabelTemplate[]>) => {
    setLocalTemplates((current) => {
      const next = typeof updater === "function"
        ? (updater as (value: LabelTemplate[]) => LabelTemplate[])(current)
        : updater;

      void fetch("/api/app/label-settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ templates: next }),
      }).catch(() => null);

      return next;
    });
  }, []);

  return [templates, setTemplates] as const;
}
