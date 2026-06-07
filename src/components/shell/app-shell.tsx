"use client";
/* ============================================================
   app-shell.tsx — AppShell: sidebar, topbar, account menu,
   breadcrumbs, mobile drawer. Ported from shell.jsx.
   ============================================================ */
import * as React from "react";
import { cn, Icon, Avatar, ROLE_LABELS } from "@/components/ui";
import type { Go, Route, SessionUser } from "@/lib/types";

export const NAV = [
  { group: "Operação", items: [
    { id: "hoje", label: "Hoje no ateliê", icon: "hoje" },
    { id: "pedidos", label: "Pedidos", icon: "pedidos" },
    { id: "importacoes", label: "Importar pedidos", icon: "inbox" },
    { id: "producao", label: "Produção", icon: "producao" },
  ] },
  { group: "Catálogo & estoque", items: [
    { id: "itens", label: "Itens / SKUs", icon: "itens" },
    { id: "receitas", label: "Receitas", icon: "receitas" },
    { id: "precificacao", label: "Precificação", icon: "trendUp" },
    { id: "estoque", label: "Estoque", icon: "estoque" },
    { id: "reposicao", label: "Reposição", icon: "refresh" },
    { id: "compras", label: "Compras", icon: "inbox" },
    { id: "etiquetas", label: "Etiquetas", icon: "tag" },
  ] },
  { group: "Gestão", items: [
    { id: "financeiro", label: "Financeiro", icon: "banknote" },
    { id: "relatorios", label: "Relatórios", icon: "fileText" },
    { id: "incidentes", label: "Incidentes", icon: "alertCircle" },
  ] },
  { group: "Conteúdo", items: [
    { id: "ia", label: "Conteúdo IA", icon: "ia" },
  ] },
  { group: "Sistema", items: [
    { id: "auditoria", label: "Auditoria", icon: "fileText" },
    { id: "configuracoes", label: "Configurações", icon: "settings" },
    { id: "manual", label: "Manual & ajuda", icon: "fileText" },
  ] },
] as const;

export const PAGE_META: Record<string, { title: string; sub: string }> = {
  hoje: { title: "Hoje no ateliê", sub: "Painel operacional" },
  pedidos: { title: "Pedidos", sub: "Separação · embalagem · envio" },
  importacoes: { title: "Importar pedidos", sub: "Marketplaces · CSV e mapeamento de SKU" },
  producao: { title: "Produção", sub: "Ordens, cura e liberação" },
  qualidade: { title: "Qualidade", sub: "Revisão de lotes e liberação pós-cura" },
  itens: { title: "Itens / SKUs", sub: "Catálogo do ateliê" },
  receitas: { title: "Receitas", sub: "Fórmulas e testes" },
  precificacao: { title: "Precificação", sub: "Custo, margem e preço sugerido" },
  estoque: { title: "Estoque", sub: "Saldos · lotes · movimentos" },
  contagem: { title: "Contagem de estoque", sub: "Conferência física e ajustes" },
  reposicao: { title: "Reposição", sub: "Sugestões de compra e produção" },
  compras: { title: "Compras", sub: "Fornecedores e recebimentos" },
  financeiro: { title: "Financeiro", sub: "Entradas, saídas e pendências" },
  relatorios: { title: "Relatórios", sub: "Exports CSV operacionais" },
  incidentes: { title: "Incidentes", sub: "Trocas, devoluções e perdas" },
  etiquetas: { title: "Etiquetas", sub: "Editor de modelos e impressão" },
  ia: { title: "Conteúdo IA", sub: "Textos na voz da marca" },
  auditoria: { title: "Auditoria", sub: "Ações críticas e rastreabilidade" },
  configuracoes: { title: "Configurações", sub: "White-label · marca, fluxos, etiquetas" },
  manual: { title: "Manual & ajuda", sub: "Guia de uso do sistema" },
};

