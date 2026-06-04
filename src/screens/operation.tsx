"use client";

import * as React from "react";
import { Barcode } from "@/components/barcode";
import { Icon, cn } from "@/components/ui";
import {
  CHANNELS,
  DEMO_ITEMS,
  DEMO_ORDERS,
  DEMO_PRODUCTION,
  DEMO_RECIPES,
  ORDER_STATUS,
  PROD_STATUS,
  findDemoItem,
  type DemoItem,
  type DemoOrder,
  type DemoProductionOrder,
} from "@/lib/screen-fixtures";
import { loadDemoOrders } from "@/lib/demo-order-overrides";
import { normalizeScanValue, scanCandidates } from "@/lib/scan-candidates";
import type { Go, Route } from "@/lib/types";

const ORDER_PACK_CHECKLIST = [
  "Pedido conferido com a pick list",
  "Produto correto",
  "Aroma correto",
  "Lote correto",
  "Vidro sem defeito e tampa correta",
  "Etiqueta inferior aplicada",
  "Dust cover e cartao incluidos",
  "Produto protegido e caixa fechada",
  "Etiqueta de envio aplicada",
];

const PRODUCTION_CHECKLIST = [
  "Materiais separados e conferidos",
  "Bancada higienizada",
  "Receita e versao conferidas",
  "Quantidade planejada conferida",
  "Cera pesada",
  "Essencia pesada",
  "Embalagens separadas",
  "Temperatura registrada",
  "Lote identificado para cura",
];

type OperationMode = "separacao" | "conferencia" | "embalagem" | "materiais" | "producao";
type ScanStage = "separacao" | "conferencia" | "materiais";
type Feedback = { kind: "ok" | "bad"; name: string; sub: string; fix?: string };
type LogEntry = { kind: "ok" | "bad" | "neutral"; label: string; sku?: string; stage?: ScanStage; time: string };
type StageDone = Record<OperationMode, boolean>;
type CountMap = Record<string, number>;
type CountsByStage = Record<ScanStage, CountMap>;
type OperationLine = {
  sku: string;
  qty: number;
  item: DemoItem;
  name: string;
  detail: string;
  code: string;
  short?: boolean;
  availability?: string;
};

function ProgressRing({ pct, size = 44 }: { pct: number; size?: number }) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#23252c" strokeWidth="5" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--op-amber)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference - (circumference * pct) / 100}
      />
    </svg>
  );
}

