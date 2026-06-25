import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { aiGenerations, auditLogs, companySettings, items } from "@/db/schema";
import { requireAppRouteContext } from "@/lib/app-route-context";

export const runtime = "nodejs";

const TEMPLATE_LABELS: Record<string, string> = {
  catalogo: "Descricao de catalogo",
  lancamento: "Legenda de lancamento",
  "pos-venda": "Mensagem de pos-venda",
  cartao: "Texto de cartao",
};

type AiTemplate = { id: string; name: string; desc: string; instructions: string };
type AiSettings = {
  brandVoice: {
    personality: string;
    promise: string;
    prefer: string[];
    avoid: string[];
  };
  context: {
    includeProductData: boolean;
    includeSku: boolean;
  };
  templates: AiTemplate[];
};

const DEFAULT_AI_SETTINGS: AiSettings = {
  brandVoice: {
    personality: "Acolhedora, sofisticada, serena, poetica, minimalista",
    promise: "Transformar o fim do dia em um ritual de paz e autocuidado",
    prefer: ["pausa", "respiro", "aconchego", "calmaria", "refugio", "cuidado"],
    avoid: ["compre agora", "promocao imperdivel", "terapeutico", "garantido"],
  },
  context: {
    includeProductData: true,
    includeSku: true,
  },
  templates: [
    { id: "catalogo", name: "Descricao de catalogo", desc: "Texto comercial curto e longo", instructions: "Escreva uma descricao de catalogo clara, sensorial e objetiva." },
    { id: "lancamento", name: "Legenda de lancamento", desc: "Post para Instagram", instructions: "Escreva uma legenda de lancamento curta para Instagram." },
    { id: "pos-venda", name: "Mensagem de pos-venda", desc: "WhatsApp apos envio", instructions: "Escreva uma mensagem gentil para enviar depois que o pedido for despachado." },
    { id: "cartao", name: "Texto de cartao", desc: "Mensagem para a caixa", instructions: "Escreva um texto curto para cartao impresso dentro da caixa." },
  ],
};

