"use client";

import * as React from "react";
import { Badge, Button, Card, Empty, Field, Input, Modal, Select, Textarea, toast } from "@/components/ui";
import { createIncident, loadIncidents, resolveIncident, type Incident } from "@/lib/core-ops-client";
import { loadOrders } from "@/lib/orders-client";
import type { Order } from "@/lib/domain";
import { useItemDirectory } from "@/lib/item-directory";

type AutocompleteOption = {
  value: string;
  title: string;
  subtitle?: string;
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function AutocompleteField({
  value,
  onChange,
  onSelect,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (option: AutocompleteOption | null) => void;
  options: AutocompleteOption[];
  placeholder: string;
}) {
  const [open, setOpen] = React.useState(false);
  const normalized = normalizeSearch(value.trim());
  const matches = React.useMemo(() => {
    if (!normalized) return options.slice(0, 6);
    return options
      .filter((option) => normalizeSearch(`${option.title} ${option.subtitle ?? ""}`).includes(normalized))
      .slice(0, 8);
  }, [normalized, options]);

  const pick = (option: AutocompleteOption | null) => {
    onSelect(option);
    setOpen(false);
  };

  return (
    <div className="inc-ac">
      <Input
        icon="search"
        value={value}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          onChange(event.target.value);
          onSelect(null);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
          if (event.key === "Enter" && matches[0]) {
            event.preventDefault();
            pick(matches[0]);
          }
        }}
      />
      {open && (
        <div className="inc-ac-popover">
          <button className="inc-ac-row" type="button" onMouseDown={(event) => { event.preventDefault(); pick(null); }}>
            <span className="inc-ac-main"><strong>Usar texto digitado</strong><small>Sem vínculo com cadastro</small></span>
          </button>
          {matches.map((option) => (
            <button key={option.value} className="inc-ac-row" type="button" onMouseDown={(event) => { event.preventDefault(); pick(option); }}>
              <span className="inc-ac-main"><strong>{option.title}</strong>{option.subtitle && <small>{option.subtitle}</small>}</span>
            </button>
          ))}
          {matches.length === 0 && (
            <div className="inc-ac-empty">Nenhum resultado. O texto digitado será salvo como referência manual.</div>
          )}
        </div>
      )}
    </div>
  );
}

