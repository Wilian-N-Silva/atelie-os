/* ============================================================
   data.ts — Instante Âmbar sample data
   Realistic BRL data for an artisanal candle atelier. Ported from
   the design prototype's data.js (window.DB) into a typed module.
   ============================================================ */

export const BRL = (n: number) =>
  "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const num = (n: number, d = 0) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

export type Tone = "ok" | "warn" | "info" | "bad" | "cure" | "neutral";

export interface StatusMeta { label: string; tone: Tone; step?: number }

export const ORDER_STATUS: Record<string, StatusMeta> = {
  aguardando_pagamento: { label: "Aguardando pagamento", tone: "warn", step: 0 },
  pago: { label: "Pago", tone: "info", step: 1 },
  a_separar: { label: "A separar", tone: "info", step: 2 },
  separando: { label: "Separando", tone: "info", step: 3 },
  separado: { label: "Separado", tone: "info", step: 4 },
  embalando: { label: "Embalando", tone: "info", step: 5 },
  embalado: { label: "Embalado", tone: "ok", step: 6 },
  pronto_envio: { label: "Pronto p/ envio", tone: "ok", step: 7 },
  enviado: { label: "Enviado", tone: "neutral", step: 8 },
  entregue: { label: "Entregue", tone: "ok", step: 9 },
  cancelado: { label: "Cancelado", tone: "bad", step: -1 },
};

export const PROD_STATUS: Record<string, StatusMeta> = {
  aguardando_materiais: { label: "Aguardando materiais", tone: "warn" },
  materiais_separados: { label: "Materiais separados", tone: "info" },
  em_producao: { label: "Em produção", tone: "info" },
  em_cura: { label: "Em cura", tone: "cure" },
  aguardando_revisao: { label: "Aguardando revisão", tone: "warn" },
  liberada: { label: "Liberada", tone: "ok" },
  finalizada: { label: "Finalizada", tone: "neutral" },
};

export const CHANNELS: Record<string, string> = {
  instagram: "Instagram", whatsapp: "WhatsApp", mercadolivre: "Mercado Livre",
  shopee: "Shopee", feira: "Feira", direta: "Venda direta", tiktok: "TikTok Shop",
};

export interface Item {
  code: string; sku: string; name: string; variant: string;
  type: "pa" | "mp" | "emb" | "kit"; cat: string; unit: string;
  min: number; phys: number; reserved: number; cure: number; blocked: number;
  costAvg: number; priceSugg: number; price: number; status: string;
  available: number;
  weightG?: number; packWeightG?: number; dims?: string; packDims?: string;
  fragile?: boolean; sell?: boolean; cureDays?: number; aroma?: string; collection?: string;
}

