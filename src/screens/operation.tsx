"use client";

import * as React from "react";
import { Icon, cn } from "@/components/ui";
import { DEMO_ITEMS, DEMO_ORDERS, findDemoItem } from "@/lib/screen-fixtures";
import type { Go, Route } from "@/lib/types";

const PACK_CHECKLIST = [
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
type Feedback = { kind: "ok" | "bad"; name: string; sub: string; fix?: string };
type LogEntry = { kind: "ok" | "bad" | "neutral"; label: string; sku?: string; time: string };

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

export function OperationScreen({ go, route }: { go: Go; route: Route }) {
  const [mode, setMode] = React.useState<OperationMode>((route.mode as OperationMode) || "separacao");
  const order = React.useMemo(
    () => DEMO_ORDERS.find((item) => item.id === route.order) ?? DEMO_ORDERS.find((item) => item.status === "pago" || item.status === "a_separar") ?? DEMO_ORDERS[0],
    [route.order],
  );
  const expected = React.useMemo(
    () => order.items.map((line) => ({ ...line, item: findDemoItem(line.sku) })).filter((line) => line.item),
    [order],
  );
  const [counts, setCounts] = React.useState<Record<string, number>>(() => Object.fromEntries(expected.map((line) => [line.sku, 0])));
  const [log, setLog] = React.useState<LogEntry[]>([]);
  const [feedback, setFeedback] = React.useState<Feedback | null>(null);
  const [scanState, setScanState] = React.useState<"focus" | "ok" | "bad">("focus");
  const [input, setInput] = React.useState("");
  const [checks, setChecks] = React.useState<boolean[]>(() => PACK_CHECKLIST.map(() => false));
  const [finished, setFinished] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const flashTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (route.mode === "separacao" || route.mode === "conferencia" || route.mode === "embalagem") setMode(route.mode);
  }, [route.mode]);

  React.useEffect(() => {
    setCounts(Object.fromEntries(expected.map((line) => [line.sku, 0])));
    setLog([]);
    setFeedback(null);
    setFinished(false);
  }, [expected]);

  React.useEffect(() => {
    if (mode !== "embalagem") inputRef.current?.focus();
  }, [mode]);

  const totalNeed = expected.reduce((sum, line) => sum + line.qty, 0);
  const totalDone = expected.reduce((sum, line) => sum + (counts[line.sku] ?? 0), 0);
  const pct = totalNeed ? Math.round((totalDone / totalNeed) * 100) : 0;
  const complete = totalDone >= totalNeed;
  const checksDone = checks.filter(Boolean).length;
  const packComplete = checksDone === PACK_CHECKLIST.length;

  const pushLog = (entry: Omit<LogEntry, "time">) => setLog((current) => [{ ...entry, time: now() }, ...current].slice(0, 12));
  const flash = (state: "ok" | "bad") => {
    setScanState(state);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setScanState("focus"), 700);
  };

  const readCode = (raw: string) => {
    const value = raw.trim().toLowerCase();
    if (!value) return;
    setInput("");

    if (value === "__cura") {
      setFeedback({ kind: "bad", name: "Lote em cura", sub: "Produto ainda descansando", fix: "Use outro lote liberado ou aguarde a cura terminar." });
      pushLog({ kind: "bad", label: "Lote em cura bloqueado" });
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
        setFeedback({ kind: "bad", name: "Quantidade excedida", sub: `${hit.item!.name} ja esta completo`, fix: "Confira se o pedido esta correto." });
        pushLog({ kind: "bad", label: `Excedido: ${hit.item!.sku}` });
        flash("bad");
        return;
      }
      setCounts((currentCounts) => ({ ...currentCounts, [hit.sku]: (currentCounts[hit.sku] ?? 0) + 1 }));
      setFeedback({ kind: "ok", name: `${hit.item!.name} ${hit.item!.variant}`, sub: `${current + 1} de ${hit.qty} - ${hit.sku}` });
      pushLog({ kind: "ok", label: `${hit.item!.name} ${hit.item!.variant}`, sku: hit.sku });
      flash("ok");
      return;
    }

    const other = DEMO_ITEMS.find((item) => item.code === value || item.sku.toLowerCase() === value);
    if (other) {
      setFeedback({ kind: "bad", name: "Item errado", sub: `${other.name} nao pertence a ${order.num}`, fix: "Separe o item correto da lista." });
      pushLog({ kind: "bad", label: `Item errado: ${other.sku}` });
      flash("bad");
      return;
    }

    setFeedback({ kind: "bad", name: "Codigo desconhecido", sub: `"${raw}" nao foi encontrado`, fix: "Busque manualmente ou confira a etiqueta." });
    pushLog({ kind: "bad", label: "Codigo desconhecido" });
    flash("bad");
  };

  const adjust = (sku: string, delta: number) => {
    const line = expected.find((item) => item.sku === sku);
    if (!line) return;
    setCounts((current) => {
      const nextValue = Math.max(0, Math.min(line.qty, (current[sku] ?? 0) + delta));
      if (nextValue === current[sku]) return current;
      pushLog({ kind: delta > 0 ? "ok" : "neutral", label: `${delta > 0 ? "+1" : "-1"} ${line.item!.name}`, sku });
      return { ...current, [sku]: nextValue };
    });
  };

  const markComplete = (sku: string) => {
    const line = expected.find((item) => item.sku === sku);
    if (!line) return;
    setCounts((current) => ({ ...current, [sku]: line.qty }));
    pushLog({ kind: "ok", label: `Completo: ${line.item!.name}`, sku });
  };

  const undo = () => {
    const last = log[0];
    if (!last) return;
    if (last.kind === "ok" && last.sku) {
      setCounts((current) => ({ ...current, [last.sku!]: Math.max(0, (current[last.sku!] ?? 0) - 1) }));
    }
    setLog((current) => current.slice(1));
    setFeedback(null);
  };

  const exit = () => go(route.order ? "pedidos" : "hoje", route.order ? { open: order.id } : {});
  const modeLabel = mode === "embalagem" ? "Embalagem" : mode === "conferencia" ? "Conferencia" : "Separacao de pedido";

  return (
    <div className="op" onClick={() => inputRef.current?.focus()}>
      <div className="op-head">
        <button className="op-exit" onClick={exit}><Icon name="x" size={18} /> Sair</button>
        <div className="op-doc">
          <span className="op-doc-mode">{modeLabel}</span>
          <span className="op-doc-title">{order.num} - {order.customerName}</span>
        </div>
        <div style={{ flex: 1 }} />
        <div className="op-modes">
          {[
            ["separacao", "Separacao", "scan"],
            ["conferencia", "Conferencia", "listChecks"],
            ["embalagem", "Embalagem", "package2"],
          ].map(([value, label, icon]) => (
            <button key={value} className={cn("op-mode", mode === value && "op-mode--on")} onClick={() => setMode(value as OperationMode)}>
              <Icon name={icon} size={15} />{label}
            </button>
          ))}
        </div>
        <div className="op-prog">
          <div className="op-prog-ring">
            <ProgressRing pct={mode === "embalagem" ? Math.round((checksDone / PACK_CHECKLIST.length) * 100) : pct} />
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
                placeholder="Bipe o codigo ou digite SKU / nome..."
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") readCode(input); }}
              />
              <span className="op-scanhint"><span className="op-pulse" /> Leitor pronto</span>
            </div>
            <div className="op-sim">
              <span className="op-sim-label">Simular leitura:</span>
              {expected.map((line) => <button key={line.sku} className="op-chip" onClick={() => readCode(line.item!.code)}><Icon name="scan" size={13} />{line.sku}</button>)}
              <button className="op-chip op-chip--bad" onClick={() => readCode("__cura")}><Icon name="thermometer" size={13} />lote em cura</button>
            </div>
          </div>
        </div>
      )}

      {mode === "embalagem" ? (
        <div className="op-body" style={{ gridTemplateColumns: "1fr" }}>
          <div className="op-col" style={{ maxWidth: 760, margin: "0 auto", width: "100%" }}>
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
            <div className="op-coltitle"><span>Itens esperados</span><span>{totalDone} / {totalNeed} bipados</span></div>
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
                    <button className="op-qbtn" onClick={() => adjust(line.sku, +1)} disabled={done}><Icon name="plus" size={16} /></button>
                    <button className="op-qbtn" onClick={() => markComplete(line.sku)} disabled={done} title="Marcar completo"><Icon name="check" size={16} /></button>
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
        {mode !== "embalagem" && <button className="op-fbtn" onClick={undo} disabled={!log.length}><Icon name="undo" size={18} /> Desfazer</button>}
        <div style={{ flex: 1, color: "var(--op-mut)", fontSize: 13.5 }}>
          {mode === "embalagem"
            ? (packComplete ? "Checklist completo - pode marcar pronto para envio." : `Faltam ${PACK_CHECKLIST.length - checksDone} itens do checklist.`)
            : (complete ? "Tudo bipado - pode finalizar a etapa." : `Faltam ${totalNeed - totalDone} itens para finalizar.`)}
        </div>
        <button className="op-fbtn op-fbtn--primary" disabled={mode === "embalagem" ? !packComplete : !complete} onClick={() => setFinished(true)}>
          <Icon name={mode === "embalagem" ? "truck" : "check"} size={18} /> {mode === "embalagem" ? "Marcar pronto p/ envio" : "Finalizar etapa"}
        </button>
      </div>

      {finished && (
        <div className="op-done">
          <div className="op-done-card">
            <div className="op-done-ring"><Icon name="check" size={42} strokeWidth={2.4} /></div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{mode === "embalagem" ? "Pedido pronto para envio" : "Etapa concluida"}</div>
            <div style={{ color: "var(--op-mut)", fontSize: 14.5, marginBottom: 24 }}>{order.num} - {order.customerName}</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              {mode !== "embalagem" && <button className="op-fbtn op-fbtn--amber" onClick={() => { setFinished(false); setMode("embalagem"); }}><Icon name="package2" size={18} /> Ir para embalagem</button>}
              <button className="op-fbtn" onClick={exit}>Voltar aos pedidos</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
