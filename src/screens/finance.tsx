"use client";

import * as React from "react";
import { Badge, Button, Card, Empty, Field, Input, Select, toast } from "@/components/ui";
import { BRL, formatBRLInput, parseBRLInput } from "@/lib/domain";
import { createFinanceEntry, loadFinance, type FinanceEntry } from "@/lib/core-ops-client";

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function FinanceScreen() {
  const [entries, setEntries] = React.useState<FinanceEntry[]>([]);
  const [type, setType] = React.useState("expense");
  const [status, setStatus] = React.useState("pending");
  const [description, setDescription] = React.useState("");
  const [amount, setAmount] = React.useState("R$ 0,00");

  React.useEffect(() => {
    loadFinance().then(setEntries).catch(() => null);
  }, []);

  const totals = entries.reduce((acc, entry) => {
    if (entry.type === "income") acc.income += entry.amount;
    if (entry.type === "expense") acc.expense += entry.amount;
    if (entry.status !== "paid") acc.pending += entry.amount;
    return acc;
  }, { income: 0, expense: 0, pending: 0 });

  const add = async () => {
    if (!description.trim() || parseBRLInput(amount) <= 0) {
      toast("Informe descrição e valor.", "bad");
      return;
    }
    try {
      setEntries(await createFinanceEntry({ type, status, description, amount: parseBRLInput(amount) }));
      setDescription("");
      setAmount("R$ 0,00");
      toast("Lançamento financeiro criado.", "ok");
    } catch {
      toast("Não foi possível criar o lançamento.", "bad");
    }
  };

  return (
    <div className="page page--wide fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-h1">Financeiro</h1>
          <p className="page-lede">Controle gerencial simples, sem função fiscal</p>
        </div>
      </div>

      <div className="grid cols-3" style={{ gap: 12 }}>
        <Card><div className="om-card-body"><div className="om-stat-label">Entradas</div><div className="om-stat-value om-text--ok">{BRL(totals.income)}</div></div></Card>
        <Card><div className="om-card-body"><div className="om-stat-label">Saídas</div><div className="om-stat-value om-text--bad">{BRL(totals.expense)}</div></div></Card>
        <Card><div className="om-card-body"><div className="om-stat-label">Pendente</div><div className="om-stat-value om-text--warn">{BRL(totals.pending)}</div></div></Card>
      </div>

      <Card style={{ marginTop: 14 }}>
        <div className="om-card-body">
          <div className="block-label">Lançamento manual</div>
          <div className="ff-grid">
            <Field label="Tipo"><Select value={type} onChange={setType} options={[{ value: "expense", label: "Saída" }, { value: "income", label: "Entrada" }]} /></Field>
            <Field label="Status"><Select value={status} onChange={setStatus} options={[{ value: "pending", label: "Pendente" }, { value: "paid", label: "Pago" }]} /></Field>
          </div>
          <div className="ff-grid">
            <Field label="Descrição"><Input value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
            <Field label="Valor"><Input value={amount} inputMode="numeric" onChange={(event) => setAmount(formatBRLInput(event.target.value))} /></Field>
          </div>
          <Button icon="plus" onClick={add}>Adicionar lançamento</Button>
        </div>
      </Card>

      <Card style={{ overflow: "hidden", marginTop: 14 }}>
        <table className="om-table">
          <thead><tr><th>Data</th><th>Descrição</th><th>Origem</th><th>Status</th><th className="om-td-right">Valor</th></tr></thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className="muted">{dateLabel(entry.createdAt)}</td>
                <td>{entry.description}</td>
                <td className="muted">{entry.sourceType ?? "manual"}</td>
                <td><Badge tone={entry.status === "paid" ? "ok" : "warn"}>{entry.status === "paid" ? "Pago" : "Pendente"}</Badge></td>
                <td className="om-td-right" style={{ fontWeight: 650 }}>{entry.type === "expense" ? "-" : "+"} {BRL(entry.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && <Empty icon="banknote" title="Nenhum lançamento financeiro" />}
      </Card>
    </div>
  );
}
