"use client";

import * as React from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Icon,
  Select,
  Textarea,
  toast,
} from "@/components/ui";
import { useItemDirectory } from "@/lib/item-directory";
import type { Go, Route } from "@/lib/types";

const AI_TEMPLATES = [
  { id: "catalogo", name: "Descricao de catalogo", icon: "fileText", desc: "Texto comercial curto e longo", instructions: "Escreva uma descricao de catalogo clara, sensorial e objetiva." },
  { id: "lancamento", name: "Legenda de lancamento", icon: "ia", desc: "Post para Instagram", instructions: "Escreva uma legenda de lancamento curta para Instagram." },
  { id: "pos-venda", name: "Mensagem de pos-venda", icon: "pedidos", desc: "WhatsApp apos envio", instructions: "Escreva uma mensagem gentil para enviar depois que o pedido for despachado." },
  { id: "cartao", name: "Texto de cartao", icon: "tag", desc: "Mensagem para a caixa", instructions: "Escreva um texto curto para cartao impresso dentro da caixa." },
];

const BRAND_VOICE = {
  personality: "Acolhedora, sofisticada, serena, poetica, minimalista",
  promise: "Transformar o fim do dia em um ritual de paz e autocuidado",
  prefer: ["pausa", "respiro", "aconchego", "calmaria", "refugio", "cuidado"],
  avoid: ["compre agora", "promocao imperdivel", "terapeutico", "garantido"],
};

const AI_HISTORY = [
  { id: "a1", product: "Vela Lavanda Francesa", type: "Descricao de catalogo", status: "aprovado", when: "30/05", text: "Quando a noite chega, a Lavanda Francesa convida a uma pausa. Um aroma sereno para fechar o dia com cuidado." },
  { id: "a2", product: "Vela Baunilha & Ambar", type: "Legenda de lancamento", status: "usado", when: "28/05", text: "Chegou para morar nos seus fins de tarde: um refugio doce para desacelerar." },
  { id: "a3", product: "Vela Capim-Limao", type: "Post de reposicao", status: "rascunho", when: "27/05", text: "O Capim-Limao voltou ao atelie: leve, citrico e cheio de manha." },
];

type AiHistoryItem = typeof AI_HISTORY[number] & { provider?: string; model?: string | null };
type AiTemplate = { id: string; name: string; desc: string; instructions: string; icon?: string };
type AiSettings = {
  brandVoice: typeof BRAND_VOICE;
  context: { includeProductData: boolean; includeSku: boolean };
  templates: AiTemplate[];
};

const DEFAULT_AI_SETTINGS: AiSettings = {
  brandVoice: BRAND_VOICE,
  context: { includeProductData: true, includeSku: true },
  templates: AI_TEMPLATES,
};