const rawItems: Omit<Item, "available">[] = [
  { code: "010300001287", sku: "VEL-LAV-156", name: "Vela Lavanda Francesa", variant: "156ml", type: "pa", cat: "Velas", unit: "un", min: 24, phys: 62, reserved: 8, cure: 30, blocked: 0, costAvg: 18.40, priceSugg: 74, price: 69, weightG: 380, packWeightG: 520, dims: "9×9×9", packDims: "12×12×12", fragile: true, sell: true, status: "ativo", cureDays: 14, aroma: "Lavanda francesa, bergamota, almíscar branco", collection: "Refúgio" },
  { code: "010300001294", sku: "VEL-CAP-156", name: "Vela Capim-Limão", variant: "156ml", type: "pa", cat: "Velas", unit: "un", min: 24, phys: 41, reserved: 5, cure: 0, blocked: 0, costAvg: 17.90, priceSugg: 74, price: 69, weightG: 380, packWeightG: 520, dims: "9×9×9", packDims: "12×12×12", fragile: true, sell: true, status: "ativo", cureDays: 14, aroma: "Capim-limão, gengibre, folha verde", collection: "Manhã" },
  { code: "010300001307", sku: "VEL-BAU-156", name: "Vela Baunilha & Âmbar", variant: "156ml", type: "pa", cat: "Velas", unit: "un", min: 24, phys: 18, reserved: 2, cure: 48, blocked: 0, costAvg: 19.10, priceSugg: 79, price: 74, weightG: 380, packWeightG: 520, dims: "9×9×9", packDims: "12×12×12", fragile: true, sell: true, status: "ativo", cureDays: 14, aroma: "Baunilha bourbon, âmbar, sândalo", collection: "Refúgio" },
  { code: "010300001314", sku: "VEL-CED-220", name: "Vela Cedro & Sândalo", variant: "220ml", type: "pa", cat: "Velas", unit: "un", min: 18, phys: 9, reserved: 0, cure: 0, blocked: 3, costAvg: 24.60, priceSugg: 98, price: 92, weightG: 520, packWeightG: 680, dims: "10×10×11", packDims: "13×13×13", fragile: true, sell: true, status: "ativo", cureDays: 14, aroma: "Cedro, sândalo, vetiver", collection: "Floresta" },
  { code: "010300001321", sku: "VEL-FLO-156", name: "Vela Flor de Laranjeira", variant: "156ml", type: "pa", cat: "Velas", unit: "un", min: 24, phys: 37, reserved: 6, cure: 0, blocked: 0, costAvg: 18.20, priceSugg: 74, price: 69, weightG: 380, packWeightG: 520, dims: "9×9×9", packDims: "12×12×12", fragile: true, sell: true, status: "ativo", cureDays: 14, aroma: "Flor de laranjeira, néroli, mel", collection: "Manhã" },
  { code: "010300001338", sku: "VEL-EUC-220", name: "Vela Eucalipto & Menta", variant: "220ml", type: "pa", cat: "Velas", unit: "un", min: 18, phys: 22, reserved: 1, cure: 0, blocked: 0, costAvg: 24.10, priceSugg: 98, price: 92, weightG: 520, packWeightG: 680, dims: "10×10×11", packDims: "13×13×13", fragile: true, sell: true, status: "ativo", cureDays: 14, aroma: "Eucalipto, menta, alecrim", collection: "Floresta" },
  { code: "010400000452", sku: "KIT-RIT-003", name: "Kit Ritual Noturno", variant: "3 velas", type: "kit", cat: "Kits", unit: "un", min: 8, phys: 11, reserved: 3, cure: 0, blocked: 0, costAvg: 58.90, priceSugg: 219, price: 198, weightG: 1180, packWeightG: 1480, dims: "—", packDims: "30×12×12", fragile: true, sell: true, status: "ativo", cureDays: 0, aroma: "Lavanda · Baunilha & Âmbar · Cedro", collection: "Refúgio" },
  { code: "010100000018", sku: "CER-SOJ-01", name: "Cera de Soja Ecosoya", variant: "sc 10kg", type: "mp", cat: "Cera", unit: "kg", min: 8, phys: 14.2, reserved: 0, cure: 0, blocked: 0, costAvg: 32.50, priceSugg: 0, price: 0, status: "ativo" },
  { code: "010100000025", sku: "ESS-LAV-FR", name: "Essência Lavanda Francesa", variant: "1L", type: "mp", cat: "Essências", unit: "ml", min: 600, phys: 430, reserved: 0, cure: 0, blocked: 0, costAvg: 0.42, priceSugg: 0, price: 0, status: "ativo" },
  { code: "010100000032", sku: "ESS-CAP-LM", name: "Essência Capim-Limão", variant: "1L", type: "mp", cat: "Essências", unit: "ml", min: 600, phys: 880, reserved: 0, cure: 0, blocked: 0, costAvg: 0.38, priceSugg: 0, price: 0, status: "ativo" },
  { code: "010100000049", sku: "ESS-BAU-AM", name: "Essência Baunilha & Âmbar", variant: "1L", type: "mp", cat: "Essências", unit: "ml", min: 600, phys: 510, reserved: 0, cure: 0, blocked: 0, costAvg: 0.55, priceSugg: 0, price: 0, status: "ativo" },
  { code: "010100000063", sku: "ESS-CED-SA", name: "Essência Cedro & Sândalo", variant: "1L", type: "mp", cat: "Essências", unit: "ml", min: 500, phys: 240, reserved: 0, cure: 0, blocked: 0, costAvg: 0.61, priceSugg: 0, price: 0, status: "ativo" },
  { code: "010100000056", sku: "PAV-ALG-18", name: "Pavio de Algodão 18mm", variant: "rolo", type: "mp", cat: "Pavios", unit: "un", min: 200, phys: 540, reserved: 0, cure: 0, blocked: 0, costAvg: 0.85, priceSugg: 0, price: 0, status: "ativo" },
  { code: "010200000011", sku: "VID-NAD-156", name: "Vidro Nadir 156ml", variant: "âmbar", type: "emb", cat: "Vidros", unit: "un", min: 60, phys: 88, reserved: 0, cure: 0, blocked: 0, costAvg: 4.20, priceSugg: 0, price: 0, status: "ativo" },
  { code: "010200000028", sku: "VID-NAD-220", name: "Vidro Nadir 220ml", variant: "âmbar", type: "emb", cat: "Vidros", unit: "un", min: 48, phys: 31, reserved: 0, cure: 0, blocked: 0, costAvg: 5.10, priceSugg: 0, price: 0, status: "ativo" },
  { code: "010200000035", sku: "TMP-PIN-052", name: "Tampa Pinus 52mm", variant: "natural", type: "emb", cat: "Tampas", unit: "un", min: 120, phys: 96, reserved: 0, cure: 0, blocked: 0, costAvg: 1.60, priceSugg: 0, price: 0, status: "ativo" },
  { code: "010200000042", sku: "CXA-KFT-121212", name: "Caixa Kraft 12×12×12", variant: "parda", type: "emb", cat: "Caixas", unit: "un", min: 100, phys: 240, reserved: 0, cure: 0, blocked: 0, costAvg: 2.30, priceSugg: 0, price: 0, status: "ativo" },
  { code: "010200000059", sku: "CRT-AGR-01", name: "Cartão de Agradecimento", variant: "kraft", type: "emb", cat: "Brindes", unit: "un", min: 150, phys: 410, reserved: 0, cure: 0, blocked: 0, costAvg: 0.65, priceSugg: 0, price: 0, status: "ativo" },
];

