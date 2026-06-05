import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { aiGenerations, auditLogs, items } from "@/db/schema";
import { requireAppRouteContext } from "@/lib/app-route-context";

export const runtime = "nodejs";

const TEMPLATE_LABELS: Record<string, string> = {
  catalogo: "Descricao de catalogo",
  lancamento: "Legenda de lancamento",
  "pos-venda": "Mensagem de pos-venda",
  cartao: "Texto de cartao",
};

function cleanString(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
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
    "Use tom acolhedor, claro e sofisticado. Nao invente beneficios terapeuticos, composicao, prazo, peso ou tempo de queima.",
    "Entregue apenas o texto final, sem titulo tecnico e sem explicacoes.",
    `Tipo: ${TEMPLATE_LABELS[input.templateKey] ?? input.templateKey}.`,
    `Produto: ${input.productName}. SKU: ${input.productSku}.`,
    `Dados cadastrados: ${JSON.stringify(input.metadata)}.`,
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

  return NextResponse.json({
    history: rows.map((row) => ({
      id: row.id,
      product: row.productName ?? row.productSku ?? "Produto",
      type: TEMPLATE_LABELS[row.templateKey] ?? row.templateKey,
      status: row.status,
      when: row.createdAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      text: row.output,
      provider: row.provider,
      model: row.model,
    })),
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_TEXT_MODEL || "gpt-5.4-mini",
  });
}

export async function POST(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const templateKey = cleanString(body?.templateId ?? body?.templateKey, 40) || "catalogo";
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
  const metadata = product.metadata ?? {};
  let provider = "openai";
  let model: string | null = process.env.OPENAI_TEXT_MODEL || "gpt-5.4-mini";
  let text: string | null = null;

  try {
    const generated = await generateWithOpenAI({ templateKey, productName, productSku, brief, metadata });
    provider = generated.provider;
    model = generated.model;
    text = generated.text;
  } catch {
    provider = "local_fallback";
    model = null;
  }

  const output = text || fallbackContent(templateKey, product, brief);
  const prompt = JSON.stringify({ templateKey, productSku, productName, brief, metadata });

  const [generation] = await db.insert(aiGenerations).values({
    companyId: context.company.id,
    generatedByUserId: context.user.id,
    templateKey,
    productSku,
    productName,
    prompt,
    output,
    provider,
    model,
    status: "draft",
    metadata: { bundledInSubscription: true },
  }).returning();

  await db.insert(auditLogs).values({
    companyId: context.company.id,
    actorUserId: context.user.id,
    action: "ai.generate",
    entityType: "ai_generation",
    entityId: generation.id,
    metadata: { templateKey, productSku, provider, model, bundledInSubscription: true },
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
