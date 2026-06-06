import type { BrandTheme } from "@/lib/theme";

export const BRL = (value: number) =>
  "R$ " + value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function parseBRLInput(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) / 100 : 0;
}

export function formatBRLInput(value: string | number) {
  const number = typeof value === "number" ? value : parseBRLInput(value);
  return BRL(Number.isFinite(number) ? number : 0);
}

export const num = (value: number, digits = 0) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export type ItemKind = "pa" | "kit" | "mp" | "emb";
export type OrderStatus =
  | "aguardando_pagamento"
  | "pago"
  | "a_separar"
  | "separado"
  | "embalado"
  | "pronto_envio"
  | "enviado"
  | "entregue";
export type ProductionStatus =
  | "aguardando_materiais"
  | "em_producao"
  | "em_cura"
  | "aguardando_revisao"
  | "liberada"
  | "finalizada";

export type ItemSummary = {
  id: string;
  code: string;
  sku: string;
  name: string;
  variant: string;
  type: ItemKind;
  unit: string;
  available: number;
  min: number;
  costAvg: number;
  price: number;
  weightG?: number | null;
  packedWeightG?: number | null;
  dimensions?: string | null;
  packedDimensions?: string | null;
  collection?: string;
  aroma?: string;
};

export type CustomerAddress = {
  address: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  stateAbbr: string;
  postalCode: string;
};

export type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  address: CustomerAddress | null;
  source: string;
  status: string;
};

export type Order = {
  id: string;
  code: string;
  num: string;
  customerId?: string | null;
  channel: keyof typeof CHANNELS;
  labelKind?: "internal" | "pdf_attached";
  customerName: string;
  city: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerDocument?: string | null;
  customerAddress?: CustomerAddress | null;
  customerIncomplete?: boolean;
  // Default keys are listed for autocomplete; the company-configured workflow may define others.
  status: OrderStatus | (string & {});
  payment: "pago" | "aguardando";
  createdAt: string;
  freight: number;
  discount: number;
  total: number;
  items: { sku: string; qty: number; unitPrice?: number }[];
  tracking: string | null;
  note: string | null;
  shippingQuote?: {
    provider: "melhor_envio" | string;
    serviceId: string;
    serviceName: string;
    company: string | null;
    price: number;
    deliveryTime: number | null;
    selectedAt: string;
  } | null;
  shippingLabel?: {
    provider: "melhor_envio" | string;
    externalId: string;
    protocol: string | null;
    status: string | null;
    serviceId: string;
    serviceName: string;
    company: string | null;
    price: number | null;
    tracking: string | null;
    trackingUrl: string | null;
    cartInsertedAt: string;
    checkoutAt?: string | null;
    generatedAt?: string | null;
    previewUrl?: string | null;
    printUrl?: string | null;
  } | null;
};

export type Recipe = {
  id: string;
  name: string;
  product: string;
  productName: string;
  version: string;
  status: "ativa" | "rascunho";
  yield: number;
  yieldUnit: string;
  cureDays: number;
  components: { sku: string; name: string; qty: number; unit: string; loss: number }[];
  tests: { date: string; qty: number; result: "aprovado" | "ajustar" | "reprovado"; note: string }[];
};

export type ProductionOrder = {
  id: string;
  code: string;
  num: string;
  product: string;
  productName: string;
  recipe: string;
  recipeVer: string;
  planned: number;
  // Default keys are listed for autocomplete; the company-configured workflow may define others.
  status: ProductionStatus | (string & {});
  date: string;
  resp: string;
  progress?: number;
  lot?: string;
  cureUntil?: string | null;
  cureDayLeft?: number;
};

export type LabelSheetBase = {
  id: string;
  name: string;
  brand?: string;
  code: string;
  pageW?: number;
  pageH?: number;
  cols: number;
  rows: number;
  labelW: number;
  labelH: number;
  mTop?: number;
  mLeft?: number;
  gutX?: number;
  gutY?: number;
  roll?: boolean;
};

export const CHANNELS = {
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  mercadolivre: "Mercado Livre",
  shopee: "Shopee",
  feira: "Feira",
  direta: "Venda direta",
} as const;

export const LABEL_SHEETS: LabelSheetBase[] = [
  { id: "a4-3x8", name: "Folha A4 - grade 3x8", brand: "Generico", code: "A4-3x8", pageW: 210, pageH: 297, cols: 3, rows: 8, labelW: 63.5, labelH: 33.9, mTop: 9, mLeft: 7, gutX: 2.5, gutY: 0 },
  { id: "a4-4x10", name: "Pimaco A4056", brand: "Pimaco", code: "A4056", pageW: 210, pageH: 297, cols: 4, rows: 10, labelW: 48, labelH: 25, mTop: 11, mLeft: 7, gutX: 2, gutY: 1.5 },
  { id: "roll-50x30", name: "Rolo termico 50x30", brand: "Termica", code: "ROLO-50x30", pageW: 50, pageH: 30, cols: 1, rows: 1, labelW: 50, labelH: 30, mTop: 0, mLeft: 0, gutX: 0, gutY: 0, roll: true },
];

export const LABEL_TEMPLATES = [
  { id: "item", name: "Etiqueta de item", target: "item", icon: "tag", size: "50x30mm" },
  { id: "pedido", name: "Etiqueta de pedido", target: "pedido", icon: "pedidos", size: "100x60mm" },
  { id: "op", name: "Etiqueta de OP", target: "op", icon: "producao", size: "60x40mm" },
] as const;

export const BRAND_PRESETS: BrandTheme[] = [
  { id: "neutro", name: "Neutro claro", mode: "light", radius: "0.5rem", colors: { background: "#FFFFFF", foreground: "#0A0A0B", card: "#FFFFFF", cardForeground: "#0A0A0B", primary: "#18181B", primaryForeground: "#FAFAFA", secondary: "#F4F4F5", secondaryForeground: "#18181B", muted: "#F4F4F5", mutedForeground: "#71717A", accent: "#6D5CE7", accentForeground: "#FFFFFF", border: "#E4E4E7", input: "#E4E4E7", ring: "#A1A1AA", success: "#2F9E5B", warning: "#C97A14", danger: "#D03A2F", info: "#2D6FD6", sidebarBackground: "#FAFAFA" } },
  { id: "ambar", name: "Instante Ambar", mode: "light", radius: "0.875rem", colors: { background: "#FAF7F2", foreground: "#2A211D", card: "#FFFFFF", cardForeground: "#2A211D", primary: "#8A5A44", primaryForeground: "#FFFFFF", secondary: "#E8D7CD", secondaryForeground: "#2A211D", muted: "#F1E9E3", mutedForeground: "#6B5B53", accent: "#C49A6C", accentForeground: "#2A211D", border: "#E2D4C8", input: "#E2D4C8", ring: "#8A5A44", success: "#3F7D58", warning: "#B7791F", danger: "#A94442", info: "#3A6EA5", sidebarBackground: "#2A211D" } },
  { id: "escuro", name: "Neutro escuro", mode: "dark", radius: "0.5rem", colors: { background: "#0E0E11", foreground: "#F4F4F5", card: "#17171B", cardForeground: "#F4F4F5", primary: "#FAFAFA", primaryForeground: "#18181B", secondary: "#26262B", secondaryForeground: "#F4F4F5", muted: "#26262B", mutedForeground: "#9B9BA4", accent: "#8B7CF0", accentForeground: "#0E0E11", border: "#2A2A30", input: "#2E2E34", ring: "#54545C", success: "#4ADE80", warning: "#FBBF24", danger: "#F87171", info: "#60A5FA", sidebarBackground: "#121216" } },
];