export const items: Item[] = rawItems.map((i) => ({
  ...i,
  available: Math.max(0, i.phys - i.reserved - i.cure - i.blocked),
}));

export const findItem = (sku: string) => items.find((i) => i.sku === sku);

export interface OrderLine { sku: string; qty: number }
export interface Order {
  id: string; code: string; num: string; channel: string; extNum: string | null;
  customer: string; customerName: string; city: string; status: string; payment: string;
  createdAt: string; freight: number; discount: number; total: number;
  items: OrderLine[]; tracking: string | null; note: string | null;
}

export const orders: Order[] = [
  { id: "o1", code: "040100000931", num: "#1042", channel: "instagram", extNum: null, customer: "Marina Alves", customerName: "Marina Alves", city: "São Paulo · SP", status: "a_separar", payment: "pago", createdAt: "31/05 09:12", freight: 24.90, discount: 0, total: 162.90, items: [{ sku: "VEL-LAV-156", qty: 1 }, { sku: "VEL-BAU-156", qty: 1 }], tracking: null, note: "Cliente pediu cartão escrito à mão." },
  { id: "o2", code: "040100000932", num: "#1043", channel: "whatsapp", extNum: null, customer: "Beatriz Lemos", customerName: "Beatriz Lemos", city: "Campinas · SP", status: "a_separar", payment: "pago", createdAt: "31/05 08:40", freight: 22.00, discount: 10, total: 259.00, items: [{ sku: "KIT-RIT-003", qty: 1 }, { sku: "VEL-CAP-156", qty: 1 }], tracking: null, note: null },
  { id: "o3", code: "040300000118", num: "ML-88231", channel: "mercadolivre", extNum: "2000-8841-2231", customer: "João P.", customerName: "João Pereira", city: "Rio de Janeiro · RJ", status: "pago", payment: "pago", createdAt: "31/05 07:55", freight: 0, discount: 0, total: 138.00, items: [{ sku: "VEL-CED-220", qty: 1 }, { sku: "VEL-EUC-220", qty: 1 }], tracking: null, note: "Etiqueta ML anexada (PDF)." },
  { id: "o4", code: "040100000930", num: "#1041", channel: "instagram", extNum: null, customer: "Carla Souza", customerName: "Carla Souza", city: "Santo André · SP", status: "separado", payment: "pago", createdAt: "30/05 18:22", freight: 24.90, discount: 0, total: 162.90, items: [{ sku: "VEL-FLO-156", qty: 1 }, { sku: "VEL-LAV-156", qty: 1 }], tracking: null, note: null },
  { id: "o5", code: "040100000929", num: "#1040", channel: "whatsapp", extNum: null, customer: "Renata D.", customerName: "Renata Dias", city: "São Paulo · SP", status: "embalado", payment: "pago", createdAt: "30/05 16:08", freight: 0, discount: 0, total: 198.00, items: [{ sku: "KIT-RIT-003", qty: 1 }], tracking: null, note: "Retirada na feira de sábado." },
  { id: "o6", code: "040100000928", num: "#1039", channel: "direta", extNum: null, customer: "Lúcia M.", customerName: "Lúcia Martins", city: "Sorocaba · SP", status: "pronto_envio", payment: "pago", createdAt: "30/05 11:30", freight: 27.40, discount: 0, total: 211.40, items: [{ sku: "VEL-CED-220", qty: 2 }], tracking: "BR849201773BR", note: null },
  { id: "o7", code: "040200000077", num: "#1038", channel: "shopee", extNum: "24053100AB9", customer: "Paula R.", customerName: "Paula Ribeiro", city: "Curitiba · PR", status: "aguardando_pagamento", payment: "aguardando", createdAt: "30/05 10:02", freight: 19.90, discount: 0, total: 93.90, items: [{ sku: "VEL-CAP-156", qty: 1 }], tracking: null, note: "Aguardando confirmação Shopee." },
  { id: "o8", code: "040100000927", num: "#1037", channel: "instagram", extNum: null, customer: "Helena V.", customerName: "Helena Vargas", city: "Niterói · RJ", status: "enviado", payment: "pago", createdAt: "29/05 14:45", freight: 26.10, discount: 0, total: 165.10, items: [{ sku: "VEL-BAU-156", qty: 1 }, { sku: "VEL-EUC-220", qty: 1 }], tracking: "BR849100021BR", note: null },
];

