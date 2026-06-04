export type SeedItem = {
  code: string;
  sku: string;
  name: string;
  variant: string;
  type: "pa" | "mp" | "emb" | "kit";
  cat: string;
  unit: string;
  min: number;
  phys: number;
  reserved: number;
  cure: number;
  blocked: number;
  costAvg: number;
  priceSugg: number;
  price: number;
  status: string;
  weightG?: number;
  packWeightG?: number;
  dims?: string;
  packDims?: string;
  fragile?: boolean;
  sell?: boolean;
  cureDays?: number;
  aroma?: string;
  collection?: string;
};

export const seedItems: SeedItem[] = [
  { code: "010300001287", sku: "VEL-LAV-156", name: "Vela Lavanda Francesa", variant: "156ml", type: "pa", cat: "Velas", unit: "un", min: 24, phys: 62, reserved: 8, cure: 30, blocked: 0, costAvg: 18.40, priceSugg: 74, price: 69, weightG: 380, packWeightG: 520, dims: "9x9x9", packDims: "12x12x12", fragile: true, sell: true, status: "ativo", cureDays: 14, aroma: "Lavanda francesa, bergamota, almiscar branco", collection: "Refugio" },
  { code: "010300001294", sku: "VEL-CAP-156", name: "Vela Capim-Limao", variant: "156ml", type: "pa", cat: "Velas", unit: "un", min: 24, phys: 41, reserved: 5, cure: 0, blocked: 0, costAvg: 17.90, priceSugg: 74, price: 69, weightG: 380, packWeightG: 520, dims: "9x9x9", packDims: "12x12x12", fragile: true, sell: true, status: "ativo", cureDays: 14, aroma: "Capim-limao, gengibre, folha verde", collection: "Manha" },
  { code: "010300001307", sku: "VEL-BAU-156", name: "Vela Baunilha e Ambar", variant: "156ml", type: "pa", cat: "Velas", unit: "un", min: 24, phys: 18, reserved: 2, cure: 48, blocked: 0, costAvg: 19.10, priceSugg: 79, price: 74, weightG: 380, packWeightG: 520, dims: "9x9x9", packDims: "12x12x12", fragile: true, sell: true, status: "ativo", cureDays: 14, aroma: "Baunilha bourbon, ambar, sandalo", collection: "Refugio" },
  { code: "010300001314", sku: "VEL-CED-220", name: "Vela Cedro e Sandalo", variant: "220ml", type: "pa", cat: "Velas", unit: "un", min: 18, phys: 9, reserved: 0, cure: 0, blocked: 3, costAvg: 24.60, priceSugg: 98, price: 92, weightG: 520, packWeightG: 680, dims: "10x10x11", packDims: "13x13x13", fragile: true, sell: true, status: "ativo", cureDays: 14, aroma: "Cedro, sandalo, vetiver", collection: "Floresta" },
  { code: "010300001321", sku: "VEL-FLO-156", name: "Vela Flor de Laranjeira", variant: "156ml", type: "pa", cat: "Velas", unit: "un", min: 24, phys: 37, reserved: 6, cure: 0, blocked: 0, costAvg: 18.20, priceSugg: 74, price: 69, weightG: 380, packWeightG: 520, dims: "9x9x9", packDims: "12x12x12", fragile: true, sell: true, status: "ativo", cureDays: 14, aroma: "Flor de laranjeira, neroli, mel", collection: "Manha" },
  { code: "010300001338", sku: "VEL-EUC-220", name: "Vela Eucalipto e Menta", variant: "220ml", type: "pa", cat: "Velas", unit: "un", min: 18, phys: 22, reserved: 1, cure: 0, blocked: 0, costAvg: 24.10, priceSugg: 98, price: 92, weightG: 520, packWeightG: 680, dims: "10x10x11", packDims: "13x13x13", fragile: true, sell: true, status: "ativo", cureDays: 14, aroma: "Eucalipto, menta, alecrim", collection: "Floresta" },
  { code: "010400000452", sku: "KIT-RIT-003", name: "Kit Ritual Noturno", variant: "3 velas", type: "kit", cat: "Kits", unit: "un", min: 8, phys: 11, reserved: 3, cure: 0, blocked: 0, costAvg: 58.90, priceSugg: 219, price: 198, weightG: 1180, packWeightG: 1480, dims: "-", packDims: "30x12x12", fragile: true, sell: true, status: "ativo", cureDays: 0, aroma: "Lavanda, baunilha e ambar, cedro", collection: "Refugio" },
  { code: "010100000018", sku: "CER-SOJ-01", name: "Cera de Soja Ecosoya", variant: "sc 10kg", type: "mp", cat: "Cera", unit: "kg", min: 8, phys: 14.2, reserved: 0, cure: 0, blocked: 0, costAvg: 32.50, priceSugg: 0, price: 0, status: "ativo" },
  { code: "010100000025", sku: "ESS-LAV-FR", name: "Essencia Lavanda Francesa", variant: "1L", type: "mp", cat: "Essencias", unit: "ml", min: 600, phys: 430, reserved: 0, cure: 0, blocked: 0, costAvg: 0.42, priceSugg: 0, price: 0, status: "ativo" },
  { code: "010100000032", sku: "ESS-CAP-LM", name: "Essencia Capim-Limao", variant: "1L", type: "mp", cat: "Essencias", unit: "ml", min: 600, phys: 880, reserved: 0, cure: 0, blocked: 0, costAvg: 0.38, priceSugg: 0, price: 0, status: "ativo" },
  { code: "010100000049", sku: "ESS-BAU-AM", name: "Essencia Baunilha e Ambar", variant: "1L", type: "mp", cat: "Essencias", unit: "ml", min: 600, phys: 510, reserved: 0, cure: 0, blocked: 0, costAvg: 0.55, priceSugg: 0, price: 0, status: "ativo" },
  { code: "010100000063", sku: "ESS-CED-SA", name: "Essencia Cedro e Sandalo", variant: "1L", type: "mp", cat: "Essencias", unit: "ml", min: 500, phys: 240, reserved: 0, cure: 0, blocked: 0, costAvg: 0.61, priceSugg: 0, price: 0, status: "ativo" },
  { code: "010100000056", sku: "PAV-ALG-18", name: "Pavio de Algodao 18mm", variant: "rolo", type: "mp", cat: "Pavios", unit: "un", min: 200, phys: 540, reserved: 0, cure: 0, blocked: 0, costAvg: 0.85, priceSugg: 0, price: 0, status: "ativo" },
  { code: "010200000011", sku: "VID-NAD-156", name: "Vidro Nadir 156ml", variant: "ambar", type: "emb", cat: "Vidros", unit: "un", min: 60, phys: 88, reserved: 0, cure: 0, blocked: 0, costAvg: 4.20, priceSugg: 0, price: 0, status: "ativo" },
  { code: "010200000028", sku: "VID-NAD-220", name: "Vidro Nadir 220ml", variant: "ambar", type: "emb", cat: "Vidros", unit: "un", min: 48, phys: 31, reserved: 0, cure: 0, blocked: 0, costAvg: 5.10, priceSugg: 0, price: 0, status: "ativo" },
  { code: "010200000035", sku: "TMP-PIN-052", name: "Tampa Pinus 52mm", variant: "natural", type: "emb", cat: "Tampas", unit: "un", min: 120, phys: 96, reserved: 0, cure: 0, blocked: 0, costAvg: 1.60, priceSugg: 0, price: 0, status: "ativo" },
  { code: "010200000042", sku: "CXA-KFT-121212", name: "Caixa Kraft 12x12x12", variant: "parda", type: "emb", cat: "Caixas", unit: "un", min: 100, phys: 240, reserved: 0, cure: 0, blocked: 0, costAvg: 2.30, priceSugg: 0, price: 0, status: "ativo" },
  { code: "010200000059", sku: "CRT-AGR-01", name: "Cartao de Agradecimento", variant: "kraft", type: "emb", cat: "Brindes", unit: "un", min: 150, phys: 410, reserved: 0, cure: 0, blocked: 0, costAvg: 0.65, priceSugg: 0, price: 0, status: "ativo" },
];

