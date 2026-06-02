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