export interface Production {
  id: string; code: string; num: string; product: string; productName: string;
  recipe: string; recipeVer: string; planned: number; status: string; date: string;
  resp: string; cureUntil: string | null;
  produced?: number; cureDayLeft?: number; lot?: string; progress?: number; short?: boolean;
  missing?: { sku: string; need: number; have: number }[];
}

export const production: Production[] = [
  { id: "p1", code: "030100000208", num: "OP-208", product: "VEL-LAV-156", productName: "Vela Lavanda Francesa 156ml", recipe: "Lavanda Francesa", recipeVer: "v3", planned: 40, status: "aguardando_materiais", date: "31/05", resp: "Camila", cureUntil: null, missing: [{ sku: "VID-NAD-156", need: 40, have: 88 }], short: false },
  { id: "p2", code: "030100000207", num: "OP-207", product: "VEL-CED-220", productName: "Vela Cedro & Sândalo 220ml", recipe: "Cedro & Sândalo", recipeVer: "v2", planned: 24, status: "aguardando_materiais", date: "31/05", resp: "Camila", cureUntil: null, missing: [{ sku: "VID-NAD-220", need: 24, have: 31 }, { sku: "ESS-CED-SA", need: 288, have: 240 }], short: true },
  { id: "p3", code: "030100000206", num: "OP-206", product: "VEL-CAP-156", productName: "Vela Capim-Limão 156ml", recipe: "Capim-Limão", recipeVer: "v2", planned: 36, status: "em_producao", date: "30/05", resp: "Camila", cureUntil: null, progress: 62 },
  { id: "p4", code: "030100000205", num: "OP-205", product: "VEL-BAU-156", productName: "Vela Baunilha & Âmbar 156ml", recipe: "Baunilha & Âmbar", recipeVer: "v4", planned: 48, produced: 48, status: "em_cura", date: "24/05", resp: "Camila", cureUntil: "07/06", cureDayLeft: 7, lot: "020300000613" },
  { id: "p5", code: "030100000204", num: "OP-204", product: "VEL-LAV-156", productName: "Vela Lavanda Francesa 156ml", recipe: "Lavanda Francesa", recipeVer: "v3", planned: 40, produced: 40, status: "aguardando_revisao", date: "17/05", resp: "Camila", cureUntil: "31/05", cureDayLeft: 0, lot: "020300000598" },
  { id: "p6", code: "030100000203", num: "OP-203", product: "VEL-FLO-156", productName: "Vela Flor de Laranjeira 156ml", recipe: "Flor de Laranjeira", recipeVer: "v1", planned: 36, produced: 35, status: "liberada", date: "12/05", resp: "Camila", cureUntil: "26/05", cureDayLeft: 0, lot: "020300000571" },
];