function cleanString(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanWords(value: unknown, fallback: string[]) {
  if (Array.isArray(value)) return value.map((item) => cleanString(item, 60)).filter(Boolean).slice(0, 20);
  if (typeof value === "string") return value.split(",").map((item) => cleanString(item, 60)).filter(Boolean).slice(0, 20);
  return fallback;
}

function cleanTemplates(value: unknown): AiTemplate[] {
  if (!Array.isArray(value)) return DEFAULT_AI_SETTINGS.templates;
  const templates = value.map((entry) => {
    if (!entry || typeof entry !== "object") return null;
    const raw = entry as Partial<AiTemplate>;
    const id = cleanString(raw.id, 40).toLowerCase();
    const name = cleanString(raw.name, 80);
    const desc = cleanString(raw.desc, 160);
    const instructions = cleanString(raw.instructions, 1000);
    if (!id || !name || !instructions) return null;
    return { id, name, desc, instructions };
  }).filter((template): template is AiTemplate => Boolean(template));
  return templates.length ? templates.slice(0, 12) : DEFAULT_AI_SETTINGS.templates;
}

function cleanAiSettings(value: unknown): AiSettings {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const voice = raw.brandVoice && typeof raw.brandVoice === "object" ? raw.brandVoice as Record<string, unknown> : {};
  const context = raw.context && typeof raw.context === "object" ? raw.context as Record<string, unknown> : {};
  return {
    brandVoice: {
      personality: cleanString(voice.personality, 500) || DEFAULT_AI_SETTINGS.brandVoice.personality,
      promise: cleanString(voice.promise, 500) || DEFAULT_AI_SETTINGS.brandVoice.promise,
      prefer: cleanWords(voice.prefer, DEFAULT_AI_SETTINGS.brandVoice.prefer),
      avoid: cleanWords(voice.avoid, DEFAULT_AI_SETTINGS.brandVoice.avoid),
    },
    context: {
      includeProductData: context.includeProductData !== false,
      includeSku: context.includeSku !== false,
    },
    templates: cleanTemplates(raw.templates),
  };
}

async function loadAiSettings(companyId: string) {
  const row = await db.query.companySettings.findFirst({
    where: eq(companySettings.companyId, companyId),
    columns: { settings: true },
  });
  return cleanAiSettings(row?.settings?.ai);
}

async function saveAiSettings(companyId: string, settings: AiSettings) {
  const row = await db.query.companySettings.findFirst({
    where: eq(companySettings.companyId, companyId),
    columns: { settings: true },
  });
  const nextSettings = { ...(row?.settings ?? {}), ai: settings };
  await db.insert(companySettings)
    .values({ companyId, settings: nextSettings })
    .onConflictDoUpdate({
      target: companySettings.companyId,
      set: { settings: nextSettings, updatedAt: new Date() },
    });
}

function fallbackContent(templateKey: string, product: { name: string; variant: string | null; metadata: Record<string, unknown> }, brief: string) {
  const name = `${product.name}${product.variant ? ` ${product.variant}` : ""}`.trim();
  const aroma = typeof product.metadata.aroma === "string" ? product.metadata.aroma.split(",")[0].trim().toLowerCase() : "aroma do atelie";
  const extra = brief ? ` ${brief}` : "";
  if (templateKey === "lancamento") {
    return `Chegou para morar nos seus fins de tarde. ${name} e um convite a desacelerar com notas de ${aroma}. Feito para transformar a casa em um refugio de calma.${extra}`;
  }
  if (templateKey === "pos-venda") {
    return `Oi! Seu pedido com ${name} ja esta a caminho. Preparamos tudo com cuidado, do aroma a embalagem. Que ele traga um momento de pausa quando chegar por ai.${extra}`;
  }
  if (templateKey === "cartao") {
    return `Que este aroma de ${aroma} seja um convite a calmaria. Acenda quando precisar de um respiro. Com carinho, seu atelie.${extra}`;
  }
  return `Quando a noite chega, ${name} convida a uma pausa. Notas de ${aroma} envolvem o ambiente em calmaria, um respiro de cuidado para fechar o dia com leveza.${extra}`;
}

function outputText(payload: unknown) {
  const typed = payload as { output_text?: unknown; output?: Array<{ content?: Array<{ text?: string }> }> };
  if (typeof typed.output_text === "string") return typed.output_text.trim();
  const fragments = typed.output?.flatMap((item) => item.content?.map((content) => content.text).filter(Boolean) ?? []) ?? [];
  return fragments.join("\n").trim();
}

async function generateWithOpenAI(input: {
  templateKey: string;
  template: AiTemplate;
  settings: AiSettings;
  productName: string;
  productSku: string;
  brief: string;
  metadata: Record<string, unknown>;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_TEXT_MODEL || "gpt-5.4-mini";
  if (!apiKey) return { provider: "local_fallback", model: null, text: null };

  const prompt = [
    "Voce escreve textos comerciais em portugues do Brasil para pequenos atelies.",
    `Voz da marca: ${input.settings.brandVoice.personality}.`,
    `Promessa: ${input.settings.brandVoice.promise}.`,
    `Prefira: ${input.settings.brandVoice.prefer.join(", ")}.`,
    `Evite: ${input.settings.brandVoice.avoid.join(", ")}.`,
    "Nao invente beneficios terapeuticos, composicao, prazo, peso ou tempo de queima.",
    "Entregue apenas o texto final, sem titulo tecnico e sem explicacoes.",
    `Tipo: ${input.template.name}.`,
    `Instrucao do template: ${input.template.instructions}.`,
    `Produto: ${input.productName}.`,
    input.settings.context.includeSku ? `SKU: ${input.productSku}.` : "SKU omitido por configuracao.",
    input.settings.context.includeProductData ? `Dados cadastrados: ${JSON.stringify(input.metadata)}.` : "Dados cadastrados omitidos por configuracao.",
    input.brief ? `Briefing: ${input.brief}.` : "Briefing: nenhum.",
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: prompt,
      max_output_tokens: 450,
    }),
  });

  if (!response.ok) {
    throw new Error(`openai_response_failed:${response.status}`);
  }

  const payload = await response.json() as unknown;
  return { provider: "openai", model, text: outputText(payload) };
}

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const rows = await db.query.aiGenerations.findMany({
    where: eq(aiGenerations.companyId, contextResult.context.company.id),
    orderBy: desc(aiGenerations.createdAt),
    limit: 20,
  });
  const settings = await loadAiSettings(contextResult.context.company.id);
  const templateNames = new Map(settings.templates.map((template) => [template.id, template.name]));

  return NextResponse.json({
    history: rows.map((row) => ({
      id: row.id,
      product: row.productName ?? row.productSku ?? "Produto",
      type: templateNames.get(row.templateKey) ?? TEMPLATE_LABELS[row.templateKey] ?? row.templateKey,
      status: row.status,
      when: row.createdAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      text: row.output,
      provider: row.provider,
      model: row.model,
    })),
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_TEXT_MODEL || "gpt-5.4-mini",
    settings,
  });
}

