"use client";

import * as React from "react";
import { cn, Empty, Icon } from "@/components/ui";
import type { Go, Route } from "@/lib/types";

interface Hit {
  id: string;
  kind: string;
  icon: string;
  title: string;
  sub?: string;
  meta?: string;
  go: Partial<Route> & { screen: string };
}

export function CommandPalette({ open, onClose, go }: { open: boolean; onClose: () => void; go: Go }) {
  const [q, setQ] = React.useState("");
  const [active, setActive] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const nav: Hit[] = [
    { id: "n-hoje", kind: "nav", icon: "hoje", title: "Hoje no atelie", sub: "Dashboard", go: { screen: "hoje" } },
    { id: "n-pedidos", kind: "nav", icon: "pedidos", title: "Pedidos", sub: "Separacao e envio", go: { screen: "pedidos" } },
    { id: "n-op", kind: "nav", icon: "scan", title: "Modo Operacao", sub: "Bancada e scanner", go: { screen: "operacao" } },
    { id: "n-prod", kind: "nav", icon: "producao", title: "Producao", sub: "Ordens e cura", go: { screen: "producao" } },
    { id: "n-itens", kind: "nav", icon: "itens", title: "Itens / SKUs", sub: "Catalogo", go: { screen: "itens" } },
    { id: "n-receitas", kind: "nav", icon: "receitas", title: "Receitas", sub: "Formulas", go: { screen: "receitas" } },
    { id: "n-estoque", kind: "nav", icon: "estoque", title: "Estoque", sub: "Saldos e movimentos", go: { screen: "estoque" } },
    { id: "n-compras", kind: "nav", icon: "inbox", title: "Compras", sub: "Fornecedores e recebimentos", go: { screen: "compras" } },
    { id: "n-financeiro", kind: "nav", icon: "banknote", title: "Financeiro", sub: "Entradas e saidas", go: { screen: "financeiro" } },
    { id: "n-relatorios", kind: "nav", icon: "fileText", title: "Relatorios", sub: "Exports CSV", go: { screen: "relatorios" } },
    { id: "n-incidentes", kind: "nav", icon: "alertCircle", title: "Incidentes", sub: "Trocas e devolucoes", go: { screen: "incidentes" } },
    { id: "n-etiq", kind: "nav", icon: "tag", title: "Etiquetas", sub: "Editor e impressao", go: { screen: "etiquetas" } },
    { id: "n-ia", kind: "nav", icon: "ia", title: "Conteudo IA", sub: "Textos da marca", go: { screen: "ia" } },
    { id: "n-auditoria", kind: "nav", icon: "fileText", title: "Auditoria", sub: "Acoes criticas", go: { screen: "auditoria" } },
    { id: "n-settings", kind: "nav", icon: "settings", title: "Configuracoes", sub: "Marca, fluxos e acessos", go: { screen: "configuracoes" } },
    { id: "n-manual", kind: "nav", icon: "fileText", title: "Manual & ajuda", sub: "Guia de uso", go: { screen: "manual" } },
  ];

  const actions: Hit[] = [
    { id: "a-novo-pedido", kind: "action", icon: "plus", title: "Novo pedido", sub: "Acao rapida", go: { screen: "pedidos" } },
    { id: "a-nova-prod", kind: "action", icon: "plus", title: "Planejar producao", sub: "Acao rapida", go: { screen: "producao" } },
    { id: "a-etiqueta", kind: "action", icon: "printer", title: "Imprimir etiquetas", sub: "Acao rapida", go: { screen: "etiquetas" } },
  ];

  const ql = q.trim().toLowerCase();
  const match = (s: unknown) => !ql || String(s).toLowerCase().includes(ql);
  const navHits = nav.filter((n) => match(n.title) || match(n.sub));
  const actHits = actions.filter((a) => match(a.title) || match(a.sub));

  const groups = ql
    ? [
        { label: "Ir para", items: navHits },
        { label: "Acoes", items: actHits },
      ].filter((g) => g.items.length)
    : [
        { label: "Ir para", items: nav },
        { label: "Acoes rapidas", items: actions },
      ];

  const flat = groups.flatMap((g) => g.items);
  React.useEffect(() => { setActive(0); }, [q]);

  const choose = (it?: Hit) => {
    if (!it) return;
    onClose();
    go(it.go.screen, it.go);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(flat.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(flat[active]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!open) return null;

  let idx = -1;

  return (
    <div className="cmdk-backdrop" onClick={onClose}>
      <div className="cmdk" onClick={(e) => e.stopPropagation()}>
        <div className="cmdk-field">
          <Icon name="search" size={20} className="muted" />
          <input
            ref={inputRef}
            className="cmdk-input"
            placeholder="Buscar telas e acoes..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
          />
          <span className="cmdk-kbd">ESC</span>
        </div>
        <div className="cmdk-list">
          {flat.length === 0 && <Empty icon="search" title="Nada encontrado" hint={`Sem resultados para "${q}".`} />}
          {groups.map((g) => (
            <div key={g.label}>
              <div className="cmdk-group-label">{g.label}</div>
              {g.items.map((it) => {
                idx++;
                const me = idx;

                return (
                  <div
                    key={it.id}
                    className={cn("cmdk-item", active === me && "cmdk-item--active")}
                    onMouseEnter={() => setActive(me)}
                    onClick={() => choose(it)}
                  >
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
          <span><kbd>Up</kbd><kbd>Down</kbd> navegar</span>
          <span><kbd>Enter</kbd> abrir</span>
          <span><kbd>esc</kbd> fechar</span>
        </div>
      </div>
    </div>
  );
}