export function AppShell({ route, go, theme, setTheme, unread, onOpenCmd, onOpenNotif, user, company, logoUrl, onSignOut, children }: {
  route: Route; go: Go; theme: string; setTheme: (t: string) => void; unread: number;
  onOpenCmd: () => void; onOpenNotif: () => void;
  user?: SessionUser; company?: string | null; logoUrl?: string | null; onSignOut?: () => void; children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [acctOpen, setAcctOpen] = React.useState(false);
  const [isMac, setIsMac] = React.useState(false);
  const [collapsedGroups, setCollapsedGroups] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    try { setCollapsedGroups(new Set(JSON.parse(localStorage.getItem("atelie-nav-collapsed") || "[]"))); } catch {}
  }, []);
  const toggleGroup = (group: string) => setCollapsedGroups((prev) => {
    const next = new Set(prev);
    if (next.has(group)) next.delete(group); else next.add(group);
    localStorage.setItem("atelie-nav-collapsed", JSON.stringify([...next]));
    return next;
  });
  const meta = PAGE_META[route.screen] || { title: "", sub: "" };

  React.useEffect(() => { setMobileOpen(false); }, [route.screen]);
  React.useEffect(() => {
    setIsMac(typeof navigator !== "undefined" && /Mac/.test(navigator.platform));
  }, []);
  React.useEffect(() => {
    if (!acctOpen) return;
    const h = () => setAcctOpen(false);
    const id = setTimeout(() => document.addEventListener("click", h), 0);
    return () => { clearTimeout(id); document.removeEventListener("click", h); };
  }, [acctOpen]);

  const me = user || { name: "Usuario", email: "", role: "owner" as const };
  const roleLabel = ROLE_LABELS[me.role] || me.role;
  const brandName = company || "Atelie OS";

  return (
    <div className="app">
      {mobileOpen && <div className="sb-backdrop" onClick={() => setMobileOpen(false)} />}
      <aside className={cn("sb", mobileOpen && "sb--open")}>
        <div className="sb-brand">
          <div className="sb-mark">{logoUrl ? <img src={logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 8 }} /> : <Icon name="flame" size={18} strokeWidth={2.2} />}</div>
          <div>
            <div className="sb-brand-name">{brandName}</div>
            <div className="sb-brand-sub">Ateliê OS</div>
          </div>
        </div>

        <button className="sb-op" onClick={() => go("operacao")}>
          <Icon name="scan" size={20} />
          <div>
            <div>Modo Operação</div>
            <div className="sb-op-sub">Bancada · scanner ou manual</div>
          </div>
        </button>

        <nav className="sb-nav">
          {NAV.map((grp) => {
            const hasActive = grp.items.some((it) => it.id === route.screen);
            const open = hasActive || !collapsedGroups.has(grp.group);
            return (
              <div className="sb-group" key={grp.group}>
                <button
                  type="button"
                  className="sb-group-label"
                  onClick={() => toggleGroup(grp.group)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", cursor: "pointer" }}
                >
                  <span>{grp.group}</span>
                  <Icon name={open ? "chevronUp" : "chevronRight"} size={13} />
                </button>
                {open && grp.items.map((it) => (
                  <button key={it.id}
                    className={cn("sb-item", route.screen === it.id && "sb-item--active")}
                    onClick={() => go(it.id)}>
                    <Icon name={it.icon} size={18} className="sb-item-icon" />
                    {it.label}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="sb-foot acct-wrap">
          <button className="acct-trigger" onClick={(e) => { e.stopPropagation(); setAcctOpen((o) => !o); }}>
            <Avatar name={me.name} size={32} />
            <div className="sb-foot-meta">
              <div className="sb-foot-name">{me.name}</div>
              <div className="sb-foot-role">{roleLabel}</div>
            </div>
            <div className="spacer" />
            <Icon name="chevronUp" size={16} className="muted" />
          </button>
          {acctOpen && (
            <div className="acct-menu" onClick={(e) => e.stopPropagation()}>
              <div className="acct-card">
                <Avatar name={me.name} size={38} />
                <div style={{ minWidth: 0 }}>
                  <div className="acct-card-name">{me.name}</div>
                  <div className="acct-card-mail">{me.email}</div>
                </div>
              </div>
              <div className="acct-co"><span className="acct-co-dot" />{brandName} · {roleLabel}</div>
              <div className="um-menu-sep" />
              <button className="acct-item" onClick={() => { setAcctOpen(false); go("configuracoes", { tab: "users" }); }}><Icon name="user" size={16} /> Usuários e acessos</button>
              <button className="acct-item" onClick={() => { setAcctOpen(false); go("configuracoes"); }}><Icon name="settings" size={16} /> Configurações</button>
              <div className="um-menu-sep" />
              <button className="acct-item acct-item--bad" onClick={() => { setAcctOpen(false); onSignOut && onSignOut(); }}><Icon name="arrowLeft" size={16} /> Sair do ateliê</button>
            </div>
          )}
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setMobileOpen(true)}><Icon name="menu" size={19} /></button>
          <nav className="crumbs" aria-label="Trilha">
            <button className="crumb crumb--root" onClick={() => go("hoje")}>Ateliê OS</button>
            {(() => {
              const grp = NAV.find((g) => g.items.some((it) => it.id === route.screen));
              const els: React.ReactNode[] = [];
              if (grp) els.push(<span key="g" className="crumb crumb--muted">{grp.group}</span>);
              els.push(<span key="p" className="crumb crumb--current">{meta.title}</span>);
              if (route.screen === "configuracoes" && route.tab) {
                const tabNames: Record<string, string> = { branding: "Aparência da marca", users: "Usuários e acessos", workflows: "Fluxos e Kanban", labels: "Modelos de etiqueta", shipping: "Envio" };
                els.push(<span key="t" className="crumb crumb--current">{tabNames[route.tab] || ""}</span>);
              }
              return els.map((el, i) => <React.Fragment key={i}><Icon name="chevronRight" size={14} className="crumb-sep" />{el}</React.Fragment>);
            })()}
          </nav>
          <div className="topbar-spacer" />
          <button className="topbar-search-btn" onClick={onOpenCmd}>
            <Icon name="search" size={15} />
            <span className="topbar-search-txt">Buscar SKU, código, pedido…</span>
            <span className="topbar-kbd">
              <kbd>{isMac ? "⌘" : "Ctrl"}</kbd><kbd>K</kbd>
            </span>
          </button>
          <button className="icon-btn" title={theme === "dark" ? "Tema claro" : "Tema escuro"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
          </button>
          <button className="icon-btn" title="Notificações" data-notif-trigger onClick={onOpenNotif}>
            <Icon name="bell" size={18} />{unread > 0 && <span className="icon-btn-dot" />}
          </button>
        </header>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
