"use client";
/* ============================================================
   command-palette.tsx — ⌘K palette. Ported from command.jsx.
   ============================================================ */
import * as React from "react";
import { cn, Icon, Empty } from "@/components/ui";
import { items, orders, production, recipes, ORDER_STATUS, PROD_STATUS } from "@/lib/data";
import type { Go, Route } from "@/lib/types";

interface Hit { id: string; kind: string; icon: string; title: string; sub?: string; meta?: string; go: Partial<Route> & { screen: string } }

export function CommandPalette({ open, onClose, go }: { open: boolean; onClose: () => void; go: Go }) {
  const [q, setQ] = React.useState("");
  const [active, setActive] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) { setQ(""); setActive(0); setTimeout(() => inputRef.current?.focus(), 30); }
  }, [open]);

  const nav: Hit[] = [
    { id: "n-hoje", kind: "nav", icon: "hoje", title: "Hoje no ateliê", sub: "Dashboard", go: { screen: "hoje" } },
    { id: "n-pedidos", kind: "nav", icon: "pedidos", title: "Pedidos", sub: "Separação e envio", go: { screen: "pedidos" } },
    { id: "n-op", kind: "nav", icon: "scan", title: "Modo Operação", sub: "Bancada · scanner", go: { screen: "operacao" } },
    { id: "n-prod", kind: "nav", icon: "producao", title: "Produção", sub: "Ordens e cura", go: { screen: "producao" } },
    { id: "n-itens", kind: "nav", icon: "itens", title: "Itens / SKUs", sub: "Catálogo", go: { screen: "itens" } },
    { id: "n-receitas", kind: "nav", icon: "receitas", title: "Receitas", sub: "Fórmulas", go: { screen: "receitas" } },
    { id: "n-estoque", kind: "nav", icon: "estoque", title: "Estoque", sub: "Saldos e movimentos", go: { screen: "estoque" } },
    { id: "n-etiq", kind: "nav", icon: "tag", title: "Etiquetas", sub: "Editor e impressão", go: { screen: "etiquetas" } },
    { id: "n-ia", kind: "nav", icon: "ia", title: "Conteúdo IA", sub: "Textos da marca", go: { screen: "ia" } },
  ];
  const actions: Hit[] = [
    { id: "a-novo-pedido", kind: "action", icon: "plus", title: "Novo pedido", sub: "Ação rápida", go: { screen: "pedidos" } },
    { id: "a-nova-prod", kind: "action", icon: "plus", title: "Planejar produção", sub: "Ação rápida", go: { screen: "producao" } },
    { id: "a-etiqueta", kind: "action", icon: "printer", title: "Imprimir etiquetas", sub: "Ação rápida", go: { screen: "etiquetas" } },
  ];

  const ql = q.trim().toLowerCase();
  const match = (s: unknown) => !ql || String(s).toLowerCase().includes(ql);

  const itemHits: Hit[] = ql ? items.filter((i) => match(i.name) || match(i.sku) || match(i.code) || match(i.variant)).slice(0, 6).map((i) => ({
    id: "i-" + i.code, kind: "item", icon: i.type === "mp" ? "droplet" : i.type === "emb" ? "box" : "flame",
    title: `${i.name} ${i.variant}`, sub: i.sku, meta: i.code, go: { screen: "itens", open: i.code },
  })) : [];
  const orderHits: Hit[] = ql ? orders.filter((o) => match(o.num) || match(o.customerName) || match(o.code)).slice(0, 5).map((o) => ({
    id: "o-" + o.id, kind: "order", icon: "pedidos", title: `${o.num} · ${o.customerName}`,
    sub: ORDER_STATUS[o.status].label, meta: o.code, go: { screen: "pedidos", open: o.id },
  })) : [];
  const prodHits: Hit[] = ql ? production.filter((p) => match(p.num) || match(p.productName) || match(p.code)).slice(0, 4).map((p) => ({
    id: "p-" + p.id, kind: "prod", icon: "producao", title: `${p.num} · ${p.productName}`,
    sub: PROD_STATUS[p.status].label, meta: p.code, go: { screen: "producao" },
  })) : [];
  const recipeHits: Hit[] = ql ? recipes.filter((r) => match(r.name) || match(r.productName)).slice(0, 3).map((r) => ({
    id: "r-" + r.id, kind: "recipe", icon: "receitas", title: `${r.name} ${r.version}`, sub: r.productName, go: { screen: "receitas", open: r.id },
  })) : [];

  const navHits = nav.filter((n) => match(n.title) || match(n.sub));
  const actHits = actions.filter((a) => match(a.title));

  const groups = ql
    ? [
        { label: "Itens", items: itemHits },
        { label: "Pedidos", items: orderHits },
        { label: "Produção", items: prodHits },
        { label: "Receitas", items: recipeHits },
        { label: "Ir para", items: navHits },
        { label: "Ações", items: actHits },
      ].filter((g) => g.items.length)
    : [
        { label: "Ir para", items: nav },
        { label: "Ações rápidas", items: actions },
      ];

  const flat = groups.flatMap((g) => g.items);
  React.useEffect(() => { setActive(0); }, [q]);

  const choose = (it?: Hit) => { if (!it) return; onClose(); go(it.go.screen, it.go); };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(flat.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); choose(flat[active]); }
    else if (e.key === "Escape") { onClose(); }
  };

  if (!open) return null;
  let idx = -1;
  return (
    <div className="cmdk-backdrop" onClick={onClose}>
      <div className="cmdk" onClick={(e) => e.stopPropagation()}>
        <div className="cmdk-field">
          <Icon name="search" size={20} className="muted" />
          <input ref={inputRef} className="cmdk-input" placeholder="Buscar item, pedido, SKU, código…"
            value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} />
          <span className="cmdk-kbd">ESC</span>
        </div>
        <div className="cmdk-list">
          {flat.length === 0 && <Empty icon="search" title="Nada encontrado" hint={`Sem resultados para “${q}”.`} />}
          {groups.map((g) => (
            <div key={g.label}>
              <div className="cmdk-group-label">{g.label}</div>
              {g.items.map((it) => {
                idx++; const me = idx;
                return (
                  <div key={it.id} className={cn("cmdk-item", active === me && "cmdk-item--active")}
                    onMouseEnter={() => setActive(me)} onClick={() => choose(it)}>
                    <div className="cmdk-item-ico"><Icon name={it.icon} size={16} /></div>
                    <div className="cmdk-item-main">
                      <div className="cmdk-item-title">{it.title}</div>
                      {it.sub && <div className="cmdk-item-sub">{it.sub}</div>}
                    </div>
                    {it.meta && <span className="cmdk-item-meta mono">{it.meta}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="cmdk-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
          <span><kbd>↵</kbd> abrir</span>
          <span><kbd>esc</kbd> fechar</span>
        </div>
      </div>
    </div>
  );
}
