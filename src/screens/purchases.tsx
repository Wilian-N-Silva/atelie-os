"use client";

import * as React from "react";
import { Badge, Button, Card, Empty, Field, Input, Select, toast } from "@/components/ui";
import { BRL, formatBRLInput, parseBRLInput } from "@/lib/domain";
import { createPurchase, createSupplier, loadPurchases, loadSuppliers, type Purchase, type Supplier } from "@/lib/core-ops-client";
import { useItemDirectory } from "@/lib/item-directory";

function toNumber(value: string) {
  return Number(value.replace(",", ".")) || 0;
}

export function PurchasesScreen() {
  const dir = useItemDirectory();
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [purchases, setPurchases] = React.useState<Purchase[]>([]);
  const [supplierName, setSupplierName] = React.useState("");
  const [supplierId, setSupplierId] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [itemId, setItemId] = React.useState("");
  const [quantity, setQuantity] = React.useState("1");
  const [unitCost, setUnitCost] = React.useState("R$ 0,00");
  const [lot, setLot] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [supplierDocument, setSupplierDocument] = React.useState("");
  const [supplierEmail, setSupplierEmail] = React.useState("");
  const [supplierPhone, setSupplierPhone] = React.useState("");
  const [supplierNotes, setSupplierNotes] = React.useState("");

  React.useEffect(() => {
    let alive = true;
    loadSuppliers().then((next) => { if (alive) setSuppliers(next); }).catch(() => null);
    loadPurchases().then((next) => { if (alive) setPurchases(next); }).catch(() => null);
    return () => { alive = false; };
  }, []);

  React.useEffect(() => {
    if (!itemId && dir.materials[0]) setItemId(dir.materials[0].id);
  }, [dir.materials, itemId]);

  const supplierOptions = [{ value: "", label: "Sem fornecedor" }, ...suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))];
  const itemOptions = dir.items.map((item) => ({ value: item.id, label: `${item.sku} - ${item.name}` }));

  const addSupplier = async () => {
    if (!supplierName.trim()) return;
    try {
      const next = await createSupplier({
        name: supplierName.trim(),
        document: supplierDocument.trim() || null,
        email: supplierEmail.trim() || null,
        phone: supplierPhone.trim() || null,
        notes: supplierNotes.trim() || null,
      });
      setSuppliers(next);
      setSupplierName("");
      setSupplierDocument("");
      setSupplierEmail("");
      setSupplierPhone("");
      setSupplierNotes("");
      toast("Fornecedor cadastrado.", "ok");
    } catch {
      toast("Não foi possível cadastrar o fornecedor.", "bad");
    }
  };

  const addPurchase = async () => {
    if (!itemId || toNumber(quantity) <= 0) {
      toast("Informe item e quantidade.", "bad");
      return;
    }
    setSaving(true);
    try {
      const next = await createPurchase({
        supplierId: supplierId || null,
        reference,
        status: "received",
        lines: [{ itemId, quantity: toNumber(quantity), unitCost: parseBRLInput(unitCost), lot }],
      });
      setPurchases(next);
      setReference("");
      setQuantity("1");
      setUnitCost("R$ 0,00");
      setLot("");
      toast("Compra recebida e estoque atualizado.", "ok");
    } catch {
      toast("Não foi possível receber a compra.", "bad");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page page--wide fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-h1">Compras</h1>
          <p className="page-lede">Fornecedores, recebimento e entrada automática de estoque</p>
        </div>
      </div>

      <div className="grid cols-2" style={{ gap: 14, alignItems: "start" }}>
        <Card>
          <div className="om-card-body">
            <div className="block-label">Novo fornecedor</div>
            <div className="ff-grid">
              <Field label="Nome"><Input value={supplierName} onChange={(event) => setSupplierName(event.target.value)} placeholder="Nome do fornecedor" /></Field>
              <Field label="Documento"><Input value={supplierDocument} onChange={(event) => setSupplierDocument(event.target.value)} placeholder="CNPJ, CPF ou IE" /></Field>
            </div>
            <div className="ff-grid">
              <Field label="E-mail"><Input value={supplierEmail} onChange={(event) => setSupplierEmail(event.target.value)} placeholder="compras@fornecedor.com" /></Field>
              <Field label="Telefone"><Input value={supplierPhone} onChange={(event) => setSupplierPhone(event.target.value)} placeholder="(00) 00000-0000" /></Field>
            </div>
            <Field label="Observações"><Input value={supplierNotes} onChange={(event) => setSupplierNotes(event.target.value)} placeholder="Prazos, mínimos, condições comerciais" /></Field>
            <Button icon="plus" onClick={addSupplier}>Cadastrar fornecedor</Button>
            <div style={{ marginTop: 14 }}>
              <div className="block-label">Fornecedores cadastrados</div>
              <table className="minitable">
                <tbody>
                  {suppliers.slice(0, 6).map((supplier) => (
                    <tr key={supplier.id}>
                      <td><div style={{ fontWeight: 600 }}>{supplier.name}</div><div className="cell-sub">{supplier.document ?? "sem documento"}</div></td>
                      <td className="r muted">{supplier.phone ?? supplier.email ?? "-"}</td>
                    </tr>
                  ))}
                  {suppliers.length === 0 && <tr><td className="muted">Nenhum fornecedor cadastrado.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        <Card>
          <div className="om-card-body">
            <div className="block-label">Receber compra</div>
            <div className="ff-grid">
              <Field label="Fornecedor"><Select value={supplierId} onChange={setSupplierId} options={supplierOptions} /></Field>
              <Field label="Referência"><Input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="NF, pedido, observação" /></Field>
            </div>
            <div className="ff-grid">
              <Field label="Item"><Select value={itemId} onChange={setItemId} options={itemOptions} /></Field>
              <Field label="Quantidade"><Input value={quantity} inputMode="decimal" onChange={(event) => setQuantity(event.target.value)} /></Field>
            </div>
            <div className="ff-grid">
              <Field label="Custo un."><Input value={unitCost} inputMode="numeric" onChange={(event) => setUnitCost(formatBRLInput(event.target.value))} /></Field>
              <Field label="Lote fornecedor"><Input value={lot} onChange={(event) => setLot(event.target.value)} /></Field>
            </div>
            <Button icon="plus" onClick={addPurchase} disabled={saving}>Receber e lançar estoque</Button>
          </div>
        </Card>
      </div>

      <Card style={{ overflow: "hidden", marginTop: 16 }}>
        <table className="om-table">
          <thead><tr><th>Compra</th><th>Fornecedor</th><th>Itens</th><th>Status</th><th className="om-td-right">Total</th></tr></thead>
          <tbody>
            {purchases.map((purchase) => (
              <tr key={purchase.id}>
                <td><div style={{ fontWeight: 650 }}>{purchase.number}</div><div className="cell-sub">{purchase.reference ?? "sem referência"}</div></td>
                <td>{purchase.supplierName ?? "-"}</td>
                <td>{purchase.lines.map((line) => `${line.sku} (${line.quantity})`).join(", ")}</td>
                <td><Badge tone="ok">{purchase.status}</Badge></td>
                <td className="om-td-right" style={{ fontWeight: 650 }}>{BRL(purchase.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {purchases.length === 0 && <Empty icon="inbox" title="Nenhuma compra registrada" />}
      </Card>
    </div>
  );
}