export type SeedOrder = {
  code: string;
  number: string;
  channelKey: "instagram" | "whatsapp" | "mercadolivre" | "shopee" | "feira" | "direta";
  customerName: string;
  city: string;
  status: string;
  paymentStatus: "pago" | "aguardando";
  labelKind?: "internal" | "pdf_attached";
  createdAtLabel: string;
  freight: number;
  discount: number;
  total: number;
  items: { sku: string; qty: number; unitPrice?: number }[];
  tracking: string | null;
  note: string | null;
};

export type SeedRecipeComponent = {
  sku: string;
  name: string;
  qty: number;
  unit: string;
  loss: number;
};

export type SeedRecipeTest = {
  date: string;
  qty: number;
  result: "aprovado" | "ajustar" | "reprovado";
  note: string;
};

export type SeedRecipe = {
  name: string;
  productSku: string;
  productName: string;
  version: string;
  status: "ativa" | "rascunho";
  yieldQty: number;
  yieldUnit: string;
  cureDays: number;
  components: SeedRecipeComponent[];
  tests: SeedRecipeTest[];
};

export const seedRecipes: SeedRecipe[] = [
  {
    name: "Lavanda Francesa",
    productSku: "VEL-LAV-156",
    productName: "Vela Lavanda Francesa 156ml",
    version: "v3",
    status: "ativa",
    yieldQty: 1,
    yieldUnit: "vela 156ml",
    cureDays: 14,
    components: [
      { sku: "CER-SOJ-01", name: "Cera de Soja Ecosoya", qty: 0.142, unit: "kg", loss: 3 },
      { sku: "ESS-LAV-FR", name: "Essencia Lavanda Francesa", qty: 11, unit: "ml", loss: 2 },
      { sku: "VID-NAD-156", name: "Vidro Nadir 156ml", qty: 1, unit: "un", loss: 1 },
      { sku: "TMP-PIN-052", name: "Tampa Pinus 52mm", qty: 1, unit: "un", loss: 0 },
    ],
    tests: [{ date: "05/05", qty: 6, result: "aprovado", note: "Queima limpa, topo liso e difusao forte." }],
  },
  {
    name: "Baunilha e Ambar",
    productSku: "VEL-BAU-156",
    productName: "Vela Baunilha e Ambar 156ml",
    version: "v4",
    status: "ativa",
    yieldQty: 1,
    yieldUnit: "vela 156ml",
    cureDays: 14,
    components: [
      { sku: "CER-SOJ-01", name: "Cera de Soja Ecosoya", qty: 0.142, unit: "kg", loss: 3 },
      { sku: "ESS-BAU-AM", name: "Essencia Baunilha e Ambar", qty: 12, unit: "ml", loss: 2 },
      { sku: "VID-NAD-156", name: "Vidro Nadir 156ml", qty: 1, unit: "un", loss: 1 },
    ],
    tests: [{ date: "02/05", qty: 6, result: "aprovado", note: "Doce equilibrado, ambar persistente." }],
  },
  {
    name: "Cedro e Sandalo",
    productSku: "VEL-CED-220",
    productName: "Vela Cedro e Sandalo 220ml",
    version: "v2",
    status: "rascunho",
    yieldQty: 1,
    yieldUnit: "vela 220ml",
    cureDays: 14,
    components: [
      { sku: "CER-SOJ-01", name: "Cera de Soja Ecosoya", qty: 0.2, unit: "kg", loss: 3 },
      { sku: "ESS-CED-SA", name: "Essencia Cedro e Sandalo", qty: 12, unit: "ml", loss: 2 },
    ],
    tests: [],
  },
];