export interface RecipeComponent { sku: string; name: string; qty: number; unit: string; loss: number; req: boolean }
export interface RecipeTest { date: string; qty: number; result: string; burn: string; scent: string; finish: string; next: string }
export interface Recipe {
  id: string; name: string; product: string; productName: string; version: string;
  status: string; yield: number; yieldUnit: string; cureDays: number; prodMin: number;
  loss: number; cost: number; components: RecipeComponent[]; tests: RecipeTest[];
}

export const recipes: Recipe[] = [
  { id: "r1", name: "Lavanda Francesa", product: "VEL-LAV-156", productName: "Vela Lavanda Francesa 156ml", version: "v3", status: "ativa", yield: 1, yieldUnit: "vela 156ml", cureDays: 14, prodMin: 8, loss: 4, cost: 18.40,
    components: [
      { sku: "CER-SOJ-01", name: "Cera de Soja Ecosoya", qty: 0.142, unit: "kg", loss: 3, req: true },
      { sku: "ESS-LAV-FR", name: "Essência Lavanda Francesa", qty: 11, unit: "ml", loss: 2, req: true },
      { sku: "PAV-ALG-18", name: "Pavio de Algodão 18mm", qty: 1, unit: "un", loss: 0, req: true },
      { sku: "VID-NAD-156", name: "Vidro Nadir 156ml", qty: 1, unit: "un", loss: 1, req: true },
      { sku: "TMP-PIN-052", name: "Tampa Pinus 52mm", qty: 1, unit: "un", loss: 0, req: true },
    ],
    tests: [
      { date: "05/05", qty: 6, result: "aprovado", burn: "Queima limpa, sem fuligem", scent: "Difusão forte a frio e quente", finish: "Topo liso", next: "Manter v3" },
      { date: "21/04", qty: 6, result: "ajustar", burn: "Túnel leve nas bordas", scent: "OK", finish: "Pequena retração", next: "+0.5% essência, baixar temp. de despeje" },
    ] },
  { id: "r2", name: "Capim-Limão", product: "VEL-CAP-156", productName: "Vela Capim-Limão 156ml", version: "v2", status: "ativa", yield: 1, yieldUnit: "vela 156ml", cureDays: 14, prodMin: 8, loss: 4, cost: 17.90,
    components: [
      { sku: "CER-SOJ-01", name: "Cera de Soja Ecosoya", qty: 0.142, unit: "kg", loss: 3, req: true },
      { sku: "ESS-CAP-LM", name: "Essência Capim-Limão", qty: 10, unit: "ml", loss: 2, req: true },
      { sku: "PAV-ALG-18", name: "Pavio de Algodão 18mm", qty: 1, unit: "un", loss: 0, req: true },
      { sku: "VID-NAD-156", name: "Vidro Nadir 156ml", qty: 1, unit: "un", loss: 1, req: true },
      { sku: "TMP-PIN-052", name: "Tampa Pinus 52mm", qty: 1, unit: "un", loss: 0, req: true },
    ], tests: [{ date: "28/04", qty: 6, result: "aprovado", burn: "Queima uniforme", scent: "Cítrico vivo", finish: "Topo liso", next: "Manter" }] },
  { id: "r3", name: "Baunilha & Âmbar", product: "VEL-BAU-156", productName: "Vela Baunilha & Âmbar 156ml", version: "v4", status: "ativa", yield: 1, yieldUnit: "vela 156ml", cureDays: 14, prodMin: 8, loss: 5, cost: 19.10,
    components: [
      { sku: "CER-SOJ-01", name: "Cera de Soja Ecosoya", qty: 0.142, unit: "kg", loss: 3, req: true },
      { sku: "ESS-BAU-AM", name: "Essência Baunilha & Âmbar", qty: 12, unit: "ml", loss: 2, req: true },
      { sku: "PAV-ALG-18", name: "Pavio de Algodão 18mm", qty: 1, unit: "un", loss: 0, req: true },
      { sku: "VID-NAD-156", name: "Vidro Nadir 156ml", qty: 1, unit: "un", loss: 1, req: true },
      { sku: "TMP-PIN-052", name: "Tampa Pinus 52mm", qty: 1, unit: "un", loss: 0, req: true },
    ], tests: [{ date: "02/05", qty: 6, result: "aprovado", burn: "Queima limpa", scent: "Doce equilibrado, âmbar persistente", finish: "Topo liso", next: "Manter v4" }] },
  { id: "r4", name: "Cedro & Sândalo", product: "VEL-CED-220", productName: "Vela Cedro & Sândalo 220ml", version: "v2", status: "ativa", yield: 1, yieldUnit: "vela 220ml", cureDays: 14, prodMin: 6, loss: 5, cost: 24.60,
    components: [
      { sku: "CER-SOJ-01", name: "Cera de Soja Ecosoya", qty: 0.200, unit: "kg", loss: 3, req: true },
      { sku: "ESS-CED-SA", name: "Essência Cedro & Sândalo", qty: 12, unit: "ml", loss: 2, req: true },
      { sku: "PAV-ALG-18", name: "Pavio de Algodão 18mm", qty: 1, unit: "un", loss: 0, req: true },
      { sku: "VID-NAD-220", name: "Vidro Nadir 220ml", qty: 1, unit: "un", loss: 1, req: true },
      { sku: "TMP-PIN-052", name: "Tampa Pinus 52mm", qty: 1, unit: "un", loss: 0, req: true },
    ], tests: [] },
  { id: "r5", name: "Flor de Laranjeira", product: "VEL-FLO-156", productName: "Vela Flor de Laranjeira 156ml", version: "v1", status: "rascunho", yield: 1, yieldUnit: "vela 156ml", cureDays: 14, prodMin: 8, loss: 4, cost: 18.20,
    components: [
      { sku: "CER-SOJ-01", name: "Cera de Soja Ecosoya", qty: 0.142, unit: "kg", loss: 3, req: true },
      { sku: "PAV-ALG-18", name: "Pavio de Algodão 18mm", qty: 1, unit: "un", loss: 0, req: true },
      { sku: "VID-NAD-156", name: "Vidro Nadir 156ml", qty: 1, unit: "un", loss: 1, req: true },
    ], tests: [] },
];