export function AIContentScreen({ go }: { go: Go; route: Route }) {
  const dir = useItemDirectory();
  const products = dir.products;
  const [templateId, setTemplateId] = React.useState(AI_TEMPLATES[0].id);
  const [productSku, setProductSku] = React.useState("");
  const [brief, setBrief] = React.useState("");
  const [state, setState] = React.useState<"idle" | "generating" | "done">("idle");
  const [result, setResult] = React.useState("");
  const [generationId, setGenerationId] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<AiHistoryItem[]>(AI_HISTORY);
  const [aiStatus, setAiStatus] = React.useState<{ configured: boolean; model: string | null }>({ configured: false, model: null });
  const [settings, setSettings] = React.useState<AiSettings>(DEFAULT_AI_SETTINGS);
  const [savingSettings, setSavingSettings] = React.useState(false);
  const product = products.find((item) => item.sku === productSku) ?? products[0];
  const selectedTemplate = settings.templates.find((template) => template.id === templateId) ?? settings.templates[0] ?? AI_TEMPLATES[0];

  React.useEffect(() => {
    if (!productSku && products.length) setProductSku(products[0].sku);
  }, [productSku, products]);

  React.useEffect(() => {
    let alive = true;
    fetch("/api/app/ai/generate", { cache: "no-store", credentials: "include" })
      .then((res) => res.ok ? res.json() : null)
      .then((payload: { history?: AiHistoryItem[]; openaiConfigured?: boolean; model?: string; settings?: AiSettings } | null) => {
        if (!alive || !payload) return;
        if (payload.history?.length) setHistory(payload.history);
        if (payload.settings) {
          setSettings(payload.settings);
          setTemplateId((current) => (
            payload.settings?.templates.some((template) => template.id === current)
              ? current
              : payload.settings?.templates[0]?.id ?? AI_TEMPLATES[0].id
          ));
        }
        setAiStatus({ configured: !!payload.openaiConfigured, model: payload.model ?? null });
      })
      .catch(() => null);
    return () => { alive = false; };
  }, []);

  const generate = async () => {
    if (!product) {
      toast("Cadastre um produto pronto para gerar conteudo.", "bad");
      return;
    }
    setState("generating");
    setGenerationId(null);
    try {
      const res = await fetch("/api/app/ai/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ templateId, productSku: product.sku, brief }),
      });
      if (!res.ok) throw new Error("ai_generate_failed");
      const payload = await res.json() as { result?: string; generation?: { id?: string; provider?: string; model?: string | null } };
      setResult(payload.result ?? "");
      setGenerationId(payload.generation?.id ?? null);
      setState("done");
      if (payload.generation?.provider === "local_fallback") {
        toast("OpenAI nao configurada; usei o fallback local.", "info");
      }
    } catch {
      setState("idle");
      toast("Nao foi possivel gerar o conteudo.", "bad");
    }
  };

  const copy = async () => {
    await navigator.clipboard?.writeText(result).catch(() => null);
    toast("Texto copiado.", "info");
  };

  const setBrandVoice = (patch: Partial<AiSettings["brandVoice"]>) => {
    setSettings((current) => ({ ...current, brandVoice: { ...current.brandVoice, ...patch } }));
  };
  const setContext = (patch: Partial<AiSettings["context"]>) => {
    setSettings((current) => ({ ...current, context: { ...current.context, ...patch } }));
  };
  const updateTemplate = (patch: Partial<AiTemplate>) => {
    setSettings((current) => ({
      ...current,
      templates: current.templates.map((template) => template.id === selectedTemplate.id ? { ...template, ...patch } : template),
    }));
  };
  const addTemplate = () => {
    const id = `template-${Date.now()}`;
    setSettings((current) => ({
      ...current,
      templates: [...current.templates, { id, name: "Novo template", icon: "fileText", desc: "Template salvo", instructions: "Escreva o texto final seguindo a voz da marca." }],
    }));
    setTemplateId(id);
  };
  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/app/ai/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mode: "settings", settings }),
      });
      if (!res.ok) throw new Error("ai_settings_failed");
      const payload = await res.json() as { settings?: AiSettings };
      if (payload.settings) setSettings(payload.settings);
      toast("Configuracoes de IA salvas.", "ok");
    } catch {
      toast("Nao foi possivel salvar as configuracoes de IA.", "bad");
    } finally {
      setSavingSettings(false);
    }
  };

  const approve = async () => {
    if (!generationId || !result.trim()) {
      toast("Gere um texto antes de aprovar.", "bad");
      return;
    }
    try {
      const res = await fetch("/api/app/ai/generate", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: generationId, output: result }),
      });
      if (!res.ok) throw new Error("ai_approve_failed");
      toast("Texto salvo como aprovado.", "ok");
    } catch {
      toast("Nao foi possivel aprovar o texto.", "bad");
    }
  };

  return (
    <div className="page page--wide fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-h1">Conteudo IA</h1>
          <p className="page-lede">Textos comerciais na voz da marca, sempre editaveis.</p>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <Badge tone={aiStatus.configured ? "ok" : "neutral"} dot>{aiStatus.configured ? "OpenAI ativa" : "fallback local"}</Badge>
          <Button variant="outline" icon="settings" onClick={() => go("configuracoes", { tab: "branding" })}>Voz da marca</Button>
        </div>
      </div>

      <div className="grid ai-grid">
        <div className="grid" style={{ gridTemplateColumns: "1fr", gap: "var(--gap)" }}>
          <Card>
            <CardContent>
              <div className="block-label">Tipo de conteudo</div>
              <div className="grid cols-2" style={{ gap: 9, marginBottom: 18 }}>
                {settings.templates.map((template) => (
                  <button key={template.id} onClick={() => setTemplateId(template.id)} className={`ai-template ${templateId === template.id ? "ai-template--on" : ""}`}>
                    <div className="chip chip--brand" style={{ width: 28, height: 28, borderRadius: 7, marginBottom: 8 }}><Icon name={template.icon ?? "fileText"} size={14} /></div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{template.name}</div>
                    <div className="muted" style={{ fontSize: 11.5, marginTop: 1 }}>{template.desc}</div>
                  </button>
                ))}
              </div>
              <div className="row between" style={{ marginBottom: 8 }}>
                <div className="block-label" style={{ margin: 0 }}>Template selecionado</div>
                <Button variant="outline" size="sm" icon="plus" onClick={addTemplate}>Novo template</Button>
              </div>
              <div className="grid cols-2" style={{ gap: 10, marginBottom: 14 }}>
                <Textarea value={selectedTemplate.name} onChange={(event) => updateTemplate({ name: event.target.value })} style={{ minHeight: 42 }} />
                <Textarea value={selectedTemplate.desc} onChange={(event) => updateTemplate({ desc: event.target.value })} style={{ minHeight: 42 }} />
              </div>
              <Textarea value={selectedTemplate.instructions} onChange={(event) => updateTemplate({ instructions: event.target.value })} style={{ minHeight: 78, marginBottom: 14 }} />

              <div className="grid cols-2" style={{ gap: 12, marginBottom: 14 }}>
                <div>
                  <div className="block-label">Produto</div>
                  <Select value={productSku} onChange={setProductSku} options={products.map((item) => ({ value: item.sku, label: `${item.name} ${item.variant}` }))} />
                </div>
                <div>
                  <div className="block-label">Contexto usado</div>
                  <div className="row" style={{ gap: 6, flexWrap: "wrap", paddingTop: 4 }}>
                    {settings.context.includeProductData ? <Badge tone="neutral">{product.collection}</Badge> : <Badge tone="neutral">dados omitidos</Badge>}
                    {settings.context.includeProductData && <Badge tone="neutral">{product.aroma?.split(",")[0]}</Badge>}
                  </div>
                  <label className="row" style={{ gap: 6, fontSize: 12.5, marginTop: 8 }}>
                    <input type="checkbox" checked={settings.context.includeProductData} onChange={(event) => setContext({ includeProductData: event.target.checked })} />
                    Usar dados cadastrados do produto
                  </label>
                  <label className="row" style={{ gap: 6, fontSize: 12.5, marginTop: 5 }}>
                    <input type="checkbox" checked={settings.context.includeSku} onChange={(event) => setContext({ includeSku: event.target.checked })} />
                    Incluir SKU no prompt
                  </label>
                </div>
              </div>

              <div className="block-label">Briefing opcional</div>
              <Textarea placeholder="Ex.: foco em presente, tom mais intimo..." value={brief} onChange={(event) => setBrief(event.target.value)} style={{ minHeight: 64, marginBottom: 14 }} />

              <Button variant="brand" icon="wand" onClick={generate} disabled={state === "generating"}>
                {state === "generating" ? "Gerando..." : result ? "Gerar novamente" : "Gerar conteudo"}
              </Button>
            </CardContent>
          </Card>

          {state !== "idle" && (
            <Card>
              <CardHeader>
                <CardTitle><span className="row" style={{ gap: 8 }}><Icon name="ia" size={16} className="om-text--cure" />Resultado</span></CardTitle>
                {state === "done" && <Badge tone="neutral">rascunho</Badge>}
              </CardHeader>
              <CardContent style={{ paddingTop: 6 }}>
                {state === "generating" ? (
                  <div className="ai-loading">
                    <span style={{ width: "92%" }} />
                    <span style={{ width: "100%" }} />
                    <span style={{ width: "78%" }} />
                    <div className="muted row" style={{ gap: 8, fontSize: 12.5, marginTop: 6 }}><Icon name="wand" size={14} /> Escrevendo na voz da marca...</div>
                  </div>
                ) : (
                  <>
                    <Textarea value={result} onChange={(event) => setResult(event.target.value)} style={{ minHeight: 120, fontSize: 14.5, lineHeight: 1.6 }} />
                    <div className="row" style={{ gap: 9, marginTop: 12, flexWrap: "wrap" }}>
                      <Button variant="default" icon="copy" onClick={copy}>Copiar</Button>
                      <Button variant="outline" icon="check" onClick={approve}>Salvar aprovado</Button>
                      <Button variant="ghost" icon="refresh" onClick={generate}>Variacao</Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid" style={{ gridTemplateColumns: "1fr", gap: "var(--gap)" }}>
          <Card>
            <CardHeader><CardTitle>Voz da marca</CardTitle><Button variant="outline" size="sm" icon="check" disabled={savingSettings} onClick={saveSettings}>Salvar</Button></CardHeader>
            <CardContent style={{ paddingTop: 6 }}>
              <div className="block-label">Personalidade</div>
              <Textarea value={settings.brandVoice.personality} onChange={(event) => setBrandVoice({ personality: event.target.value })} style={{ minHeight: 58, marginBottom: 10 }} />
              <div className="block-label">Promessa</div>
              <Textarea value={settings.brandVoice.promise} onChange={(event) => setBrandVoice({ promise: event.target.value })} style={{ minHeight: 58, marginBottom: 14 }} />
              <div className="block-label">Palavras preferidas</div>
              <Textarea value={settings.brandVoice.prefer.join(", ")} onChange={(event) => setBrandVoice({ prefer: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} style={{ minHeight: 48, marginBottom: 10 }} />
              <div className="row" style={{ gap: 5, flexWrap: "wrap", marginBottom: 12 }}>{settings.brandVoice.prefer.map((word) => <Badge key={word} tone="ok">{word}</Badge>)}</div>
              <div className="block-label">Evitar</div>
              <Textarea value={settings.brandVoice.avoid.join(", ")} onChange={(event) => setBrandVoice({ avoid: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} style={{ minHeight: 48, marginBottom: 10 }} />
              <div className="row" style={{ gap: 5, flexWrap: "wrap" }}>{settings.brandVoice.avoid.map((word) => <Badge key={word} tone="bad">{word}</Badge>)}</div>
              <div style={{ background: "hsl(var(--warn-bg))", color: "hsl(var(--warn))", padding: "9px 11px", borderRadius: 8, fontSize: 12, marginTop: 14, display: "flex", gap: 7 }}>
                <Icon name="lock" size={14} /> A IA nao inventa tempo de queima, beneficios ou composicao nao cadastrados.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Historico</CardTitle><Button variant="ghost" size="sm">Ver tudo</Button></CardHeader>
            <CardContent style={{ paddingTop: 4 }}>
              {history.map((item) => (
                <div key={item.id} className="lrow" style={{ alignItems: "flex-start" }}>
                  <div className="lrow-main">
                    <div className="lrow-title">{item.product}</div>
                    <div className="lrow-sub" style={{ marginBottom: 5 }}>{item.type} - {item.when}</div>
                    <div style={{ fontSize: 12.5, color: "hsl(var(--muted-foreground))", lineHeight: 1.5 }}>{item.text}</div>
                  </div>
                  <Badge tone={item.status === "aprovado" ? "ok" : item.status === "usado" ? "info" : "neutral"}>{item.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
