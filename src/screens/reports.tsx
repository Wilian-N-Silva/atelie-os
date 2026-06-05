"use client";

import { Button, Card, Icon } from "@/components/ui";

const REPORTS = [
  { id: "stock-ledger", title: "Livro de estoque", sub: "Movimentos, origem e quantidade", icon: "estoque" },
  { id: "orders", title: "Pedidos", sub: "Cabecalho, status, pagamento e total", icon: "pedidos" },
  { id: "order-lines", title: "Itens de pedido", sub: "Linhas vendidas por SKU", icon: "itens" },
  { id: "purchases", title: "Compras", sub: "Recebimentos e fornecedores", icon: "inbox" },
  { id: "finance", title: "Financeiro", sub: "Entradas, saidas e pendencias", icon: "banknote" },
  { id: "audit", title: "Auditoria", sub: "Acoes criticas exportadas", icon: "fileText" },
];

export function ReportsScreen() {
  return (
    <div className="page page--wide fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-h1">Relatorios</h1>
          <p className="page-lede">Exports CSV para conferencia e reconciliacao</p>
        </div>
      </div>

      <div className="grid cols-3" style={{ gap: 14 }}>
        {REPORTS.map((report) => (
          <Card key={report.id}>
            <div className="om-card-body">
              <div className="row" style={{ gap: 10, marginBottom: 12 }}>
                <div className="chip chip--brand"><Icon name={report.icon} size={17} /></div>
                <div>
                  <div style={{ fontWeight: 700 }}>{report.title}</div>
                  <div className="muted" style={{ fontSize: 12.5 }}>{report.sub}</div>
                </div>
              </div>
              <Button icon="arrowDown" variant="outline" onClick={() => { window.location.href = `/api/app/reports/${report.id}`; }}>
                Baixar CSV
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
