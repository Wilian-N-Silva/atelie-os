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
import { AI_HISTORY, AI_TEMPLATES, BRAND_VOICE, productOptions } from "@/lib/screen-fixtures";
import type { Go, Route } from "@/lib/types";

function buildContent(templateId: string, product: ReturnType<typeof productOptions>[number], brief: string) {
  const aroma = (product.aroma || "aroma do atelie").split(",")[0].trim().toLowerCase();
  const name = `${product.name} ${product.variant}`;
  const collection = product.collection || "Atelie";
  const extra = brief.trim() ? ` ${brief.trim()}` : "";

  if (templateId === "lancamento") {
    return `Chegou para morar nos seus fins de tarde. ${name} e um convite a desacelerar com notas de ${aroma}. Da colecao ${collection}, feito para transformar a casa em um refugio de calma.${extra}`;
  }
  if (templateId === "pos-venda") {
    return `Oi! Seu pedido com ${name} ja esta a caminho. Preparamos tudo com cuidado, do aroma a embalagem. Que ele traga um momento de pausa quando chegar por ai.${extra}`;
  }
  if (templateId === "cartao") {
    return `Que este aroma de ${aroma} seja um convite a calmaria. Acenda quando precisar de um respiro. Com carinho, Instante Ambar.${extra}`;
  }
  return `Quando a noite chega, ${name} convida a uma pausa. Notas de ${aroma} envolvem o ambiente em calmaria, um respiro de cuidado para fechar o dia com leveza.${extra}`;
}

export function AIContentScreen({ go }: { go: Go; route: Route }) {
  const products = productOptions();
  const [templateId, setTemplateId] = React.useState(AI_TEMPLATES[0].id);
  const [productSku, setProductSku] = React.useState(products[0]?.sku ?? "");
  const [brief, setBrief] = React.useState("");
  const [state, setState] = React.useState<"idle" | "generating" | "done">("idle");
  const [result, setResult] = React.useState("");
  const product = products.find((item) => item.sku === productSku) ?? products[0];

  const generate = () => {
    setState("generating");
    window.setTimeout(() => {
      setResult(buildContent(templateId, product, brief));
      setState("done");
    }, 450);
  };

  const copy = async () => {
    await navigator.clipboard?.writeText(result).catch(() => null);
    toast("Texto copiado.", "info");
  };

  return (
    <div className="page page--wide fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-h1">Conteudo IA</h1>
          <p className="page-lede">Textos comerciais na voz da marca, sempre editaveis.</p>
        </div>
        <Button variant="outline" icon="settings" onClick={() => go("configuracoes", { tab: "branding" })}>Voz da marca</Button>
      </div>

      <div className="grid ai-grid">
        <div className="grid" style={{ gridTemplateColumns: "1fr", gap: "var(--gap)" }}>
          <Card>
            <CardContent>
              <div className="block-label">Tipo de conteudo</div>
              <div className="grid cols-2" style={{ gap: 9, marginBottom: 18 }}>
                {AI_TEMPLATES.map((template) => (
                  <button key={template.id} onClick={() => setTemplateId(template.id)} className={`ai-template ${templateId === template.id ? "ai-template--on" : ""}`}>
                    <div className="chip chip--brand" style={{ width: 28, height: 28, borderRadius: 7, marginBottom: 8 }}><Icon name={template.icon} size={14} /></div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{template.name}</div>
                    <div className="muted" style={{ fontSize: 11.5, marginTop: 1 }}>{template.desc}</div>
                  </button>
                ))}
              </div>

              <div className="grid cols-2" style={{ gap: 12, marginBottom: 14 }}>
                <div>
                  <div className="block-label">Produto</div>
                  <Select value={productSku} onChange={setProductSku} options={products.map((item) => ({ value: item.sku, label: `${item.name} ${item.variant}` }))} />
                </div>
                <div>
                  <div className="block-label">Contexto usado</div>
                  <div className="row" style={{ gap: 6, flexWrap: "wrap", paddingTop: 4 }}>
                    <Badge tone="neutral">{product.collection}</Badge>
                    <Badge tone="neutral">{product.aroma?.split(",")[0]}</Badge>
                  </div>
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
                      <Button variant="outline" icon="check" onClick={() => toast("Texto salvo como aprovado.", "info")}>Salvar aprovado</Button>
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
            <CardHeader><CardTitle>Voz da marca</CardTitle></CardHeader>
            <CardContent style={{ paddingTop: 6 }}>
              <div style={{ fontSize: 13, lineHeight: 1.55, marginBottom: 12 }}><span className="muted">Personalidade - </span>{BRAND_VOICE.personality}</div>
              <div style={{ fontSize: 13, lineHeight: 1.55, marginBottom: 14 }}><span className="muted">Promessa - </span>{BRAND_VOICE.promise}</div>
              <div className="block-label">Palavras preferidas</div>
              <div className="row" style={{ gap: 5, flexWrap: "wrap", marginBottom: 12 }}>{BRAND_VOICE.prefer.map((word) => <Badge key={word} tone="ok">{word}</Badge>)}</div>
              <div className="block-label">Evitar</div>
              <div className="row" style={{ gap: 5, flexWrap: "wrap" }}>{BRAND_VOICE.avoid.map((word) => <Badge key={word} tone="bad">{word}</Badge>)}</div>
              <div style={{ background: "hsl(var(--warn-bg))", color: "hsl(var(--warn))", padding: "9px 11px", borderRadius: 8, fontSize: 12, marginTop: 14, display: "flex", gap: 7 }}>
                <Icon name="lock" size={14} /> A IA nao inventa tempo de queima, beneficios ou composicao nao cadastrados.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Historico</CardTitle><Button variant="ghost" size="sm">Ver tudo</Button></CardHeader>
            <CardContent style={{ paddingTop: 4 }}>
              {AI_HISTORY.map((item) => (
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