export function IncidentsScreen() {
  const dir = useItemDirectory();
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [incidents, setIncidents] = React.useState<Incident[]>([]);
  const [type, setType] = React.useState("return");
  const [orderId, setOrderId] = React.useState("");
  const [orderTitle, setOrderTitle] = React.useState("");
  const [itemId, setItemId] = React.useState("");
  const [itemTitle, setItemTitle] = React.useState("");
  const [quantity, setQuantity] = React.useState("1");
  const [reason, setReason] = React.useState("");
  const [resolveTarget, setResolveTarget] = React.useState<Incident | null>(null);
  const [stockImpact, setStockImpact] = React.useState("available");
  const [resolutionType, setResolutionType] = React.useState("resolved");
  const [replacementOrderId, setReplacementOrderId] = React.useState("");
  const [refundAmount, setRefundAmount] = React.useState("");
  const [resolutionText, setResolutionText] = React.useState("");

  const openResolve = (incident: Incident) => {
    setResolveTarget(incident);
    setStockImpact(incident.type === "loss" ? "loss" : "available");
    setResolutionType(incident.type === "exchange" ? "replacement" : "resolved");
    setReplacementOrderId("");
    setRefundAmount("");
    setResolutionText("");
  };

  const submitResolve = async () => {
    if (!resolveTarget) return;
    try {
      setIncidents(await resolveIncident({
        incidentId: resolveTarget.id,
        stockImpact: stockImpact as "available" | "blocked" | "loss" | "none",
        refundAmount: Number(refundAmount.replace(",", ".")) || 0,
        resolution: resolutionText.trim(),
        resolutionType,
        replacementOrderId: replacementOrderId || null,
      }));
      setResolveTarget(null);
      toast("Incidente resolvido.", "ok");
    } catch {
      toast("Não foi possível resolver o incidente.", "bad");
    }
  };

  React.useEffect(() => {
    loadIncidents().then(setIncidents).catch(() => null);
    loadOrders().then(setOrders).catch(() => null);
  }, []);

  const orderOptions = React.useMemo<AutocompleteOption[]>(() => orders.map((order) => ({
    value: order.id,
    title: `${order.num} - ${order.customerName}`,
    subtitle: `${order.city} · ${order.status}`,
  })), [orders]);
  const itemOptions = React.useMemo<AutocompleteOption[]>(() => dir.items.map((item) => ({
    value: item.id,
    title: `${item.sku} - ${item.name}`,
    subtitle: `${item.variant || "sem variante"} · ${item.available} ${item.unit} disponível`,
  })), [dir.items]);

  const add = async () => {
    if (!reason.trim()) {
      toast("Informe o motivo.", "bad");
      return;
    }
    try {
      setIncidents(await createIncident({
        type,
        orderId: orderId || null,
        orderTitle: orderId ? null : orderTitle,
        itemId: itemId || null,
        itemTitle: itemId ? null : itemTitle,
        quantity: Number(quantity.replace(",", ".")) || null,
        reason,
      }));
      setReason("");
      toast("Incidente registrado.", "ok");
    } catch {
      toast("Não foi possível registrar o incidente.", "bad");
    }
  };

  return (
    <div className="page page--wide fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-h1">Incidentes</h1>
          <p className="page-lede">Trocas, devoluções, perdas e reclamações sem cancelar pedido enviado</p>
        </div>
      </div>

      <Card>
        <div className="om-card-body">
          <div className="block-label">Novo caso</div>
          <div className="ff-grid">
            <Field label="Tipo">
              <Select value={type} onChange={setType} options={[
                { value: "return", label: "Devolução" },
                { value: "exchange", label: "Troca" },
                { value: "loss", label: "Perda" },
                { value: "complaint", label: "Reclamação" },
              ]} />
            </Field>
            <Field label="Pedido">
              <AutocompleteField
                value={orderTitle}
                onChange={setOrderTitle}
                options={orderOptions}
                placeholder="Buscar por número, cliente ou cidade"
                onSelect={(option) => {
                  setOrderId(option?.value ?? "");
                  if (option) setOrderTitle(option.title);
                }}
              />
            </Field>
          </div>
          <div className="ff-grid">
            <Field label="Item">
              <AutocompleteField
                value={itemTitle}
                onChange={setItemTitle}
                options={itemOptions}
                placeholder="Buscar por SKU, nome ou variante"
                onSelect={(option) => {
                  setItemId(option?.value ?? "");
                  if (option) setItemTitle(option.title);
                }}
              />
            </Field>
            <Field label="Quantidade">
              <Input value={quantity} inputMode="decimal" onChange={(event) => setQuantity(event.target.value)} />
            </Field>
          </div>
          <Field label="Motivo">
            <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Descreva o ocorrido e a decisão tomada." />
          </Field>
          <Button icon="plus" onClick={add}>Registrar incidente</Button>
        </div>
      </Card>

      <Card style={{ overflow: "hidden", marginTop: 14 }}>
        <table className="om-table">
          <thead><tr><th>Data</th><th>Tipo</th><th>Pedido</th><th>Item</th><th>Status</th><th>Motivo</th><th /></tr></thead>
          <tbody>
            {incidents.map((incident) => (
              <tr key={incident.id}>
                <td className="muted">{dateLabel(incident.createdAt)}</td>
                <td><Badge tone={incident.type === "loss" ? "bad" : "warn"}>{incident.type}</Badge></td>
                <td>{incident.orderNumber ?? "-"}</td>
                <td>{incident.itemSku ? `${incident.itemSku} (${incident.quantity ?? "-"})` : incident.itemName ?? "-"}</td>
                <td><Badge tone={incident.status === "resolved" ? "ok" : "info"}>{incident.status}</Badge></td>
                <td>{incident.reason}</td>
                <td className="om-td-right">{incident.status === "open" && <Button variant="outline" size="sm" icon="check" onClick={() => openResolve(incident)}>Resolver</Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {incidents.length === 0 && <Empty icon="alertCircle" title="Nenhum incidente registrado" />}
      </Card>

      {resolveTarget && (
        <Modal
          open
          onClose={() => setResolveTarget(null)}
          icon="alertCircle"
          title="Resolver incidente"
          subtitle={resolveTarget.reason}
          width={520}
          footer={(
            <>
              <Button variant="outline" onClick={() => setResolveTarget(null)}>Cancelar</Button>
              <div className="spacer" style={{ flex: 1 }} />
              <Button variant="default" icon="check" onClick={submitResolve}>Resolver</Button>
            </>
          )}
        >
          <Field label="Impacto no estoque">
            <Select
              value={stockImpact}
              onChange={setStockImpact}
              options={[
                { value: "available", label: "Retornar ao disponível" },
                { value: "blocked", label: "Retornar bloqueado para revisão" },
                { value: "loss", label: "Registrar como perda" },
                { value: "none", label: "Sem impacto no estoque" },
              ]}
            />
          </Field>
          <Field label="Tipo de resolucao" style={{ marginTop: 12 }}>
            <Select
              value={resolutionType}
              onChange={setResolutionType}
              options={[
                { value: "resolved", label: "Resolvido sem troca" },
                { value: "replacement", label: "Pedido de reposicao" },
                { value: "refund", label: "Reembolso" },
                { value: "coupon", label: "Cupom / credito" },
                { value: "repair", label: "Reparo / retrabalho" },
              ]}
            />
          </Field>
          {resolutionType === "replacement" && (
            <Field label="Pedido de reposicao" style={{ marginTop: 12 }}>
              <Select
                value={replacementOrderId}
                onChange={setReplacementOrderId}
                placeholder="Selecione o pedido"
                options={orders.map((order) => ({ value: order.id, label: `${order.num} - ${order.customerName}` }))}
              />
            </Field>
          )}
          {resolveTarget.itemSku ? (
            <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>{resolveTarget.itemSku} · {resolveTarget.quantity ?? 0} un</div>
          ) : (
            <div className="rt-hint" style={{ marginTop: 8 }}>Sem item/quantidade vinculados: nenhum movimento de estoque será gerado.</div>
          )}
          <Field label="Reembolso (R$) — opcional" style={{ marginTop: 12 }}>
            <Input inputMode="decimal" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} placeholder="0,00" />
          </Field>
          <Field label="Resolução" style={{ marginTop: 10 }}>
            <Textarea value={resolutionText} onChange={(e) => setResolutionText(e.target.value)} placeholder="Decisão tomada, acordo com o cliente..." />
          </Field>
        </Modal>
      )}
    </div>
  );
}
