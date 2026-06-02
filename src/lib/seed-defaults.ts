import type { MemberRole } from "@/db/schema";

export const DEFAULT_THEME = {
  id: "atelie-neutral",
  name: "Tema neutro",
  mode: "light",
  radius: "0.5rem",
  colors: {
    background: "#fafafa",
    foreground: "#18181b",
    card: "#ffffff",
    cardForeground: "#18181b",
    primary: "#3f3f46",
    primaryForeground: "#fafafa",
    secondary: "#f4f4f5",
    secondaryForeground: "#18181b",
    muted: "#f4f4f5",
    mutedForeground: "#71717a",
    accent: "#e4e4e7",
    accentForeground: "#18181b",
    border: "#e4e4e7",
    input: "#e4e4e7",
    ring: "#a1a1aa",
    success: "#16a34a",
    warning: "#d97706",
    info: "#2563eb",
    danger: "#dc2626",
    sidebarBackground: "#ffffff",
    sidebarForeground: "#18181b",
  },
};

export const DEFAULT_UNITS = [
  { code: "un", name: "Unidade", kind: "unit" },
  { code: "kg", name: "Quilograma", kind: "mass" },
  { code: "g", name: "Grama", kind: "mass" },
  { code: "ml", name: "Mililitro", kind: "volume" },
  { code: "l", name: "Litro", kind: "volume" },
];

export const DEFAULT_LOCATIONS = [
  { code: "050100000001", name: "Prateleira principal", type: "shelf" },
  { code: "050300000001", name: "Bancada de producao", type: "bench" },
  { code: "050400000001", name: "Area de cura", type: "cure" },
  { code: "050500000001", name: "Expedicao", type: "shipping" },
  { code: "050600000001", name: "Produtos bloqueados", type: "blocked" },
  { code: "050700000001", name: "Estoque de embalagens", type: "packaging" },
];

export const DEFAULT_CHANNELS = [
  { technicalKey: "instagram", name: "Instagram", isExternal: true },
  { technicalKey: "whatsapp", name: "WhatsApp", isExternal: true },
  { technicalKey: "direct", name: "Venda direta", isExternal: false },
  { technicalKey: "marketplace", name: "Marketplace", isExternal: true },
  { technicalKey: "fair", name: "Feira", isExternal: false },
];

export const DEFAULT_WORKFLOWS = [
  {
    entity: "order" as const,
    name: "Pedidos",
    technicalKey: "default_order",
    steps: [
      ["aguardando_pagamento", "Aguardando pagamento", "payment_pending", "warn", true, false],
      ["pago", "Pago", "paid", "info", false, false],
      ["a_separar", "A separar", "pick_pending", "info", false, false],
      ["separando", "Separando", "picking", "info", false, false],
      ["separado", "Separado", "picked", "info", false, false],
      ["embalando", "Embalando", "packing", "info", false, false],
      ["embalado", "Embalado", "packed", "ok", false, false],
      ["pronto_envio", "Pronto para envio", "ready_to_ship", "ok", false, false],
      ["enviado", "Enviado", "shipped", "neutral", false, true],
      ["cancelado", "Cancelado", "cancelled", "bad", false, true],
    ],
  },
  {
    entity: "production" as const,
    name: "Producao",
    technicalKey: "default_production",
    steps: [
      ["aguardando_materiais", "Aguardando materiais", "materials_pending", "warn", true, false],
      ["materiais_separados", "Materiais separados", "materials_picked", "info", false, false],
      ["em_producao", "Em producao", "in_production", "info", false, false],
      ["em_cura", "Em cura", "curing", "cure", false, false],
      ["aguardando_revisao", "Aguardando revisao", "quality_pending", "warn", false, false],
      ["liberada", "Liberada", "released", "ok", false, false],
      ["finalizada", "Finalizada", "done", "neutral", false, true],
    ],
  },
];

export const FIRST_STEPS = [
  ["company", "Configurar dados do atelie", "configuracoes", false],
  ["locations", "Configurar locais de estoque", "configuracoes?tab=locations", false],
  ["units", "Configurar unidades de medida", "configuracoes?tab=units", false],
  ["suppliers", "Cadastrar fornecedores", "fornecedores", false],
  ["raw-materials", "Cadastrar materias-primas", "itens", false],
  ["packaging", "Cadastrar embalagens", "itens", false],
  ["finished-goods", "Cadastrar produtos prontos", "itens", false],
  ["first-recipe", "Criar primeira receita", "receitas", false],
  ["first-purchase", "Receber primeira compra", "estoque", false],
  ["first-production", "Planejar primeira producao", "producao", false],
  ["first-order", "Criar primeiro pedido", "pedidos", false],
  ["labels", "Imprimir primeiras etiquetas", "etiquetas", false],
  ["melhor-envio", "Configurar Melhor Envio", "configuracoes?tab=shipping", true],
  ["brand-voice", "Configurar voz da marca para IA", "ia", true],
] as const;

export type OnboardingInvite = {
  email: string;
  role: MemberRole;
};