export const finance = { aReceber: 1284.30, aPagar: 642.00, recebidoMes: 8940.00, margemBruta: 0.58 };

/* ---------- dynamic notifications ---------- */
export interface Notification {
  id: string; group: string; severity: "critical" | "warning" | "info";
  icon: string; tone: Tone; title: string; desc: string;
  action: { screen: string; filter?: string }; actionLabel: string; critical?: boolean;
}

export function buildNotifications(): Notification[] {
  const out: Notification[] = [];
  items.filter((i) => i.available < i.min).forEach((i) => {
    const zero = i.available === 0;
    out.push({
      id: "low-" + i.code, group: "estoque",
      severity: zero ? "critical" : "warning",
      icon: zero ? "alertCircle" : "alert", tone: zero ? "bad" : "warn",
      title: zero ? `${i.name} ${i.variant} zerado` : `${i.name} ${i.variant} abaixo do mínimo`,
      desc: `${num(i.available)} ${i.unit} disponível · mínimo ${i.min}`,
      action: { screen: "estoque" }, actionLabel: "Ver estoque", critical: zero,
    });
  });
  production.filter((p) => p.short).forEach((p) => {
    out.push({ id: "prodshort-" + p.id, group: "producao", severity: "warning", icon: "box", tone: "warn",
      title: `${p.num} sem material suficiente`, desc: `${p.productName} · falta insumo para produzir ${p.planned} un`,
      action: { screen: "producao" }, actionLabel: "Resolver produção" });
  });
  production.filter((p) => p.status === "aguardando_revisao").forEach((p) => {
    out.push({ id: "rev-" + p.id, group: "producao", severity: "warning", icon: "listChecks", tone: "warn",
      title: `${p.num} aguardando revisão`, desc: `Cura concluída · lote ${p.lot} pronto para liberar`,
      action: { screen: "producao" }, actionLabel: "Revisar lote" });
  });
  production.filter((p) => p.status === "em_cura" && (p.cureDayLeft ?? 99) <= 7).forEach((p) => {
    out.push({ id: "cure-" + p.id, group: "producao", severity: "info", icon: "thermometer", tone: "cure",
      title: `${p.num} em cura · faltam ${p.cureDayLeft} dias`, desc: `Liberação prevista para ${p.cureUntil}`,
      action: { screen: "producao" }, actionLabel: "Ver produção" });
  });
  const naoSep = orders.filter((o) => ["pago", "a_separar"].includes(o.status));
  if (naoSep.length) out.push({ id: "unpicked", group: "pedidos", severity: "warning", icon: "pedidos", tone: "info",
    title: `${naoSep.length} pedidos pagos a separar`, desc: "Pagos e aguardando separação na bancada",
    action: { screen: "pedidos", filter: "a_separar" }, actionLabel: "Separar pedidos" });
  out.push({ id: "bill", group: "financeiro", severity: "warning", icon: "banknote", tone: "warn",
    title: "Conta a pagar vence amanhã", desc: `Fornecedor de essências · ${BRL(420)}`,
    action: { screen: "hoje" }, actionLabel: "Ver financeiro" });
  out.push({ id: "label", group: "etiquetas", severity: "info", icon: "tag", tone: "info",
    title: "Etiquetas de lote pendentes", desc: "Lote 020300000620 recebido sem etiquetas impressas",
    action: { screen: "etiquetas" }, actionLabel: "Imprimir etiquetas" });
  return out;
}

export const DB = {
  BRL, num, items, orders, production, recipes, finance,
  ORDER_STATUS, PROD_STATUS, CHANNELS, findItem, buildNotifications,
};
