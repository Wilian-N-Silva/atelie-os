"use client";

import * as React from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Icon,
  Input,
  Modal,
  Select,
  Sep,
  SortTh,
  Tabs,
  Textarea,
  toast,
  useSort,
} from "@/components/ui";
import {
  BRL,
  CHANNELS,
  DEMO_ORDERS,
  ORDER_STATUS,
  findDemoItem,
  productOptions,
  type DemoOrder,
  type DemoOrderStatus,
} from "@/lib/screen-fixtures";
import type { Go, Route } from "@/lib/types";

type OrderFilter = "todos" | "a_separar" | "a_embalar" | "envio" | "pagamento" | "enviados";

function orderQuantity(order: DemoOrder) {
  return order.items.reduce((sum, item) => sum + item.qty, 0);
}

function ChannelBadge({ channel }: { channel: DemoOrder["channel"] }) {
  const external = channel === "mercadolivre" || channel === "shopee";
  return <Badge tone={external ? "warn" : "neutral"}>{CHANNELS[channel]}</Badge>;
}

function OrderDrawer({ order, go, onClose }: { order: DemoOrder; go: Go; onClose: () => void }) {
  const status = ORDER_STATUS[order.status];
  const lines = order.items.map((line) => ({ ...line, item: findDemoItem(line.sku) }));
  const subtotal = lines.reduce((sum, line) => sum + (line.item?.price ?? 0) * line.qty, 0);
  const nextAction =
    order.status === "pago" || order.status === "a_separar"
      ? { label: "Iniciar separacao", icon: "scan", route: { screen: "operacao", mode: "separacao", order: order.id } }
      : order.status === "separado"
        ? { label: "Iniciar embalagem", icon: "package2", route: { screen: "operacao", mode: "embalagem", order: order.id } }
        : null;

  const flow: DemoOrderStatus[] = ["pago", "a_separar", "separado", "embalado", "pronto_envio", "enviado"];

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer-head">
          <div className={`chip chip--lg chip--${status.tone}`}><Icon name="pedidos" size={20} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="drawer-h1">{order.num}</div>
            <div className="row" style={{ gap: 8, marginTop: 4 }}>
              <Badge tone={status.tone} dot>{status.label}</Badge>
              <ChannelBadge channel={order.channel} />
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>

        <div className="drawer-body">
          <div className="row" style={{ gap: 11, marginBottom: 16 }}>
            <Avatar name={order.customerName} size={38} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{order.customerName}</div>
              <div className="muted" style={{ fontSize: 12.5 }}>{order.city}</div>
            </div>
            <span className="code-pill">{order.code}</span>
          </div>

          {order.note && (
            <div style={{ background: "hsl(var(--warn-bg))", color: "hsl(var(--warn))", padding: "9px 12px", borderRadius: 8, fontSize: 12.5, marginBottom: 16, display: "flex", gap: 8 }}>
              <Icon name="alertCircle" size={15} /> {order.note}
            </div>
          )}

          <div className="block-label">Itens do pedido</div>
          <table className="minitable" style={{ marginBottom: 18 }}>
            <tbody>
              {lines.map((line) => (
                <tr key={line.sku}>
                  <td>
                    <div className="item-cell">
                      <div className={line.item?.type === "kit" ? "swatch swatch--kit" : "swatch"}><Icon name="flame" size={15} /></div>
                      <div style={{ minWidth: 0 }}>
                        <div className="cell-title">{line.item?.name ?? line.sku} {line.item?.variant}</div>
                        <div className="cell-sub sku">{line.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td className="r muted" style={{ whiteSpace: "nowrap" }}>{line.qty} x {BRL(line.item?.price ?? 0)}</td>
                  <td className="r" style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{BRL((line.item?.price ?? 0) * line.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="field"><span className="field-k">Subtotal</span><span className="field-v">{BRL(subtotal)}</span></div>
          <div className="field"><span className="field-k">Frete</span><span className="field-v">{order.freight ? BRL(order.freight) : "a definir"}</span></div>
          {order.discount > 0 && <div className="field"><span className="field-k">Desconto</span><span className="field-v om-text--bad">- {BRL(order.discount)}</span></div>}
          <div className="field" style={{ fontSize: 15 }}><span style={{ fontWeight: 600 }}>Total</span><span style={{ fontWeight: 700 }}>{BRL(order.total)}</span></div>

          <div className="block-label" style={{ marginTop: 18 }}>Envio</div>
          <div className="field"><span className="field-k">Rastreio</span><span className="field-v">{order.tracking ? <span className="sku">{order.tracking}</span> : <span className="muted">pendente</span>}</span></div>
          <div className="field"><span className="field-k">Etiqueta</span><span className="field-v">{order.channel === "mercadolivre" || order.channel === "shopee" ? <Badge tone="info">PDF anexada</Badge> : <span className="muted">interna</span>}</span></div>

          <div className="block-label" style={{ marginTop: 18 }}>Fluxo</div>
          <div className="stepper">
            {flow.map((step, index) => {
              const meta = ORDER_STATUS[step];
              const done = status.step > meta.step;
              const current = order.status === step;
              return (
                <div className="step" key={step}>
                  <div className="step-rail">
                    <div className={`step-dot ${done ? "step-dot--done" : ""} ${current ? "step-dot--cur" : ""}`}>
                      {done ? <Icon name="check" size={12} /> : current ? <span style={{ width: 7, height: 7, borderRadius: 99, background: "currentColor" }} /> : null}
                    </div>
                    {index < flow.length - 1 && <div className={`step-line ${done ? "step-line--done" : ""}`} />}
                  </div>
                  <div className="step-body">
                    <div className="step-label">{meta.label}</div>
                    {(done || current) && <div className="step-time">{current ? `${order.createdAt} - agora` : "concluido"}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="drawer-foot">
          {nextAction && (
            <Button variant="default" icon={nextAction.icon} style={{ flex: 1 }} onClick={() => go(nextAction.route.screen, nextAction.route)}>
              {nextAction.label}
            </Button>
          )}
          <Button variant="outline" icon="printer" onClick={() => window.print()}>Pick list</Button>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </div>
      </aside>
    </>
  );
}

function NewOrderModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (order: DemoOrder) => void }) {
  const idPrefix = React.useId();
  const nextId = React.useRef(0);
  const products = productOptions();
  const [customer, setCustomer] = React.useState("Cliente novo");
  const [city, setCity] = React.useState("Sao Paulo - SP");
  const [sku, setSku] = React.useState(products[0]?.sku ?? "");
  const [qty, setQty] = React.useState("1");
  const [note, setNote] = React.useState("");

  const submit = () => {
    const product = findDemoItem(sku);
    const quantity = Math.max(1, Number.parseInt(qty, 10) || 1);
    const freight = 24.9;
    const total = (product?.price ?? 0) * quantity + freight;
    const next = nextId.current++;
    const id = `${idPrefix}-${next}`;
    onCreate({
      id,
      code: `040100${String(900000 + next).slice(-6)}`,
      num: `#${1044 + next}`,
      channel: "whatsapp",
      customerName: customer.trim() || "Cliente novo",
      city: city.trim() || "Sao Paulo - SP",
      status: "pago",
      payment: "pago",
      createdAt: "agora",
      freight,
      discount: 0,
      total,
      items: [{ sku, qty: quantity }],
      tracking: null,
      note: note.trim() || null,
    });
    toast("Pedido criado nesta sessao.", "info");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} icon="pedidos" title="Novo pedido" subtitle="Rascunho local para a operacao" width={560}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><div className="spacer" style={{ flex: 1 }} /><Button variant="default" icon="plus" onClick={submit}>Criar pedido</Button></>}>
      <div className="ff-grid">
        <Field label="Cliente"><Input value={customer} onChange={(event) => setCustomer(event.target.value)} /></Field>
        <Field label="Cidade"><Input value={city} onChange={(event) => setCity(event.target.value)} /></Field>
      </div>
      <div className="ff-grid">
        <Field label="Produto">
          <Select value={sku} onChange={setSku} options={products.map((item) => ({ value: item.sku, label: `${item.name} ${item.variant}` }))} />
        </Field>
        <Field label="Quantidade"><Input value={qty} inputMode="numeric" onChange={(event) => setQty(event.target.value)} /></Field>
      </div>
      <Field label="Observacao"><Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Cartao, retirada, embalagem especial..." /></Field>
    </Modal>
  );
}

export function OrdersScreen({ go, route }: { go: Go; route: Route }) {
  const [orders, setOrders] = React.useState<DemoOrder[]>(() => [...DEMO_ORDERS]);
  const [filter, setFilter] = React.useState<OrderFilter>((route.filter as OrderFilter) || "todos");
  const [openId, setOpenId] = React.useState<string | null>(route.open ?? null);
  const [query, setQuery] = React.useState("");
  const [newOpen, setNewOpen] = React.useState(false);

  React.useEffect(() => {
    if (route.filter) setFilter(route.filter as OrderFilter);
    if (route.open) setOpenId(route.open);
  }, [route.filter, route.open]);

  const groups: Record<OrderFilter, (order: DemoOrder) => boolean> = {
    todos: () => true,
    a_separar: (order) => order.status === "pago" || order.status === "a_separar",
    a_embalar: (order) => order.status === "separado",
    envio: (order) => order.status === "embalado" || order.status === "pronto_envio",
    pagamento: (order) => order.status === "aguardando_pagamento",
    enviados: (order) => order.status === "enviado" || order.status === "entregue",
  };

  const tabs = [
    { value: "todos", label: "Todos", count: orders.filter(groups.todos).length },
    { value: "a_separar", label: "A separar", count: orders.filter(groups.a_separar).length },
    { value: "a_embalar", label: "A embalar", count: orders.filter(groups.a_embalar).length },
    { value: "envio", label: "Envio", count: orders.filter(groups.envio).length },
    { value: "pagamento", label: "Pagamento", count: orders.filter(groups.pagamento).length },
    { value: "enviados", label: "Enviados", count: orders.filter(groups.enviados).length },
  ];

  const normalizedQuery = query.trim().toLowerCase();
  const rows = orders
    .filter(groups[filter] ?? groups.todos)
    .filter((order) => !normalizedQuery || `${order.num} ${order.customerName} ${order.city} ${order.code}`.toLowerCase().includes(normalizedQuery));
  const sort = useSort(rows, {
    num: (order) => order.num,
    customerName: (order) => order.customerName,
    channel: (order) => CHANNELS[order.channel],
    qty: orderQuantity,
    total: (order) => order.total,
    status: (order) => ORDER_STATUS[order.status].step,
  }, "status", "asc");
  const openOrder = orders.find((order) => order.id === openId);

  return (
    <div className="page page--wide fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-h1">Pedidos</h1>
          <p className="page-lede">{sort.sorted.length} pedidos nesta visao</p>
        </div>
        <div className="row-wrap">
          <Button variant="outline" icon="printer" onClick={() => window.print()}>Pick list em lote</Button>
          <Button variant="default" icon="plus" onClick={() => setNewOpen(true)}>Novo pedido</Button>
        </div>
      </div>

      <div className="toolbar">
        <Tabs tabs={tabs} value={filter} onChange={(value) => setFilter(value as OrderFilter)} />
        <div className="spacer" />
        <div style={{ width: 260 }}><Input icon="search" placeholder="Cliente, numero, codigo..." value={query} onChange={(event) => setQuery(event.target.value)} /></div>
      </div>

      <Card style={{ overflow: "hidden" }}>
        <table className="om-table">
          <thead>
            <tr>
              <SortTh label="Pedido" k="num" sort={sort} />
              <SortTh label="Cliente" k="customerName" sort={sort} />
              <SortTh label="Canal" k="channel" sort={sort} />
              <SortTh label="Itens" k="qty" sort={sort} />
              <SortTh label="Total" k="total" sort={sort} align="right" />
              <th>Pagamento</th>
              <SortTh label="Status" k="status" sort={sort} />
              <th />
            </tr>
          </thead>
          <tbody>
            {sort.sorted.map((order) => {
              const status = ORDER_STATUS[order.status];
              return (
                <tr key={order.id} className="om-row-click" onClick={() => setOpenId(order.id)}>
                  <td><div style={{ fontWeight: 600 }}>{order.num}</div><div className="code-pill">{order.code}</div></td>
                  <td><div style={{ fontWeight: 550 }}>{order.customerName}</div><div className="cell-sub">{order.city}</div></td>
                  <td><ChannelBadge channel={order.channel} /></td>
                  <td className="muted">{orderQuantity(order)} item(s)</td>
                  <td className="om-td-right" style={{ fontWeight: 600 }}>{BRL(order.total)}</td>
                  <td>{order.payment === "pago" ? <Badge tone="ok" dot>Pago</Badge> : <Badge tone="warn" dot>Aguardando</Badge>}</td>
                  <td><Badge tone={status.tone}>{status.label}</Badge></td>
                  <td className="om-td-right"><Icon name="chevronRight" size={16} className="muted" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sort.sorted.length === 0 && <Empty icon="pedidos" title="Nenhum pedido nesta visao" hint="Ajuste o filtro ou registre um novo pedido." />}
      </Card>

      {openOrder && <OrderDrawer order={openOrder} go={go} onClose={() => setOpenId(null)} />}
      <NewOrderModal open={newOpen} onClose={() => setNewOpen(false)} onCreate={(order) => setOrders((current) => [order, ...current])} />
      <Sep style={{ marginTop: 18 }} />
    </div>
  );
}
