"use client";

import * as React from "react";
import { Barcode } from "@/components/barcode";
import { Icon, cn } from "@/components/ui";
import {
  CHANNELS,
  DEMO_ITEMS,
  DEMO_ORDERS,
  ORDER_STATUS,
  findDemoItem,
  type DemoOrder,
} from "@/lib/screen-fixtures";
import { loadDemoOrders } from "@/lib/demo-order-overrides";
import type { Go, Route } from "@/lib/types";

const PACK_CHECKLIST = [
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

type OperationMode = "separacao" | "conferencia" | "embalagem";
type ScanStage = "separacao" | "conferencia";
type Feedback = { kind: "ok" | "bad"; name: string; sub: string; fix?: string };
type LogEntry = { kind: "ok" | "bad" | "neutral"; label: string; sku?: string; stage?: ScanStage; time: string };
type StageDone = Record<OperationMode, boolean>;
type CountMap = Record<string, number>;
type CountsByStage = Record<ScanStage, CountMap>;

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
  return value === "separacao" || value === "conferencia" || value === "embalagem";
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function digits(value: string) {
  return value.replace(/\D/g, "");
}

function findOrderByScan(orders: DemoOrder[], raw: string) {
  const value = normalize(raw);
  const numeric = digits(raw);
  return orders.find((order) => {
    const num = normalize(order.num);
    return order.id.toLowerCase() === value || num === value || order.code === value || (!!numeric && order.code === numeric);
  });
}

function modeForOrder(order: DemoOrder): OperationMode {
  if (order.status === "pago" || order.status === "a_separar") return "separacao";
  if (order.status === "separado") return "conferencia";
  return "embalagem";
}

function canOperate(order: DemoOrder) {
  return order.payment === "pago" && order.status !== "enviado" && order.status !== "entregue";
}

function operationalQueue(orders: DemoOrder[]) {
  return orders.filter(canOperate).filter((order) =>
    order.status === "pago" || order.status === "a_separar" || order.status === "separado" || order.status === "embalado",
  );
}

function makeCounts(order: DemoOrder | null): CountMap {
  if (!order) return {};
  return Object.fromEntries(order.items.map((line) => [line.sku, 0]));
}

function stageLabel(mode: OperationMode) {
  if (mode === "embalagem") return "Embalagem";
  if (mode === "conferencia") return "Conferencia";
  return "Separacao";
}

export function OperationScreen({ go, route }: { go: Go; route: Route }) {
  const [orders, setOrders] = React.useState<DemoOrder[]>(() => [...DEMO_ORDERS]);
  const [selectedId, setSelectedId] = React.useState<string | null>(route.order ?? null);
  const [mode, setMode] = React.useState<OperationMode>(isMode(route.mode) ? route.mode : "separacao");
  const order = React.useMemo(() => orders.find((item) => item.id === selectedId) ?? null, [orders, selectedId]);
  const expected = React.useMemo(
    () => order?.items.map((line) => ({ ...line, item: findDemoItem(line.sku) })).filter((line) => line.item) ?? [],
    [order],
  );
  const [countsByStage, setCountsByStage] = React.useState<CountsByStage>({ separacao: {}, conferencia: {} });
  const [stageDone, setStageDone] = React.useState<StageDone>({ separacao: false, conferencia: false, embalagem: false });
  const [log, setLog] = React.useState<LogEntry[]>([]);
  const [feedback, setFeedback] = React.useState<Feedback | null>(null);
  const [scanState, setScanState] = React.useState<"focus" | "ok" | "bad">("focus");
  const [input, setInput] = React.useState("");
  const [checks, setChecks] = React.useState<boolean[]>(() => PACK_CHECKLIST.map(() => false));
  const [finished, setFinished] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const flashTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    setOrders(loadDemoOrders(DEMO_ORDERS));
  }, []);

  React.useEffect(() => {
    const nextOrder = route.order ?? null;
    setSelectedId(nextOrder);
    if (isMode(route.mode)) {
      setMode(route.mode);
    } else if (nextOrder) {
      const next = orders.find((item) => item.id === nextOrder);
      if (next) setMode(modeForOrder(next));
    }
  }, [orders, route.order, route.mode]);

  React.useEffect(() => {
    setCountsByStage({ separacao: makeCounts(order), conferencia: makeCounts(order) });
    setStageDone({ separacao: false, conferencia: false, embalagem: false });
    setChecks(PACK_CHECKLIST.map(() => false));
    setLog([]);
    setFeedback(null);
    setFinished(false);
    setInput("");
    if (order && !isMode(route.mode)) setMode(modeForOrder(order));
  }, [order, route.mode]);

  React.useEffect(() => {
    if (mode !== "embalagem" || !order) inputRef.current?.focus();
  }, [mode, order]);

  const currentStage: ScanStage = mode === "conferencia" ? "conferencia" : "separacao";
  const counts = countsByStage[currentStage] ?? {};
  const totalNeed = expected.reduce((sum, line) => sum + line.qty, 0);
  const doneFor = React.useCallback((stage: ScanStage) => expected.reduce((sum, line) => sum + (countsByStage[stage]?.[line.sku] ?? 0), 0), [countsByStage, expected]);
  const totalDone = mode === "embalagem" ? 0 : doneFor(currentStage);
  const pct = totalNeed ? Math.round((totalDone / totalNeed) * 100) : 0;
  const currentComplete = totalNeed > 0 && totalDone >= totalNeed;
  const checksDone = checks.filter(Boolean).length;
  const packComplete = checksDone === PACK_CHECKLIST.length;
  const orderStep = order ? ORDER_STATUS[order.status].step : 0;
  const separationComplete = orderStep >= ORDER_STATUS.separado.step || stageDone.separacao;
  const conferenceComplete = orderStep >= ORDER_STATUS.embalado.step || stageDone.conferencia;
  const modePct = mode === "embalagem" ? Math.round((checksDone / PACK_CHECKLIST.length) * 100) : pct;

  const pushLog = React.useCallback((entry: Omit<LogEntry, "time">) => {
    setLog((current) => [{ ...entry, time: now() }, ...current].slice(0, 14));
  }, []);

  const flash = (state: "ok" | "bad") => {
    setScanState(state);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setScanState("focus"), 700);
  };

  const selectOrder = (next: DemoOrder, source: "scan" | "manual") => {
    if (!canOperate(next)) {
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
    setSelectedId(next.id);
    setMode(modeForOrder(next));
    setFeedback({ kind: "ok", name: `${next.num} carregado`, sub: source === "scan" ? "Codigo de barras do pedido lido" : "Pedido selecionado na fila" });
    pushLog({ kind: "neutral", label: `Pedido carregado: ${next.num}` });
    flash("ok");
  };

  const readOrderCode = (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    setInput("");
    const hit = findOrderByScan(orders, value);
    if (!hit) {
      setFeedback({ kind: "bad", name: "Pedido nao encontrado", sub: `"${raw}" nao corresponde a um pedido`, fix: "Bipe o codigo da pick list ou selecione manualmente." });
      pushLog({ kind: "bad", label: "Pedido desconhecido" });
      flash("bad");
      return;
    }
    selectOrder(hit, "scan");
  };

  const updateCounts = (stage: ScanStage, sku: string, value: number) => {
    setCountsByStage((current) => ({ ...current, [stage]: { ...current[stage], [sku]: value } }));
  };

  const readCode = (raw: string) => {
    if (!order) {
      readOrderCode(raw);
      return;
    }

    const value = raw.trim().toLowerCase();
    if (!value) return;
    setInput("");

    const orderHit = findOrderByScan(orders, value);
    if (orderHit) {
      if (orderHit.id === order.id) {
        setFeedback({ kind: "ok", name: `${order.num} confirmado`, sub: "Este e o pedido ativo nesta etapa." });
        pushLog({ kind: "neutral", label: `Pedido confirmado: ${order.num}` });
        flash("ok");
        return;
      }
      setFeedback({ kind: "bad", name: "Codigo de outro pedido", sub: `${orderHit.num} nao e o pedido ativo`, fix: "Finalize ou saia antes de trocar de pedido." });
      pushLog({ kind: "bad", label: `Outro pedido lido: ${orderHit.num}` });
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

    const hit = expected.find((line) => {
      const item = line.item!;
      return item.code === value || item.sku.toLowerCase() === value || item.name.toLowerCase().includes(value);
    });

    if (hit) {
      const current = counts[hit.sku] ?? 0;
      if (current >= hit.qty) {
        setFeedback({ kind: "bad", name: "Quantidade excedida", sub: `${hit.item!.name} ja esta completo`, fix: "Confira a linha da pick list antes de continuar." });
        pushLog({ kind: "bad", label: `Excedido: ${hit.item!.sku}`, stage: currentStage });
        flash("bad");
        return;
      }
      updateCounts(currentStage, hit.sku, current + 1);
      setFeedback({
        kind: "ok",
        name: `${hit.item!.name} ${hit.item!.variant}`,
        sub: `${current + 1} de ${hit.qty} - ${stageLabel(mode)} - ${hit.sku}`,
      });
      pushLog({ kind: "ok", label: `${stageLabel(mode)}: ${hit.item!.name} ${hit.item!.variant}`, sku: hit.sku, stage: currentStage });
      flash("ok");
      return;
    }

    const other = DEMO_ITEMS.find((item) => item.code === value || item.sku.toLowerCase() === value);
    if (other) {
      setFeedback({ kind: "bad", name: "Item errado", sub: `${other.name} nao pertence a ${order.num}`, fix: "Separe o item correto da lista." });
      pushLog({ kind: "bad", label: `Item errado: ${other.sku}`, stage: currentStage });
      flash("bad");
      return;
    }

    setFeedback({ kind: "bad", name: "Codigo desconhecido", sub: `"${raw}" nao foi encontrado`, fix: "Busque manualmente ou confira a etiqueta." });
    pushLog({ kind: "bad", label: "Codigo desconhecido", stage: currentStage });
    flash("bad");
  };

  const adjust = (sku: string, delta: number) => {
    const line = expected.find((item) => item.sku === sku);
    if (!line || mode === "embalagem") return;
    const current = counts[sku] ?? 0;
    const nextValue = Math.max(0, Math.min(line.qty, current + delta));
    if (nextValue === current) return;
    updateCounts(currentStage, sku, nextValue);
    pushLog({ kind: delta > 0 ? "ok" : "neutral", label: `${delta > 0 ? "+1" : "-1"} ${line.item!.name}`, sku, stage: currentStage });
  };

  const markComplete = (sku: string) => {
    const line = expected.find((item) => item.sku === sku);
    if (!line || mode === "embalagem") return;
    updateCounts(currentStage, sku, line.qty);
    pushLog({ kind: "ok", label: `Completo: ${line.item!.name}`, sku, stage: currentStage });
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

  const exit = () => go(order ? "pedidos" : "hoje", order ? { open: order.id } : {});

  if (!order) {
    const queue = operationalQueue(orders);
    return (
      <div className="op" onClick={() => inputRef.current?.focus()}>
        <div className="op-head">
          <button className="op-exit" onClick={exit}><Icon name="x" size={18} /> Sair</button>
          <div className="op-doc">
            <span className="op-doc-mode">Modo Operacao</span>
            <span className="op-doc-title">Aguardando leitura do pedido</span>
          </div>
        </div>

        <div className="op-start">
          <div className="op-start-main">
            <div className="op-start-kicker"><Icon name="scan" size={17} /> Entrada pela pick list</div>
            <h1 className="op-start-title">Bipe o codigo de barras do pedido</h1>
            <p className="op-start-copy">A separacao comeca pelo codigo impresso na pick list. Assim a bancada abre o pedido certo antes de qualquer item ser bipado.</p>
            <div className={cn("op-scanfield", `op-scanfield--${scanState}`)}>
              {scanState === "focus" && <div className="op-scanline-anim" />}
              <Icon name={scanState === "ok" ? "check" : scanState === "bad" ? "alert" : "scan"} size={28} className="op-scanicon" />
              <input
                ref={inputRef}
                className="op-scaninput"
                value={input}
                placeholder="Bipe o codigo do pedido..."
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") readOrderCode(input); }}
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
            <div className="op-coltitle"><span>Fila operacional</span><span>{queue.length}</span></div>
            <div className="op-order-list">
              {queue.map((item) => {
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
          </div>
        </div>
      </div>
    );
  }

  const canUseConference = separationComplete || mode === "conferencia";
  const canUsePackaging = conferenceComplete || mode === "embalagem";
  const canFinalize =
    mode === "embalagem"
      ? packComplete
      : mode === "conferencia"
        ? separationComplete && currentComplete
        : currentComplete;
  const modeBlocked =
    mode === "conferencia" && !separationComplete
      ? "Finalize a separacao antes de conferir."
      : mode === "embalagem" && !conferenceComplete
        ? "Finalize a conferencia antes de embalar."
        : null;

  return (
    <div className="op" onClick={() => inputRef.current?.focus()}>
      <div className="op-head">
        <button className="op-exit" onClick={exit}><Icon name="x" size={18} /> Sair</button>
        <div className="op-doc">
          <span className="op-doc-mode">{stageLabel(mode)} de pedido</span>
          <span className="op-doc-title">{order.num} - {order.customerName}</span>
        </div>
        <Barcode code={order.code} size="sm" className="op-head-code" />
        <div style={{ flex: 1 }} />
        <div className="op-modes">
          {([
            ["separacao", "Separacao", "scan", true],
            ["conferencia", "Conferencia", "listChecks", canUseConference],
            ["embalagem", "Embalagem", "package2", canUsePackaging],
          ] as const).map(([value, label, icon, enabled]) => (
            <button key={value} disabled={!enabled} className={cn("op-mode", mode === value && "op-mode--on")} onClick={() => setMode(value)}>
              <Icon name={icon} size={15} />{label}
            </button>
          ))}
        </div>
        <div className="op-prog">
          <div className="op-prog-ring">
            <ProgressRing pct={modePct} />
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700 }}>
              {mode === "embalagem" ? `${checksDone}/${PACK_CHECKLIST.length}` : `${pct}%`}
            </div>
          </div>
        </div>
      </div>

      {mode !== "embalagem" && (
        <div className="op-scan">
          <div className="op-scanwrap">
            <div className={cn("op-scanfield", `op-scanfield--${scanState}`)}>
              {scanState === "focus" && <div className="op-scanline-anim" />}
              <Icon name={scanState === "ok" ? "check" : scanState === "bad" ? "alert" : "scan"} size={28} className="op-scanicon" />
              <input
                ref={inputRef}
                className="op-scaninput"
                value={input}
                placeholder={mode === "conferencia" ? "Rebipe cada item para conferir..." : "Bipe item, SKU ou nome..."}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") readCode(input); }}
              />
              <span className="op-scanhint"><span className="op-pulse" /> Leitor pronto</span>
            </div>
            <div className="op-sim">
              <span className="op-sim-label">Simular leitura:</span>
              <button className="op-chip" onClick={() => readCode(order.code)}><Icon name="pedidos" size={13} />pedido</button>
              {expected.map((line) => <button key={line.sku} className="op-chip" onClick={() => readCode(line.item!.code)}><Icon name="scan" size={13} />{line.sku}</button>)}
              <button className="op-chip op-chip--bad" onClick={() => readCode("__cura")}><Icon name="thermometer" size={13} />lote em cura</button>
            </div>
          </div>
        </div>
      )}

      {mode === "embalagem" ? (
        <div className="op-body" style={{ gridTemplateColumns: "1fr" }}>
          <div className="op-col" style={{ maxWidth: 820, margin: "0 auto", width: "100%" }}>
            <div className="op-coltitle"><span>Checklist de embalagem - {order.num}</span><span>{checksDone}/{PACK_CHECKLIST.length}</span></div>
            {PACK_CHECKLIST.map((label, index) => (
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
              <span>{mode === "conferencia" ? "Releitura para conferencia" : "Itens a separar"}</span>
              <span>{totalDone} / {totalNeed} bipados</span>
            </div>
            {modeBlocked && <div className="op-blocked"><Icon name="alertCircle" size={16} />{modeBlocked}</div>}
            {expected.map((line) => {
              const done = (counts[line.sku] ?? 0) >= line.qty;
              return (
                <div key={line.sku} className={cn("op-item", done && "op-item--done")}>
                  <div className="op-item-check">{done && <Icon name="check" size={18} strokeWidth={3} />}</div>
                  <div className="op-item-body">
                    <div className="op-item-name">{line.item!.name} <span style={{ color: "var(--op-mut)", fontWeight: 500 }}>{line.item!.variant}</span></div>
                    <div className="op-item-sku">{line.sku} - {line.item!.code}</div>
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
                  <div className={cn("op-fb-top", feedback.kind === "ok" ? "op-fb-ok" : "op-fb-bad")}><Icon name={feedback.kind === "ok" ? "checkCircle" : "alertCircle"} size={17} />{feedback.kind === "ok" ? "Confirmado" : "Bloqueado"}</div>
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
        {mode !== "embalagem" && <button className="op-fbtn" onClick={undo} disabled={!log.some((entry) => entry.kind === "ok" && entry.sku && entry.stage === currentStage)}><Icon name="undo" size={18} /> Desfazer</button>}
        <div style={{ flex: 1, color: "var(--op-mut)", fontSize: 13.5 }}>
          {modeBlocked
            ? modeBlocked
            : mode === "embalagem"
              ? (packComplete ? "Checklist completo - pode marcar pronto para envio." : `Faltam ${PACK_CHECKLIST.length - checksDone} itens do checklist.`)
              : (currentComplete ? `${stageLabel(mode)} completa - finalize a etapa.` : `Faltam ${totalNeed - totalDone} itens para finalizar ${stageLabel(mode).toLowerCase()}.`)}
        </div>
        <button className="op-fbtn op-fbtn--primary" disabled={!canFinalize || !!modeBlocked} onClick={finishStage}>
          <Icon name={mode === "embalagem" ? "truck" : "check"} size={18} /> {mode === "embalagem" ? "Marcar pronto p/ envio" : "Finalizar etapa"}
        </button>
      </div>

      {finished && (
        <div className="op-done">
          <div className="op-done-card">
            <div className="op-done-ring"><Icon name="check" size={42} strokeWidth={2.4} /></div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
              {mode === "embalagem" ? "Pedido pronto para envio" : `${stageLabel(mode)} concluida`}
            </div>
            <div style={{ color: "var(--op-mut)", fontSize: 14.5, marginBottom: 24 }}>{order.num} - {order.customerName}</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              {mode === "separacao" && <button className="op-fbtn op-fbtn--amber" onClick={() => { setFinished(false); setMode("conferencia"); }}><Icon name="listChecks" size={18} /> Ir para conferencia</button>}
              {mode === "conferencia" && <button className="op-fbtn op-fbtn--amber" onClick={() => { setFinished(false); setMode("embalagem"); }}><Icon name="package2" size={18} /> Ir para embalagem</button>}
              <button className="op-fbtn" onClick={exit}>Voltar aos pedidos</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
