"use client";

import * as React from "react";
import { Card, Icon } from "@/components/ui";
import type { Route } from "@/lib/types";

const ENTITIES: { key: string; label: string; sub: string }[] = [
  { key: "items", label: "Itens / SKUs", sub: "Catalogo com preco, custo e status" },
  { key: "stock", label: "Estoque atual", sub: "Saldos fisico, reservado e disponivel" },
  { key: "orders", label: "Pedidos", sub: "Pedidos com status, total e rastreio" },
  { key: "customers", label: "Clientes", sub: "Base de clientes" },
  { key: "suppliers", label: "Fornecedores", sub: "Fornecedores cadastrados" },
  { key: "finance", label: "Financeiro", sub: "Entradas e saidas gerenciais" },
];

export function ExportPanel() {
  return (
    <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
      {ENTITIES.map((entity) => (
        <Card key={entity.key} className="task" style={{ display: "block" }}>
          <div className="row between" style={{ marginBottom: 10 }}>
            <div className="chip chip--brand chip--lg"><Icon name="fileText" size={19} /></div>
          </div>
          <div style={{ fontWeight: 650, fontSize: 15.5 }}>{entity.label}</div>
          <div className="muted" style={{ fontSize: 12.5, marginBottom: 14 }}>{entity.sub}</div>
          <a className="om-btn om-btn--default om-btn--sm" href={`/api/app/export?entity=${entity.key}`} download>
            <Icon name="fileText" size={15} /> Baixar CSV
          </a>
        </Card>
      ))}
    </div>
  );
}

export function ExportsScreen(_props: { route: Route }) {
  return (
    <div className="page page--wide fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-h1">Exportar dados</h1>
          <p className="page-lede">Baixe seus dados em CSV (UTF-8, separador “;”). Tokens e segredos nunca são exportados.</p>
        </div>
      </div>
      <ExportPanel />
    </div>
  );
}
