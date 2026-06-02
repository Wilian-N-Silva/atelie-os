"use client";

import * as React from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Empty,
  Icon,
  Sep,
  Stat,
} from "@/components/ui";
import { fetchDashboard, type DashboardResponse, type DashboardStockItem } from "@/lib/dashboard";
import { BRL, num } from "@/lib/format";
import type { Go, Session } from "@/lib/types";

export function Dashboard({ go, session }: { go: Go; session: Session }) {
  const [dashboard, setDashboard] = React.useState<DashboardResponse | null>(null);
  const [stockError, setStockError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;

    fetchDashboard()
      .then((data) => {
        if (!alive) return;
        setDashboard(data);
        setStockError(null);
      })
      .catch(() => {
        if (!alive) return;
        setStockError("Estoque indisponivel no momento.");
      });

    return () => {
      alive = false;
    };
  }, []);

  const lowStock: DashboardStockItem[] = dashboard?.stockSummary.lowStock ?? [];
  const firstName = session.user.name.trim().split(/\s+/)[0] ?? "";

  const tasks = [
    { n: 0, label: "Pagos a separar", sub: "pedidos conectados ao banco", icon: "pedidos", tone: "info", to: { screen: "pedidos", filter: "a_separar" } },
    { n: 0, label: "Separados a embalar", sub: "aguardando modulo de pedidos", icon: "package2", tone: "info", to: { screen: "pedidos", filter: "separado" } },
    { n: 0, label: "Prontos para envio", sub: "aguardando modulo de envio", icon: "truck", tone: "ok", to: { screen: "pedidos", filter: "pronto_envio" } },
    { n: 0, label: "Lotes para revisar", sub: "aguardando modulo de producao", icon: "listChecks", tone: "warn", to: { screen: "producao", filter: "aguardando_revisao" } },
  ];

  return (
    <div className="page page--wide fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-h1">Boa tarde{firstName ? `, ${firstName}` : ""}</h1>
          <p className="page-lede">
            O painel ja usa dados reais de estoque. Pedidos, producao e financeiro entram nos proximos modulos DB-backed.
          </p>
        </div>
        <div className="row-wrap">
          <Button variant="outline" icon="plus" onClick={() => go("pedidos")}>Novo pedido</Button>
          <Button variant="outline" icon="producao" onClick={() => go("producao")}>Nova producao</Button>
          <Button variant="default" icon="scan" onClick={() => go("operacao")}>Modo Operacao</Button>
        </div>
      </div>

      <div className="grid cols-4" style={{ marginBottom: "var(--gap)" }}>
        {tasks.map((t) => (
          <div className="task" key={t.label} onClick={() => go(t.to.screen, t.to)}>
            <div className="task-top">
              <div className={`chip chip--${t.tone}`}><Icon name={t.icon} size={18} /></div>
              <div className="task-n">{t.n}</div>
              <Icon name="arrowRight" size={18} className="task-go" />
            </div>
            <div>
              <div className="task-label">{t.label}</div>
              <div className="task-sub">{t.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.55fr 1fr" }}>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Fila do dia</CardTitle>
              <div className="section-hint" style={{ marginTop: 2 }}>Pedidos ainda nao estao conectados ao banco</div>
            </div>
            <Button variant="ghost" size="sm" iconRight="arrowRight" onClick={() => go("pedidos")}>Ver pedidos</Button>
          </CardHeader>
          <CardContent style={{ paddingTop: 6 }}>
            <Empty icon="pedidos" title="Sem pedidos reais por enquanto" hint="Esta fila sera preenchida quando o modulo de pedidos for DB-backed." />
          </CardContent>
        </Card>

        <div className="grid" style={{ gridTemplateColumns: "1fr", gap: "var(--gap)" }}>
          <Card>
            <CardHeader>
              <CardTitle><span className="row" style={{ gap: 8 }}><Icon name="alert" size={16} className="om-text--bad" />Abaixo do minimo</span></CardTitle>
              <Badge tone="bad">{dashboard?.cards.belowMinimum ?? 0}</Badge>
            </CardHeader>
            <CardContent style={{ paddingTop: 4 }}>
              {stockError && <div className="section-hint" style={{ marginBottom: 8 }}>{stockError}</div>}
              {!stockError && lowStock.length === 0 && (
                <Empty icon="checkCircle" title="Estoque em ordem" hint="Nenhum item abaixo do minimo no painel atual." />
              )}
              {lowStock.slice(0, 4).map((item) => (
                <div className="lrow om-row-click" key={item.id} onClick={() => go("itens", { open: item.code })}>
                  <div className="lrow-main">
                    <div className="lrow-title">{item.name} {item.variant && <span className="muted" style={{ fontWeight: 400 }}>{item.variant}</span>}</div>
                    <div className="lrow-sub sku">{item.sku}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 650, fontSize: 13.5 }} className="om-text--bad">{num(item.available)} {item.unit}</div>
                    <div className="lrow-sub">min. {item.min}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle><span className="row" style={{ gap: 8 }}><Icon name="thermometer" size={16} className="om-text--cure" />Em cura</span></CardTitle>
              <Button variant="ghost" size="sm" iconRight="arrowRight" onClick={() => go("producao", { filter: "em_cura" })}>Ver</Button>
            </CardHeader>
            <CardContent style={{ paddingTop: 4 }}>
              <Empty icon="producao" title="Producao ainda nao conectada" hint="Lotes em cura serao exibidos quando producao for DB-backed." />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="block-label">Financeiro gerencial</div>
              <div className="grid cols-2" style={{ gap: 12 }}>
                <Stat label="A receber" value={BRL(0)} tone="info" />
                <Stat label="A pagar" value={BRL(0)} tone="bad" />
              </div>
              <Sep style={{ margin: "14px 0" }} />
              <div className="row between">
                <span className="muted" style={{ fontSize: 13 }}>Modulo financeiro ainda nao conectado</span>
                <Badge tone="neutral">0%</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
