import type { BrandTheme } from "@/lib/theme";

export const BRL = (value: number) =>
  "R$ " + value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const num = (value: number, digits = 0) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export type DemoItemType = "pa" | "kit" | "mp" | "emb";
export type DemoOrderStatus =
  | "aguardando_pagamento"
  | "pago"
  | "a_separar"
  | "separado"
  | "embalado"
  | "pronto_envio"
  | "enviado"
  | "entregue";
export type DemoProductionStatus =
  | "aguardando_materiais"
  | "em_producao"
  | "em_cura"
  | "aguardando_revisao"
  | "liberada"
  | "finalizada";

export type DemoItem = {
  code: string;
  sku: string;
  name: string;
  variant: string;
  type: DemoItemType;
  unit: string;
  available: number;
  min: number;
  costAvg: number;
  price: number;
  collection?: string;
  aroma?: string;
};

export type DemoOrder = {
  id: string;
  code: string;
  num: string;
  channel: keyof typeof CHANNELS;
  customerName: string;
  city: string;
  status: DemoOrderStatus;
  payment: "pago" | "aguardando";
  createdAt: string;
  freight: number;
  discount: number;
  total: number;
  items: { sku: string; qty: number }[];
  tracking: string | null;
  note: string | null;
};

export type DemoRecipe = {
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

export type DemoProductionOrder = {
  id: string;
  code: string;
  num: string;
  product: string;
  productName: string;
  recipe: string;
  recipeVer: string;
  planned: number;
  status: DemoProductionStatus;
  date: string;
  resp: string;
  progress?: number;
  lot?: string;
  cureUntil?: string | null;
  cureDayLeft?: number;
};

export type DemoLabelSheet = {
  id: string;
  name: string;
  code: string;
  cols: number;
  rows: number;
  labelW: number;
  labelH: number;
  roll?: boolean;
};

export const ORDER_STATUS: Record<DemoOrderStatus, { label: string; tone: string; step: number }> = {
  aguardando_pagamento: { label: "Aguardando pagamento", tone: "warn", step: 0 },
  pago: { label: "Pago", tone: "info", step: 1 },
  a_separar: { label: "A separar", tone: "info", step: 2 },
  separado: { label: "Separado", tone: "info", step: 4 },
  embalado: { label: "Embalado", tone: "ok", step: 6 },
  pronto_envio: { label: "Pronto p/ envio", tone: "ok", step: 7 },
  enviado: { label: "Enviado", tone: "neutral", step: 8 },
  entregue: { label: "Entregue", tone: "ok", step: 9 },
};

export const PROD_STATUS: Record<DemoProductionStatus, { label: string; tone: string; icon: string }> = {
  aguardando_materiais: { label: "Aguardando material", tone: "warn", icon: "box" },
  em_producao: { label: "Em producao", tone: "info", icon: "producao" },
  em_cura: { label: "Em cura", tone: "cure", icon: "thermometer" },
  aguardando_revisao: { label: "Revisao de qualidade", tone: "warn", icon: "listChecks" },
  liberada: { label: "Liberada", tone: "ok", icon: "checkCircle" },
  finalizada: { label: "Finalizada", tone: "neutral", icon: "check" },
};

export const CHANNELS = {
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  mercadolivre: "Mercado Livre",
  shopee: "Shopee",
  feira: "Feira",
  direta: "Venda direta",
} as const;

export const DEMO_ITEMS: DemoItem[] = [
  { code: "010300001287", sku: "VEL-LAV-156", name: "Vela Lavanda Francesa", variant: "156ml", type: "pa", unit: "un", available: 54, min: 24, costAvg: 18.4, price: 69, collection: "Refugio", aroma: "Lavanda francesa, bergamota, almíscar branco" },
  { code: "010300001294", sku: "VEL-CAP-156", name: "Vela Capim-Limao", variant: "156ml", type: "pa", unit: "un", available: 36, min: 24, costAvg: 17.9, price: 69, collection: "Manha", aroma: "Capim-limao, gengibre, folha verde" },
  { code: "010300001307", sku: "VEL-BAU-156", name: "Vela Baunilha & Ambar", variant: "156ml", type: "pa", unit: "un", available: 16, min: 24, costAvg: 19.1, price: 74, collection: "Refugio", aroma: "Baunilha bourbon, ambar, sandalo" },
  { code: "010300001314", sku: "VEL-CED-220", name: "Vela Cedro & Sandalo", variant: "220ml", type: "pa", unit: "un", available: 6, min: 18, costAvg: 24.6, price: 92, collection: "Floresta", aroma: "Cedro, sandalo, vetiver" },
  { code: "010400000452", sku: "KIT-RIT-003", name: "Kit Ritual Noturno", variant: "3 velas", type: "kit", unit: "un", available: 8, min: 8, costAvg: 58.9, price: 198, collection: "Refugio", aroma: "Lavanda, Baunilha & Ambar, Cedro" },
  { code: "010100000018", sku: "CER-SOJ-01", name: "Cera de Soja Ecosoya", variant: "sc 10kg", type: "mp", unit: "kg", available: 14.2, min: 8, costAvg: 32.5, price: 0 },
  { code: "010100000025", sku: "ESS-LAV-FR", name: "Essencia Lavanda Francesa", variant: "1L", type: "mp", unit: "ml", available: 430, min: 600, costAvg: 0.42, price: 0 },
  { code: "010100000049", sku: "ESS-BAU-AM", name: "Essencia Baunilha & Ambar", variant: "1L", type: "mp", unit: "ml", available: 510, min: 600, costAvg: 0.55, price: 0 },
  { code: "010200000011", sku: "VID-NAD-156", name: "Vidro Nadir", variant: "156ml ambar", type: "emb", unit: "un", available: 88, min: 60, costAvg: 4.2, price: 0 },
  { code: "010200000035", sku: "TMP-PIN-052", name: "Tampa Pinus", variant: "52mm", type: "emb", unit: "un", available: 96, min: 120, costAvg: 1.6, price: 0 },
];

export const DEMO_ORDERS: DemoOrder[] = [
  { id: "o1", code: "040100000931", num: "#1042", channel: "instagram", customerName: "Marina Alves", city: "Sao Paulo - SP", status: "a_separar", payment: "pago", createdAt: "31/05 09:12", freight: 24.9, discount: 0, total: 162.9, items: [{ sku: "VEL-LAV-156", qty: 1 }, { sku: "VEL-BAU-156", qty: 1 }], tracking: null, note: "Cliente pediu cartao escrito a mao." },
  { id: "o2", code: "040100000932", num: "#1043", channel: "whatsapp", customerName: "Beatriz Lemos", city: "Campinas - SP", status: "pago", payment: "pago", createdAt: "31/05 08:40", freight: 22, discount: 10, total: 259, items: [{ sku: "KIT-RIT-003", qty: 1 }, { sku: "VEL-CAP-156", qty: 1 }], tracking: null, note: null },
  { id: "o3", code: "040300000118", num: "ML-88231", channel: "mercadolivre", customerName: "Joao Pereira", city: "Rio de Janeiro - RJ", status: "separado", payment: "pago", createdAt: "30/05 18:22", freight: 0, discount: 0, total: 138, items: [{ sku: "VEL-CED-220", qty: 1 }, { sku: "VEL-CAP-156", qty: 1 }], tracking: null, note: "Etiqueta ML anexada em PDF." },
  { id: "o4", code: "040100000929", num: "#1040", channel: "direta", customerName: "Renata Dias", city: "Sao Paulo - SP", status: "pronto_envio", payment: "pago", createdAt: "30/05 11:30", freight: 27.4, discount: 0, total: 211.4, items: [{ sku: "VEL-CED-220", qty: 2 }], tracking: "BR849201773BR", note: null },
  { id: "o5", code: "040200000077", num: "#1038", channel: "shopee", customerName: "Paula Ribeiro", city: "Curitiba - PR", status: "aguardando_pagamento", payment: "aguardando", createdAt: "30/05 10:02", freight: 19.9, discount: 0, total: 93.9, items: [{ sku: "VEL-CAP-156", qty: 1 }], tracking: null, note: "Aguardando confirmacao Shopee." },
  { id: "o6", code: "040100000927", num: "#1037", channel: "instagram", customerName: "Helena Vargas", city: "Niteroi - RJ", status: "enviado", payment: "pago", createdAt: "29/05 14:45", freight: 26.1, discount: 0, total: 165.1, items: [{ sku: "VEL-BAU-156", qty: 1 }, { sku: "VEL-LAV-156", qty: 1 }], tracking: "BR849100021BR", note: null },
];

export const DEMO_RECIPES: DemoRecipe[] = [
  { id: "r1", name: "Lavanda Francesa", product: "VEL-LAV-156", productName: "Vela Lavanda Francesa 156ml", version: "v3", status: "ativa", yield: 1, yieldUnit: "vela 156ml", cureDays: 14, components: [{ sku: "CER-SOJ-01", name: "Cera de Soja Ecosoya", qty: 0.142, unit: "kg", loss: 3 }, { sku: "ESS-LAV-FR", name: "Essencia Lavanda Francesa", qty: 11, unit: "ml", loss: 2 }, { sku: "VID-NAD-156", name: "Vidro Nadir 156ml", qty: 1, unit: "un", loss: 1 }, { sku: "TMP-PIN-052", name: "Tampa Pinus 52mm", qty: 1, unit: "un", loss: 0 }], tests: [{ date: "05/05", qty: 6, result: "aprovado", note: "Queima limpa, topo liso e difusao forte." }] },
  { id: "r2", name: "Baunilha & Ambar", product: "VEL-BAU-156", productName: "Vela Baunilha & Ambar 156ml", version: "v4", status: "ativa", yield: 1, yieldUnit: "vela 156ml", cureDays: 14, components: [{ sku: "CER-SOJ-01", name: "Cera de Soja Ecosoya", qty: 0.142, unit: "kg", loss: 3 }, { sku: "ESS-BAU-AM", name: "Essencia Baunilha & Ambar", qty: 12, unit: "ml", loss: 2 }, { sku: "VID-NAD-156", name: "Vidro Nadir 156ml", qty: 1, unit: "un", loss: 1 }], tests: [{ date: "02/05", qty: 6, result: "aprovado", note: "Doce equilibrado, ambar persistente." }] },
  { id: "r3", name: "Cedro & Sandalo", product: "VEL-CED-220", productName: "Vela Cedro & Sandalo 220ml", version: "v2", status: "rascunho", yield: 1, yieldUnit: "vela 220ml", cureDays: 14, components: [{ sku: "CER-SOJ-01", name: "Cera de Soja Ecosoya", qty: 0.2, unit: "kg", loss: 3 }, { sku: "ESS-BAU-AM", name: "Essencia base amadeirada", qty: 12, unit: "ml", loss: 2 }], tests: [] },
];

export const DEMO_PRODUCTION: DemoProductionOrder[] = [
  { id: "p1", code: "030100000208", num: "OP-208", product: "VEL-LAV-156", productName: "Vela Lavanda Francesa 156ml", recipe: "Lavanda Francesa", recipeVer: "v3", planned: 40, status: "aguardando_materiais", date: "31/05", resp: "Camila" },
  { id: "p2", code: "030100000207", num: "OP-207", product: "VEL-CED-220", productName: "Vela Cedro & Sandalo 220ml", recipe: "Cedro & Sandalo", recipeVer: "v2", planned: 24, status: "aguardando_materiais", date: "31/05", resp: "Camila" },
  { id: "p3", code: "030100000206", num: "OP-206", product: "VEL-CAP-156", productName: "Vela Capim-Limao 156ml", recipe: "Capim-Limao", recipeVer: "v2", planned: 36, status: "em_producao", date: "30/05", resp: "Camila", progress: 62 },
  { id: "p4", code: "030100000205", num: "OP-205", product: "VEL-BAU-156", productName: "Vela Baunilha & Ambar 156ml", recipe: "Baunilha & Ambar", recipeVer: "v4", planned: 48, status: "em_cura", date: "24/05", resp: "Camila", cureUntil: "07/06", cureDayLeft: 7, lot: "020300000613" },
  { id: "p5", code: "030100000204", num: "OP-204", product: "VEL-LAV-156", productName: "Vela Lavanda Francesa 156ml", recipe: "Lavanda Francesa", recipeVer: "v3", planned: 40, status: "aguardando_revisao", date: "17/05", resp: "Camila", cureUntil: "31/05", cureDayLeft: 0, lot: "020300000598" },
  { id: "p6", code: "030100000203", num: "OP-203", product: "VEL-LAV-156", productName: "Vela Lavanda Francesa 156ml", recipe: "Lavanda Francesa", recipeVer: "v3", planned: 40, status: "liberada", date: "12/05", resp: "Camila", lot: "020300000571" },
];

export const LABEL_SHEETS: DemoLabelSheet[] = [
  { id: "a4-3x8", name: "Folha A4 - grade 3x8", code: "A4-3x8", cols: 3, rows: 8, labelW: 63.5, labelH: 33.9 },
  { id: "a4-4x10", name: "Pimaco A4056", code: "A4056", cols: 4, rows: 10, labelW: 48, labelH: 25 },
  { id: "roll-50x30", name: "Rolo termico 50x30", code: "ROLO-50x30", cols: 1, rows: 1, labelW: 50, labelH: 30, roll: true },
];

export const LABEL_TEMPLATES = [
  { id: "item", name: "Etiqueta de item", target: "item", icon: "tag", size: "50x30mm" },
  { id: "pedido", name: "Etiqueta de pedido", target: "pedido", icon: "pedidos", size: "100x60mm" },
  { id: "op", name: "Etiqueta de OP", target: "op", icon: "producao", size: "60x40mm" },
] as const;

export const AI_TEMPLATES = [
  { id: "catalogo", name: "Descricao de catalogo", icon: "fileText", desc: "Texto comercial curto e longo" },
  { id: "lancamento", name: "Legenda de lancamento", icon: "ia", desc: "Post para Instagram" },
  { id: "pos-venda", name: "Mensagem de pos-venda", icon: "pedidos", desc: "WhatsApp apos envio" },
  { id: "cartao", name: "Texto de cartao", icon: "tag", desc: "Mensagem para a caixa" },
];

export const BRAND_VOICE = {
  personality: "Acolhedora, sofisticada, serena, poetica, minimalista",
  promise: "Transformar o fim do dia em um ritual de paz e autocuidado",
  prefer: ["pausa", "respiro", "aconchego", "calmaria", "refugio", "cuidado"],
  avoid: ["compre agora", "promocao imperdivel", "terapeutico", "garantido"],
};

export const AI_HISTORY = [
  { id: "a1", product: "Vela Lavanda Francesa", type: "Descricao de catalogo", status: "aprovado", when: "30/05", text: "Quando a noite chega, a Lavanda Francesa convida a uma pausa. Um aroma sereno para fechar o dia com cuidado." },
  { id: "a2", product: "Vela Baunilha & Ambar", type: "Legenda de lancamento", status: "usado", when: "28/05", text: "Chegou para morar nos seus fins de tarde: um refugio doce para desacelerar." },
  { id: "a3", product: "Vela Capim-Limao", type: "Post de reposicao", status: "rascunho", when: "27/05", text: "O Capim-Limao voltou ao atelie: leve, citrico e cheio de manha." },
];

export const BRAND_PRESETS: BrandTheme[] = [
  { id: "neutro", name: "Neutro claro", mode: "light", radius: "0.5rem", colors: { background: "#FFFFFF", foreground: "#0A0A0B", card: "#FFFFFF", cardForeground: "#0A0A0B", primary: "#18181B", primaryForeground: "#FAFAFA", secondary: "#F4F4F5", secondaryForeground: "#18181B", muted: "#F4F4F5", mutedForeground: "#71717A", accent: "#6D5CE7", accentForeground: "#FFFFFF", border: "#E4E4E7", input: "#E4E4E7", ring: "#A1A1AA", success: "#2F9E5B", warning: "#C97A14", danger: "#D03A2F", info: "#2D6FD6", sidebarBackground: "#FAFAFA" } },
  { id: "ambar", name: "Instante Ambar", mode: "light", radius: "0.875rem", colors: { background: "#FAF7F2", foreground: "#2A211D", card: "#FFFFFF", cardForeground: "#2A211D", primary: "#8A5A44", primaryForeground: "#FFFFFF", secondary: "#E8D7CD", secondaryForeground: "#2A211D", muted: "#F1E9E3", mutedForeground: "#6B5B53", accent: "#C49A6C", accentForeground: "#2A211D", border: "#E2D4C8", input: "#E2D4C8", ring: "#8A5A44", success: "#3F7D58", warning: "#B7791F", danger: "#A94442", info: "#3A6EA5", sidebarBackground: "#2A211D" } },
  { id: "escuro", name: "Neutro escuro", mode: "dark", radius: "0.5rem", colors: { background: "#0E0E11", foreground: "#F4F4F5", card: "#17171B", cardForeground: "#F4F4F5", primary: "#FAFAFA", primaryForeground: "#18181B", secondary: "#26262B", secondaryForeground: "#F4F4F5", muted: "#26262B", mutedForeground: "#9B9BA4", accent: "#8B7CF0", accentForeground: "#0E0E11", border: "#2A2A30", input: "#2E2E34", ring: "#54545C", success: "#4ADE80", warning: "#FBBF24", danger: "#F87171", info: "#60A5FA", sidebarBackground: "#121216" } },
];

export const PRODUCTION_WORKFLOW = [
  { key: "aguardando_materiais", label: "Aguardando material", color: "warn" },
  { key: "em_producao", label: "Em producao", color: "info" },
  { key: "em_cura", label: "Em cura", color: "cure" },
  { key: "aguardando_revisao", label: "Revisao", color: "warn" },
  { key: "liberada", label: "Liberada", color: "ok" },
  { key: "finalizada", label: "Finalizada", color: "neutral" },
] as const;

export function findDemoItem(sku: string) {
  return DEMO_ITEMS.find((item) => item.sku === sku);
}

export function productOptions() {
  return DEMO_ITEMS.filter((item) => item.type === "pa" || item.type === "kit");
}