function now() {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function isMode(value: unknown): value is OperationMode {
  return value === "separacao" || value === "conferencia" || value === "embalagem" || value === "materiais" || value === "producao";
}

function findOrderByScan(orders: DemoOrder[], raw: string) {
  const values = scanCandidates(raw);
  return orders.find((order) => {
    const num = normalizeScanValue(order.num);
    return values.has(order.id.toLowerCase()) || values.has(num) || values.has(order.code);
  });
}

function findProductionByScan(orders: DemoProductionOrder[], raw: string) {
  const values = scanCandidates(raw);
  return orders.find((order) => {
    const num = normalizeScanValue(order.num);
    return values.has(order.id.toLowerCase()) || values.has(num) || values.has(order.code);
  });
}

function recipeForProduction(order: DemoProductionOrder) {
  return DEMO_RECIPES.find((recipe) => recipe.product === order.product);
}

function productionMaterialLines(order: DemoProductionOrder): OperationLine[] {
  const recipe = recipeForProduction(order);
  if (!recipe) return [];
  return recipe.components.flatMap((component) => {
    const item = findDemoItem(component.sku);
    if (!item) return [];
    const need = Number((component.qty * order.planned * (1 + component.loss / 100)).toFixed(3));
    const short = item.available < need;
    return [{
      sku: component.sku,
      qty: 1,
      item,
      name: component.name,
      detail: `${need} ${component.unit} para ${order.planned} un`,
      code: item.code,
      short,
      availability: `${item.available} ${component.unit} disponivel${short ? " - faltante" : ""}`,
    }];
  });
}

function modeForOrder(order: DemoOrder): OperationMode {
  if (order.status === "pago" || order.status === "a_separar") return "separacao";
  if (order.status === "separado") return "conferencia";
  return "embalagem";
}

function modeForProduction(order: DemoProductionOrder): OperationMode {
  return order.status === "em_producao" ? "producao" : "materiais";
}

function canOperateOrder(order: DemoOrder) {
  return order.payment === "pago" && order.status !== "enviado" && order.status !== "entregue";
}

function canOperateProduction(order: DemoProductionOrder) {
  return order.status === "aguardando_materiais" || order.status === "em_producao";
}

function orderQueue(orders: DemoOrder[]) {
  return orders.filter(canOperateOrder).filter((order) =>
    order.status === "pago" || order.status === "a_separar" || order.status === "separado" || order.status === "embalado",
  );
}

function productionQueue(orders: DemoProductionOrder[]) {
  return orders.filter(canOperateProduction);
}

function makeCounts(lines: OperationLine[]): CountMap {
  return Object.fromEntries(lines.map((line) => [line.sku, 0]));
}

function emptyStageDone(): StageDone {
  return { separacao: false, conferencia: false, embalagem: false, materiais: false, producao: false };
}

function stageLabel(mode: OperationMode) {
  if (mode === "embalagem") return "Embalagem";
  if (mode === "conferencia") return "Conferencia";
  if (mode === "materiais") return "Separacao de materiais";
  if (mode === "producao") return "Producao";
  return "Separacao";
}

function orderLines(order: DemoOrder | null): OperationLine[] {
  if (!order) return [];
  return order.items.flatMap((line) => {
    const item = findDemoItem(line.sku);
    if (!item) return [];
    return [{
      sku: line.sku,
      qty: line.qty,
      item,
      name: item.name,
      detail: item.variant,
      code: item.code,
      short: line.qty > item.available,
      availability: `${item.available} disponivel`,
    }];
  });
}

export function OperationScreen({ go, route }: { go: Go; route: Route }) {
  const [orders, setOrders] = React.useState<DemoOrder[]>(() => [...DEMO_ORDERS]);
  const [productionOrders] = React.useState<DemoProductionOrder[]>(() => [...DEMO_PRODUCTION]);
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(route.order ?? null);
  const [selectedProductionId, setSelectedProductionId] = React.useState<string | null>(route.production ?? null);
  const [mode, setMode] = React.useState<OperationMode>(isMode(route.mode) ? route.mode : route.production ? "materiais" : "separacao");
  const order = React.useMemo(() => orders.find((item) => item.id === selectedOrderId) ?? null, [orders, selectedOrderId]);
  const production = React.useMemo(() => productionOrders.find((item) => item.id === selectedProductionId) ?? null, [productionOrders, selectedProductionId]);
  const targetKind: "order" | "production" | null = production ? "production" : order ? "order" : null;
  const expected = React.useMemo(() => production ? productionMaterialLines(production) : orderLines(order), [order, production]);
  const activeChecklist = production ? PRODUCTION_CHECKLIST : ORDER_PACK_CHECKLIST;
  const [countsByStage, setCountsByStage] = React.useState<CountsByStage>({ separacao: {}, conferencia: {}, materiais: {} });
  const [stageDone, setStageDone] = React.useState<StageDone>(() => emptyStageDone());
  const [log, setLog] = React.useState<LogEntry[]>([]);
  const [feedback, setFeedback] = React.useState<Feedback | null>(null);
  const [scanState, setScanState] = React.useState<"focus" | "ok" | "bad">("focus");
  const [input, setInput] = React.useState("");
  const [checks, setChecks] = React.useState<boolean[]>(() => activeChecklist.map(() => false));
  const [finished, setFinished] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const flashTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    let alive = true;
    loadDemoOrders()
      .then((nextOrders) => {
        if (alive) setOrders(nextOrders);
      })
      .catch(() => null);
    return () => { alive = false; };
  }, []);

  React.useEffect(() => {
    const nextProduction = route.production ?? null;
    const nextOrder = route.order ?? null;
    if (nextProduction) {
      setSelectedProductionId(nextProduction);
      setSelectedOrderId(null);
      const next = productionOrders.find((item) => item.id === nextProduction);
      setMode(isMode(route.mode) ? route.mode : next ? modeForProduction(next) : "materiais");
      return;
    }
    if (nextOrder) {
      setSelectedOrderId(nextOrder);
      setSelectedProductionId(null);
      const next = orders.find((item) => item.id === nextOrder);
      setMode(isMode(route.mode) ? route.mode : next ? modeForOrder(next) : "separacao");
      return;
    }
    setSelectedOrderId(null);
    setSelectedProductionId(null);
    if (isMode(route.mode)) setMode(route.mode);
  }, [orders, productionOrders, route.mode, route.order, route.production]);

  React.useEffect(() => {
    setCountsByStage({ separacao: makeCounts(expected), conferencia: makeCounts(expected), materiais: makeCounts(expected) });
    setStageDone(emptyStageDone());
    setChecks(activeChecklist.map(() => false));
    setLog([]);
    setFeedback(null);
    setFinished(false);
    setInput("");
  }, [activeChecklist, expected, targetKind]);

  React.useEffect(() => {
    if (mode === "embalagem" || mode === "producao") {
      setChecks((current) => current.length === activeChecklist.length ? current : activeChecklist.map(() => false));
      return;
    }
    inputRef.current?.focus();
  }, [activeChecklist, mode]);

  const currentStage: ScanStage = mode === "conferencia" ? "conferencia" : mode === "materiais" ? "materiais" : "separacao";
  const counts = countsByStage[currentStage] ?? {};
  const totalNeed = expected.reduce((sum, line) => sum + line.qty, 0);
  const doneFor = React.useCallback((stage: ScanStage) => expected.reduce((sum, line) => sum + (countsByStage[stage]?.[line.sku] ?? 0), 0), [countsByStage, expected]);
  const totalDone = mode === "embalagem" || mode === "producao" ? 0 : doneFor(currentStage);
  const pct = totalNeed ? Math.round((totalDone / totalNeed) * 100) : 0;
  const currentComplete = totalNeed > 0 && totalDone >= totalNeed;
  const checksDone = checks.slice(0, activeChecklist.length).filter(Boolean).length;
  const checklistComplete = checksDone === activeChecklist.length;
  const orderStep = order ? ORDER_STATUS[order.status].step : 0;
  const separationComplete = orderStep >= ORDER_STATUS.separado.step || stageDone.separacao;
  const conferenceComplete = orderStep >= ORDER_STATUS.embalado.step || stageDone.conferencia;
  const materialsComplete = production ? production.status !== "aguardando_materiais" || stageDone.materiais : false;
  const modePct = mode === "embalagem" || mode === "producao" ? Math.round((checksDone / activeChecklist.length) * 100) : pct;

  const pushLog = React.useCallback((entry: Omit<LogEntry, "time">) => {
    setLog((current) => [{ ...entry, time: now() }, ...current].slice(0, 14));
  }, []);

  const flash = (state: "ok" | "bad") => {
    setScanState(state);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setScanState("focus"), 700);
  };

  const selectOrder = (next: DemoOrder, source: "scan" | "manual") => {
    if (!canOperateOrder(next)) {
      setFeedback({
        kind: "bad",
        name: "Pedido nao liberado",
        sub: next.payment !== "pago" ? `${next.num} ainda nao esta pago` : `${next.num} ja saiu da fila operacional`,
        fix: "Volte para Pedidos e confira pagamento/status.",
      });
      pushLog({ kind: "bad", label: `Pedido bloqueado: ${next.num}` });
      flash("bad");
      return;
    }
    setSelectedOrderId(next.id);
    setSelectedProductionId(null);
    setMode(modeForOrder(next));
    setFeedback({ kind: "ok", name: `${next.num} carregado`, sub: source === "scan" ? "Codigo de barras do pedido lido" : "Pedido selecionado na fila" });
    pushLog({ kind: "neutral", label: `Pedido carregado: ${next.num}` });
    flash("ok");
  };

  const selectProduction = (next: DemoProductionOrder, source: "scan" | "manual") => {
    if (!canOperateProduction(next)) {
      setFeedback({
        kind: "bad",
        name: "OP fora da fila operacional",
        sub: `${next.num} esta em ${PROD_STATUS[next.status].label}`,
        fix: "Volte para Producao e confira o status da OP.",
      });
      pushLog({ kind: "bad", label: `OP bloqueada: ${next.num}` });
      flash("bad");
      return;
    }
    setSelectedProductionId(next.id);
    setSelectedOrderId(null);
    setMode(modeForProduction(next));
    setFeedback({ kind: "ok", name: `${next.num} carregada`, sub: source === "scan" ? "Codigo de barras da OP lido" : "OP selecionada na fila" });
    pushLog({ kind: "neutral", label: `OP carregada: ${next.num}` });
    flash("ok");
  };

  const readDocumentCode = (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    setInput("");
    const orderHit = findOrderByScan(orders, value);
    if (orderHit) {
      selectOrder(orderHit, "scan");
      return;
    }
    const productionHit = findProductionByScan(productionOrders, value);
    if (productionHit) {
      selectProduction(productionHit, "scan");
      return;
    }
    setFeedback({ kind: "bad", name: "Documento nao encontrado", sub: `"${raw}" nao corresponde a pedido ou OP`, fix: "Bipe o codigo da pick list ou selecione manualmente." });
    pushLog({ kind: "bad", label: "Documento desconhecido" });
    flash("bad");
  };

  const updateCounts = (stage: ScanStage, sku: string, value: number) => {
    setCountsByStage((current) => ({ ...current, [stage]: { ...current[stage], [sku]: value } }));
  };

  const readCode = (raw: string) => {
    if (!targetKind) {
      readDocumentCode(raw);
      return;
    }

    const value = raw.trim().toLowerCase();
    const values = scanCandidates(raw);
    if (!value || values.size === 0) return;
    setInput("");

    const orderHit = findOrderByScan(orders, value);
    if (orderHit) {
      if (order && orderHit.id === order.id) {
        setFeedback({ kind: "ok", name: `${order.num} confirmado`, sub: "Este e o pedido ativo nesta etapa." });
        pushLog({ kind: "neutral", label: `Pedido confirmado: ${order.num}` });
        flash("ok");
        return;
      }
      setFeedback({ kind: "bad", name: "Codigo de outro pedido", sub: `${orderHit.num} nao e o documento ativo`, fix: "Finalize ou saia antes de trocar." });
      pushLog({ kind: "bad", label: `Outro pedido lido: ${orderHit.num}` });
      flash("bad");
      return;
    }

    const productionHit = findProductionByScan(productionOrders, value);
    if (productionHit) {
      if (production && productionHit.id === production.id) {
        setFeedback({ kind: "ok", name: `${production.num} confirmada`, sub: "Esta e a OP ativa nesta etapa." });
        pushLog({ kind: "neutral", label: `OP confirmada: ${production.num}` });
        flash("ok");
        return;
      }
      setFeedback({ kind: "bad", name: "Codigo de outra OP", sub: `${productionHit.num} nao e o documento ativo`, fix: "Finalize ou saia antes de trocar." });
      pushLog({ kind: "bad", label: `Outra OP lida: ${productionHit.num}` });
      flash("bad");
      return;
    }

    if (value === "__cura") {
      setFeedback({ kind: "bad", name: "Lote em cura", sub: "Produto ainda descansando", fix: "Use outro lote liberado ou aguarde a cura terminar." });
      pushLog({ kind: "bad", label: "Lote em cura bloqueado", stage: currentStage });
      flash("bad");
      return;
    }

    if (mode === "conferencia" && !separationComplete) {
      setFeedback({ kind: "bad", name: "Separe antes de conferir", sub: "A conferencia abre depois da separacao finalizada.", fix: "Volte para Separacao e finalize a etapa." });
      pushLog({ kind: "bad", label: "Conferencia antes da separacao" });
      flash("bad");
      return;
    }

    const hit = expected.find((line) =>
      values.has(line.code) || values.has(line.sku.toLowerCase()) || line.name.toLowerCase().includes(value),
    );

    if (hit) {
      const current = counts[hit.sku] ?? 0;
      if (current >= hit.qty) {
        setFeedback({ kind: "bad", name: "Quantidade excedida", sub: `${hit.name} ja esta completo`, fix: "Confira a linha da pick list antes de continuar." });
        pushLog({ kind: "bad", label: `Excedido: ${hit.sku}`, stage: currentStage });
        flash("bad");
        return;
      }
      updateCounts(currentStage, hit.sku, current + 1);
      setFeedback({
        kind: hit.short ? "bad" : "ok",
        name: `${hit.name} ${hit.detail}`,
        sub: hit.short ? `Confirmado com pendencia de estoque - ${hit.availability}` : `${current + 1} de ${hit.qty} - ${hit.sku}`,
        fix: hit.short ? "Pode continuar, mas a OP ficara pendente de reposicao/producao." : undefined,
      });
      pushLog({ kind: hit.short ? "bad" : "ok", label: `${stageLabel(mode)}: ${hit.name}`, sku: hit.sku, stage: currentStage });
      flash(hit.short ? "bad" : "ok");
      return;
    }

    const other = DEMO_ITEMS.find((item) => values.has(item.code) || values.has(item.sku.toLowerCase()));
    if (other) {
      const doc = production ? production.num : order?.num;
      setFeedback({ kind: "bad", name: targetKind === "production" ? "Material errado" : "Item errado", sub: `${other.name} nao pertence a ${doc}`, fix: "Separe o item correto da lista." });
      pushLog({ kind: "bad", label: `Errado: ${other.sku}`, stage: currentStage });
      flash("bad");
      return;
    }

    setFeedback({ kind: "bad", name: "Codigo desconhecido", sub: `"${raw}" nao foi encontrado`, fix: "Busque manualmente ou confira a etiqueta." });
    pushLog({ kind: "bad", label: "Codigo desconhecido", stage: currentStage });
    flash("bad");
  };

  const adjust = (sku: string, delta: number) => {
    const line = expected.find((item) => item.sku === sku);
    if (!line || mode === "embalagem" || mode === "producao") return;
    const current = counts[sku] ?? 0;
    const nextValue = Math.max(0, Math.min(line.qty, current + delta));
    if (nextValue === current) return;
    updateCounts(currentStage, sku, nextValue);
    pushLog({ kind: delta > 0 ? "ok" : "neutral", label: `${delta > 0 ? "+1" : "-1"} ${line.name}`, sku, stage: currentStage });
  };

  const markComplete = (sku: string) => {
    const line = expected.find((item) => item.sku === sku);
    if (!line || mode === "embalagem" || mode === "producao") return;
    updateCounts(currentStage, sku, line.qty);
    pushLog({ kind: "ok", label: `Completo: ${line.name}`, sku, stage: currentStage });
  };

  const undo = () => {
    const last = log.find((entry) => entry.kind === "ok" && entry.sku && entry.stage === currentStage);
    if (!last) return;
    updateCounts(currentStage, last.sku!, Math.max(0, (counts[last.sku!] ?? 0) - 1));
    setLog((current) => current.filter((entry) => entry !== last));
    setFeedback(null);
  };

  const finishStage = () => {
    setStageDone((current) => ({ ...current, [mode]: true }));
    setFinished(true);
  };

  const exit = () => {
    if (production) {
      go("producao", { open: production.id });
      return;
    }
    go(order ? "pedidos" : "hoje", order ? { open: order.id } : {});
  };

  if (!targetKind) {
    const ordersToOperate = orderQueue(orders);
    const productionsToOperate = productionQueue(productionOrders);
    return (
      <div className="op" onClick={() => inputRef.current?.focus()}>
        <div className="op-head">
          <button className="op-exit" onClick={exit}><Icon name="x" size={18} /> Sair</button>
          <div className="op-doc">
            <span className="op-doc-mode">Modo Operacao</span>
            <span className="op-doc-title">Aguardando leitura de pedido ou OP</span>
          </div>
        </div>

        <div className="op-start">
          <div className="op-start-main">
            <div className="op-start-kicker"><Icon name="scan" size={17} /> Entrada pela pick list</div>
            <h1 className="op-start-title">Bipe o codigo do pedido ou da OP</h1>
            <p className="op-start-copy">Pedidos abrem separacao, conferencia e embalagem. OPs abrem separacao de materiais e checklist de producao.</p>
            <div className={cn("op-scanfield", `op-scanfield--${scanState}`)}>
              {scanState === "focus" && <div className="op-scanline-anim" />}
              <Icon name={scanState === "ok" ? "check" : scanState === "bad" ? "alert" : "scan"} size={28} className="op-scanicon" />
              <input
                ref={inputRef}
                className="op-scaninput"
                value={input}
                placeholder="Bipe codigo do pedido ou da OP..."
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") readDocumentCode(input); }}
              />
              <span className="op-scanhint"><span className="op-pulse" /> Leitor pronto</span>
            </div>
            {feedback && (
              <div className={cn("op-feedback op-feedback--compact", `op-feedback--${feedback.kind}`)}>
                <div className={cn("op-fb-top", feedback.kind === "ok" ? "op-fb-ok" : "op-fb-bad")}><Icon name={feedback.kind === "ok" ? "checkCircle" : "alertCircle"} size={17} />{feedback.kind === "ok" ? "Confirmado" : "Bloqueado"}</div>
                <div className="op-fb-name">{feedback.name}</div>
                <div className="op-fb-sub">{feedback.sub}</div>
                {feedback.fix && <div className="op-fb-fix"><Icon name="arrowRight" size={15} />{feedback.fix}</div>}
              </div>
            )}
          </div>

          <div className="op-start-side">
            <div className="op-coltitle"><span>Pedidos</span><span>{ordersToOperate.length}</span></div>
            <div className="op-order-list">
              {ordersToOperate.map((item) => {
                const status = ORDER_STATUS[item.status];
                return (
                  <button key={item.id} className="op-order-card" onClick={() => selectOrder(item, "manual")}>
                    <div className="op-order-main">
                      <div className="op-order-num">{item.num}</div>
                      <div className="op-order-sub">{item.customerName} - {CHANNELS[item.channel]}</div>
                      <div className="op-order-status">{status.label} - {item.items.reduce((sum, line) => sum + line.qty, 0)} un</div>
                    </div>
                    <Barcode code={item.code} size="sm" />
                  </button>
                );
              })}
            </div>

            <div className="op-coltitle" style={{ marginTop: 18 }}><span>Producao</span><span>{productionsToOperate.length}</span></div>
            <div className="op-order-list">
              {productionsToOperate.map((item) => {
                const status = PROD_STATUS[item.status];
                return (
                  <button key={item.id} className="op-order-card" onClick={() => selectProduction(item, "manual")}>
                    <div className="op-order-main">
                      <div className="op-order-num">{item.num}</div>
                      <div className="op-order-sub">{item.productName}</div>
                      <div className="op-order-status">{status.label} - {item.planned} un</div>
                    </div>
                    <Barcode code={item.code} size="sm" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const canUseConference = order ? separationComplete || mode === "conferencia" : false;
  const canUsePackaging = order ? conferenceComplete || mode === "embalagem" : false;
  const canUseProduction = production ? materialsComplete || mode === "producao" : false;
  const canFinalize =
    mode === "embalagem" || mode === "producao"
      ? checklistComplete
      : mode === "conferencia"
        ? separationComplete && currentComplete
        : currentComplete;
  const modeBlocked =
    mode === "conferencia" && !separationComplete
      ? "Finalize a separacao antes de conferir."
      : mode === "embalagem" && !conferenceComplete
        ? "Finalize a conferencia antes de embalar."
        : mode === "producao" && !materialsComplete
          ? "Finalize a separacao de materiais antes de produzir."
          : null;
  const docCode = production?.code ?? order?.code ?? "";
  const docTitle = production ? `${production.num} - ${production.productName}` : `${order?.num} - ${order?.customerName}`;
  const modeOptions: Array<{ value: OperationMode; label: string; icon: string; enabled: boolean }> = production
    ? [
      { value: "materiais", label: "Materiais", icon: "scan", enabled: true },
      { value: "producao", label: "Producao", icon: "producao", enabled: canUseProduction },
    ]
    : [
      { value: "separacao", label: "Separacao", icon: "scan", enabled: true },
      { value: "conferencia", label: "Conferencia", icon: "listChecks", enabled: canUseConference },
      { value: "embalagem", label: "Embalagem", icon: "package2", enabled: canUsePackaging },
    ];

  return (
    <div className="op" onClick={() => inputRef.current?.focus()}>
      <div className="op-head">
        <button className="op-exit" onClick={exit}><Icon name="x" size={18} /> Sair</button>
        <div className="op-doc">
          <span className="op-doc-mode">{stageLabel(mode)}</span>
          <span className="op-doc-title">{docTitle}</span>
        </div>
        <Barcode code={docCode} size="sm" className="op-head-code" />
        <div style={{ flex: 1 }} />
        <div className="op-modes">
          {modeOptions.map((option) => (
              <button key={option.value} disabled={!option.enabled} className={cn("op-mode", mode === option.value && "op-mode--on")} onClick={() => setMode(option.value)}>
                <Icon name={option.icon} size={15} />{option.label}
              </button>
            ))}
        </div>
        <div className="op-prog">
          <div className="op-prog-ring">
            <ProgressRing pct={modePct} />
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700 }}>
              {mode === "embalagem" || mode === "producao" ? `${checksDone}/${activeChecklist.length}` : `${pct}%`}
            </div>
          </div>
        </div>
      </div>

      {mode !== "embalagem" && mode !== "producao" && (
        <div className="op-scan">
          <div className="op-scanwrap">
            <div className={cn("op-scanfield", `op-scanfield--${scanState}`)}>
              {scanState === "focus" && <div className="op-scanline-anim" />}
              <Icon name={scanState === "ok" ? "check" : scanState === "bad" ? "alert" : "scan"} size={28} className="op-scanicon" />
              <input
                ref={inputRef}
                className="op-scaninput"
                value={input}
                placeholder={production ? "Bipe material, SKU ou nome..." : mode === "conferencia" ? "Rebipe cada item para conferir..." : "Bipe item, SKU ou nome..."}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") readCode(input); }}
              />
              <span className="op-scanhint"><span className="op-pulse" /> Leitor pronto</span>
            </div>
            <div className="op-sim">
              <span className="op-sim-label">Simular leitura:</span>
              <button className="op-chip" onClick={() => readCode(docCode)}><Icon name={production ? "producao" : "pedidos"} size={13} />{production ? "OP" : "pedido"}</button>
              {expected.map((line) => <button key={line.sku} className="op-chip" onClick={() => readCode(line.code)}><Icon name="scan" size={13} />{line.sku}</button>)}
              {!production && <button className="op-chip op-chip--bad" onClick={() => readCode("__cura")}><Icon name="thermometer" size={13} />lote em cura</button>}
            </div>
          </div>
        </div>
      )}

      {mode === "embalagem" || mode === "producao" ? (
        <div className="op-body" style={{ gridTemplateColumns: "1fr" }}>
          <div className="op-col" style={{ maxWidth: 860, margin: "0 auto", width: "100%" }}>
            {modeBlocked && <div className="op-blocked"><Icon name="alertCircle" size={16} />{modeBlocked}</div>}
            <div className="op-coltitle"><span>{mode === "producao" ? `Checklist de producao - ${production?.num}` : `Checklist de embalagem - ${order?.num}`}</span><span>{checksDone}/{activeChecklist.length}</span></div>
            {activeChecklist.map((label, index) => (
              <button key={label} className={cn("op-item", checks[index] && "op-item--done")} onClick={() => setChecks((current) => current.map((value, i) => i === index ? !value : value))} style={{ cursor: "pointer", width: "100%", color: "inherit", textAlign: "left" }}>
                <div className="op-item-check">{checks[index] && <Icon name="check" size={18} strokeWidth={3} />}</div>
                <div className="op-item-body"><div className="op-item-name" style={{ fontSize: 15 }}>{label}</div></div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="op-body">
          <div className="op-col">
            <div className="op-coltitle">
              <span>{production ? "Materiais da OP" : mode === "conferencia" ? "Releitura para conferencia" : "Itens a separar"}</span>
              <span>{totalDone} / {totalNeed} confirmados</span>
            </div>
            {modeBlocked && <div className="op-blocked"><Icon name="alertCircle" size={16} />{modeBlocked}</div>}
            {expected.map((line) => {
              const done = (counts[line.sku] ?? 0) >= line.qty;
              return (
                <div key={line.sku} className={cn("op-item", done && "op-item--done", line.short && "op-item--warn")}>
                  <div className="op-item-check">{done && <Icon name="check" size={18} strokeWidth={3} />}</div>
                  <div className="op-item-body">
                    <div className="op-item-name">{line.name} <span style={{ color: "var(--op-mut)", fontWeight: 500 }}>{line.detail}</span></div>
                    <div className="op-item-sku">{line.sku} - {line.code}{line.availability ? ` - ${line.availability}` : ""}</div>
                  </div>
                  <div className="op-item-qty">{counts[line.sku] ?? 0}<small> / {line.qty}</small></div>
                  <div className="op-item-ctrl">
                    <button className="op-qbtn" onClick={() => adjust(line.sku, -1)} disabled={(counts[line.sku] ?? 0) === 0}><Icon name="minus" size={16} /></button>
                    <button className="op-qbtn" onClick={() => adjust(line.sku, +1)} disabled={done || !!modeBlocked}><Icon name="plus" size={16} /></button>
                    <button className="op-qbtn" onClick={() => markComplete(line.sku)} disabled={done || !!modeBlocked} title="Marcar completo"><Icon name="check" size={16} /></button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="op-col op-col--right">
            <div className="op-coltitle">Ultima leitura</div>
            <div className={cn("op-feedback", feedback && `op-feedback--${feedback.kind}`)}>
              {!feedback && <div className="op-fb-empty">Aguardando leitura...<br /><span style={{ fontSize: 13 }}>Bipe um item ou use os botoes.</span></div>}
              {feedback && (
                <>
                  <div className={cn("op-fb-top", feedback.kind === "ok" ? "op-fb-ok" : "op-fb-bad")}><Icon name={feedback.kind === "ok" ? "checkCircle" : "alertCircle"} size={17} />{feedback.kind === "ok" ? "Confirmado" : "Atencao"}</div>
                  <div className="op-fb-name">{feedback.name}</div>
                  <div className="op-fb-sub">{feedback.sub}</div>
                  {feedback.fix && <div className="op-fb-fix"><Icon name="arrowRight" size={15} />{feedback.fix}</div>}
                </>
              )}
            </div>
            <div className="op-coltitle" style={{ marginTop: 4 }}>Historico recente</div>
            <div className="op-log">
              {log.length === 0 && <div style={{ color: "#4a4d57", fontSize: 13 }}>Nenhuma acao ainda.</div>}
              {log.map((entry, index) => (
                <div key={`${entry.time}-${index}`} className="op-logrow">
                  <span className="op-logdot" style={{ background: entry.kind === "ok" ? "var(--op-ok)" : entry.kind === "bad" ? "var(--op-bad)" : "var(--op-mut)" }} />
                  {entry.label}
                  <span className="op-logtime">{entry.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="op-foot">
        {mode !== "embalagem" && mode !== "producao" && <button className="op-fbtn" onClick={undo} disabled={!log.some((entry) => entry.kind === "ok" && entry.sku && entry.stage === currentStage)}><Icon name="undo" size={18} /> Desfazer</button>}
        <div style={{ flex: 1, color: "var(--op-mut)", fontSize: 13.5 }}>
          {modeBlocked
            ? modeBlocked
            : mode === "embalagem"
              ? (checklistComplete ? "Checklist completo - pode marcar pronto para envio." : `Faltam ${activeChecklist.length - checksDone} itens do checklist.`)
              : mode === "producao"
                ? (checklistComplete ? "Checklist completo - producao pode seguir para cura." : `Faltam ${activeChecklist.length - checksDone} itens do checklist.`)
                : (currentComplete ? `${stageLabel(mode)} completa - finalize a etapa.` : `Faltam ${totalNeed - totalDone} itens para finalizar.`)}
        </div>
        <button className="op-fbtn op-fbtn--primary" disabled={!canFinalize || !!modeBlocked} onClick={finishStage}>
          <Icon name={mode === "embalagem" ? "truck" : mode === "producao" ? "producao" : "check"} size={18} /> {mode === "embalagem" ? "Marcar pronto p/ envio" : mode === "producao" ? "Finalizar producao" : "Finalizar etapa"}
        </button>
      </div>

      {finished && (
        <div className="op-done">
          <div className="op-done-card">
            <div className="op-done-ring"><Icon name="check" size={42} strokeWidth={2.4} /></div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
              {mode === "embalagem" ? "Pedido pronto para envio" : mode === "producao" ? "Producao concluida" : `${stageLabel(mode)} concluida`}
            </div>
            <div style={{ color: "var(--op-mut)", fontSize: 14.5, marginBottom: 24 }}>{docTitle}</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              {order && mode === "separacao" && <button className="op-fbtn op-fbtn--amber" onClick={() => { setFinished(false); setMode("conferencia"); }}><Icon name="listChecks" size={18} /> Ir para conferencia</button>}
              {order && mode === "conferencia" && <button className="op-fbtn op-fbtn--amber" onClick={() => { setFinished(false); setMode("embalagem"); }}><Icon name="package2" size={18} /> Ir para embalagem</button>}
              {production && mode === "materiais" && <button className="op-fbtn op-fbtn--amber" onClick={() => { setFinished(false); setMode("producao"); }}><Icon name="producao" size={18} /> Ir para producao</button>}
              <button className="op-fbtn" onClick={exit}>Voltar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