export type SeedProduction = {
  code: string;
  number: string;
  productSku: string;
  productName: string;
  recipeName: string;
  recipeVersion: string;
  planned: number;
  status: string;
  plannedDateLabel: string;
  responsible: string;
  progress?: number;
  lot?: string;
  cureUntil?: string;
  cureDayLeft?: number;
};

export const seedProduction: SeedProduction[] = [
  { code: "030100000208", number: "OP-208", productSku: "VEL-LAV-156", productName: "Vela Lavanda Francesa 156ml", recipeName: "Lavanda Francesa", recipeVersion: "v3", planned: 40, status: "aguardando_materiais", plannedDateLabel: "31/05", responsible: "Camila" },
  { code: "030100000207", number: "OP-207", productSku: "VEL-CED-220", productName: "Vela Cedro e Sandalo 220ml", recipeName: "Cedro e Sandalo", recipeVersion: "v2", planned: 24, status: "aguardando_materiais", plannedDateLabel: "31/05", responsible: "Camila" },
  { code: "030100000206", number: "OP-206", productSku: "VEL-CAP-156", productName: "Vela Capim-Limao 156ml", recipeName: "Capim-Limao", recipeVersion: "v2", planned: 36, status: "em_producao", plannedDateLabel: "30/05", responsible: "Camila", progress: 62 },
  { code: "030100000205", number: "OP-205", productSku: "VEL-BAU-156", productName: "Vela Baunilha e Ambar 156ml", recipeName: "Baunilha e Ambar", recipeVersion: "v4", planned: 48, status: "em_cura", plannedDateLabel: "24/05", responsible: "Camila", cureUntil: "07/06", cureDayLeft: 7, lot: "020300000613" },
  { code: "030100000204", number: "OP-204", productSku: "VEL-LAV-156", productName: "Vela Lavanda Francesa 156ml", recipeName: "Lavanda Francesa", recipeVersion: "v3", planned: 40, status: "aguardando_revisao", plannedDateLabel: "17/05", responsible: "Camila", cureUntil: "31/05", cureDayLeft: 0, lot: "020300000598" },
  { code: "030100000203", number: "OP-203", productSku: "VEL-LAV-156", productName: "Vela Lavanda Francesa 156ml", recipeName: "Lavanda Francesa", recipeVersion: "v3", planned: 40, status: "liberada", plannedDateLabel: "12/05", responsible: "Camila", lot: "020300000571" },
];

