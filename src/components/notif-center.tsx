"use client";
/* ============================================================
   notif-center.tsx — notifications dialog. Ported from command.jsx.
   ============================================================ */
import * as React from "react";
import { cn, Icon, Badge, Empty } from "@/components/ui";
import type { Go } from "@/lib/types";

export interface Notification {
  id: string;
  group: string;
  severity: "critical" | "warning" | "info";
  icon: string;
  tone: "ok" | "warn" | "info" | "bad" | "cure" | "neutral";
  title: string;
  desc: string;
  action: { screen: string; filter?: string };
  actionLabel: string;
  critical?: boolean;
}

type NotifWithStatus = Notification & { status: "unread" | "read" | "resolved" };

export function NotifCenter({ notifications, unread, markRead, markResolved, markAllRead, go, onClose }: {
  notifications: NotifWithStatus[]; unread: number;
  markRead: (id: string) => void; markResolved: (id: string) => void; markAllRead: () => void;
  go: Go; onClose: () => void;
}) {
  const [tab, setTab] = React.useState("todas");
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const shown = notifications.filter((n) => {
    if (n.status === "resolved") return tab === "resolvidas";
    if (tab === "nao-lidas") return n.status === "unread";
    if (tab === "resolvidas") return false;
    return true;
  });

  const handleAction = (n: NotifWithStatus) => { markRead(n.id); onClose(); go(n.action.screen, n.action); };

  return (
    <div className="notif-backdrop" onClick={onClose}>
      <div className="notif-pop" onClick={(e) => e.stopPropagation()}>
        <div className="notif-head">
          <Icon name="bell" size={17} />
          <span className="notif-head-title">Notificações</span>
          {unread > 0 && <Badge tone="bad">{unread} novas</Badge>}
          <div className="spacer" style={{ flex: 1 }} />
          <button className="notif-resolve" onClick={markAllRead}>Marcar lidas</button>
          <button className="icon-btn" style={{ height: 30, width: 30 }} onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <div className="notif-tabs">
          {([["todas", "Todas"], ["nao-lidas", "Não lidas"], ["resolvidas", "Resolvidas"]] as const).map(([v, l]) => (
            <button key={v} className={cn("notif-tab", tab === v && "notif-tab--on")} onClick={() => setTab(v)}>{l}</button>
          ))}
        </div>
        <div className="notif-list">
          {shown.length === 0 && <Empty icon="checkCircle" title="Tudo em ordem" hint="Nenhuma notificação nesta aba." />}
          {shown.map((n) => (
            <div key={n.id} className={cn("notif-item", n.status === "unread" && "notif-item--unread", n.status === "resolved" && "notif-item--resolved")}
              onClick={() => markRead(n.id)}>
              <div className={cn("notif-ico", `chip--${n.tone}`)}><Icon name={n.icon} size={17} /></div>
              <div className="notif-main">
                {n.critical && <div className="notif-crit">Crítico</div>}
                <div className="notif-title">{n.title}</div>
                <div className="notif-desc">{n.desc}</div>
                <div className="notif-act">
                  <button className="notif-actbtn" onClick={(e) => { e.stopPropagation(); handleAction(n); }}>
                    {n.actionLabel} <Icon name="arrowRight" size={13} />
                  </button>
                  {n.status !== "resolved"
                    ? <button className="notif-resolve" onClick={(e) => { e.stopPropagation(); markResolved(n.id); }}>Resolver</button>
                    : <span className="notif-resolve" style={{ color: "hsl(var(--ok))" }}><Icon name="check" size={13} style={{ verticalAlign: "-2px" }} /> resolvida</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