export async function POST(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (body?.mode === "settings") {
    const settings = cleanAiSettings(body.settings);
    await saveAiSettings(context.company.id, settings);
    await db.insert(auditLogs).values({
      companyId: context.company.id,
      actorUserId: context.user.id,
      action: "ai.generate",
      entityType: "company_settings",
      entityId: context.company.id,
      metadata: { operation: "ai_settings_update" },
    });
    return NextResponse.json({ settings });
  }

  const settings = await loadAiSettings(context.company.id);
  const templateKey = cleanString(body?.templateId ?? body?.templateKey, 40) || "catalogo";
  const template = settings.templates.find((item) => item.id === templateKey) ?? settings.templates[0] ?? DEFAULT_AI_SETTINGS.templates[0];
  const productSku = cleanString(body?.productSku, 80);
  const brief = cleanString(body?.brief, 800);

  const product = productSku
    ? await db.query.items.findFirst({
        where: and(eq(items.companyId, context.company.id), eq(items.sku, productSku)),
      })
    : null;

  if (!product) {
    return NextResponse.json({ error: "product_not_found" }, { status: 404 });
  }

  const productName = `${product.name}${product.variant ? ` ${product.variant}` : ""}`.trim();
  const metadata = settings.context.includeProductData ? product.metadata ?? {} : {};
  let provider = "openai";
  let model: string | null = process.env.OPENAI_TEXT_MODEL || "gpt-5.4-mini";
  let text: string | null = null;

  try {
    const generated = await generateWithOpenAI({ templateKey: template.id, template, settings, productName, productSku, brief, metadata });
    provider = generated.provider;
    model = generated.model;
    text = generated.text;
  } catch {
    provider = "local_fallback";
    model = null;
  }

  const output = text || fallbackContent(template.id, product, brief);
  const prompt = JSON.stringify({ templateKey: template.id, productSku, productName, brief, metadata, settings });

  const [generation] = await db.insert(aiGenerations).values({
    companyId: context.company.id,
    generatedByUserId: context.user.id,
    templateKey: template.id,
    productSku,
    productName,
    prompt,
    output,
    provider,
    model,
    status: "draft",
    metadata: { bundledInSubscription: true, settingsSnapshot: settings },
  }).returning();

  await db.insert(auditLogs).values({
    companyId: context.company.id,
    actorUserId: context.user.id,
    action: "ai.generate",
    entityType: "ai_generation",
    entityId: generation.id,
    metadata: { templateKey: template.id, productSku, provider, model, bundledInSubscription: true },
  });

  return NextResponse.json({
    result: output,
    generation: {
      id: generation.id,
      provider,
      model,
      status: generation.status,
    },
  });
}

export async function PATCH(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const id = cleanString(body?.id, 80);
  const output = cleanString(body?.output, 5000);
  if (!id || !output) return NextResponse.json({ error: "invalid_generation" }, { status: 400 });

  const [generation] = await db.update(aiGenerations).set({
    output,
    status: "approved",
    updatedAt: new Date(),
  }).where(and(eq(aiGenerations.id, id), eq(aiGenerations.companyId, context.company.id))).returning();

  if (!generation) return NextResponse.json({ error: "generation_not_found" }, { status: 404 });

  await db.insert(auditLogs).values({
    companyId: context.company.id,
    actorUserId: context.user.id,
    action: "ai.approve",
    entityType: "ai_generation",
    entityId: generation.id,
    metadata: { templateKey: generation.templateKey, productSku: generation.productSku },
  });

  return NextResponse.json({ generation: { id: generation.id, status: generation.status } });
}