export const seedOrders: SeedOrder[] = [
  {
    code: "040100000931",
    number: "#1042",
    channelKey: "instagram",
    customerName: "Marina Alves",
    city: "Sao Paulo - SP",
    status: "a_separar",
    paymentStatus: "pago",
    createdAtLabel: "31/05 09:12",
    freight: 24.9,
    discount: 0,
    total: 162.9,
    items: [{ sku: "VEL-LAV-156", qty: 1 }, { sku: "VEL-BAU-156", qty: 1 }],
    tracking: null,
    note: "Cliente pediu cartao escrito a mao.",
  },
  {
    code: "040100000932",
    number: "#1043",
    channelKey: "whatsapp",
    customerName: "Beatriz Lemos",
    city: "Campinas - SP",
    status: "pago",
    paymentStatus: "pago",
    createdAtLabel: "31/05 08:40",
    freight: 22,
    discount: 10,
    total: 259,
    items: [{ sku: "KIT-RIT-003", qty: 1 }, { sku: "VEL-CAP-156", qty: 1 }],
    tracking: null,
    note: null,
  },
  {
    code: "040300000118",
    number: "ML-88231",
    channelKey: "mercadolivre",
    customerName: "Joao Pereira",
    city: "Rio de Janeiro - RJ",
    status: "separado",
    paymentStatus: "pago",
    labelKind: "pdf_attached",
    createdAtLabel: "30/05 18:22",
    freight: 0,
    discount: 0,
    total: 138,
    items: [{ sku: "VEL-CED-220", qty: 1 }, { sku: "VEL-CAP-156", qty: 1 }],
    tracking: null,
    note: "Etiqueta ML anexada em PDF.",
  },
  {
    code: "040100000929",
    number: "#1040",
    channelKey: "direta",
    customerName: "Renata Dias",
    city: "Sao Paulo - SP",
    status: "pronto_envio",
    paymentStatus: "pago",
    createdAtLabel: "30/05 11:30",
    freight: 27.4,
    discount: 0,
    total: 211.4,
    items: [{ sku: "VEL-CED-220", qty: 2 }],
    tracking: "BR849201773BR",
    note: null,
  },
  {
    code: "040200000077",
    number: "#1038",
    channelKey: "shopee",
    customerName: "Paula Ribeiro",
    city: "Curitiba - PR",
    status: "aguardando_pagamento",
    paymentStatus: "aguardando",
    labelKind: "pdf_attached",
    createdAtLabel: "30/05 10:02",
    freight: 19.9,
    discount: 0,
    total: 93.9,
    items: [{ sku: "VEL-CAP-156", qty: 1 }],
    tracking: null,
    note: "Aguardando confirmacao Shopee.",
  },
  {
    code: "040100000927",
    number: "#1037",
    channelKey: "instagram",
    customerName: "Helena Vargas",
    city: "Niteroi - RJ",
    status: "enviado",
    paymentStatus: "pago",
    createdAtLabel: "29/05 14:45",
    freight: 26.1,
    discount: 0,
    total: 165.1,
    items: [{ sku: "VEL-BAU-156", qty: 1 }, { sku: "VEL-LAV-156", qty: 1 }],
    tracking: "BR849100021BR",
    note: null,
  },
];
