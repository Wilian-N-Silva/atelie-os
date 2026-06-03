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
import { Barcode } from "@/components/barcode";
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
import { loadDemoOrders, writeDemoCustomOrder, writeDemoOrderOverride } from "@/lib/demo-order-overrides";
import type { Go, Route } from "@/lib/types";

type OrderFilter = "todos" | "a_separar" | "a_embalar" | "envio" | "pagamento" | "enviados";
type PickListJob = { id: string; code: string; title: string; orders: DemoOrder[]; generatedAt: string };
type OrderPatch = Partial<Pick<DemoOrder, "payment" | "status">>;
type LabelKind = NonNullable<DemoOrder["labelKind"]>;

function orderQuantity(order: DemoOrder) {
  return order.items.reduce((sum, item) => sum + item.qty, 0);
}

function canPick(order: DemoOrder) {
  return order.status === "pago" || order.status === "a_separar";
}

function itemLocation(sku: string) {
  if (sku.startsWith("KIT-")) return "Kits / B2";
  if (sku.includes("CED")) return "Prateleira A3";
  if (sku.includes("BAU")) return "Prateleira A2";
  if (sku.includes("CAP")) return "Prateleira A1";
  return "Prateleira A1";
}

function ChannelBadge({ channel }: { channel: DemoOrder["channel"] }) {
  const external = channel === "mercadolivre" || channel === "shopee";
  return <Badge tone={external ? "warn" : "neutral"}>{CHANNELS[channel]}</Badge>;
}

function defaultLabelKind(channel: DemoOrder["channel"]): LabelKind {
  return channel === "mercadolivre" || channel === "shopee" ? "pdf_attached" : "internal";
}

function orderLabelKind(order: Pick<DemoOrder, "channel" | "labelKind">): LabelKind {
  return order.labelKind ?? defaultLabelKind(order.channel);
}

function LabelBadge({ kind }: { kind: LabelKind }) {
  return kind === "pdf_attached" ? <Badge tone="info">PDF anexada</Badge> : <Badge tone="neutral">Interna</Badge>;
}

function PickListDocument({ job }: { job: PickListJob | null }) {
  if (!job) return null;
  const totalItems = job.orders.reduce((sum, order) => sum + orderQuantity(order), 0);
  const totalLines = job.orders.reduce((sum, order) => sum + order.items.length, 0);

  return (
    <div className="print-doc pickdoc" aria-hidden="true">
      <div className="pickdoc-page">
        <header className="pickdoc-head">
          <div>
            <div className="pickdoc-kicker">Atelie OS - documento de bancada</div>
            <h1 className="pickdoc-title">{job.title}</h1>
            <div className="pickdoc-meta">
              <span>Gerado: {job.generatedAt}</span>
              <span>Pedidos: {job.orders.length}</span>
              <span>Linhas: {totalLines}</span>
              <span>Unidades: {totalItems}</span>
            </div>
          </div>
          <Barcode code={job.orders.length === 1 ? job.orders[0].code : job.code} size="lg" />
        </header>

        <section className="pickdoc-summary">
          <div><span>Documento</span><strong>{job.code}</strong></div>
          <div><span>Pedidos</span><strong>{job.orders.length}</strong></div>
          <div><span>Unidades</span><strong>{totalItems}</strong></div>
          <div><span>Uso</span><strong>Separacao</strong></div>
        </section>

        {job.orders.map((order) => {
          const lines = order.items.map((line) => ({ ...line, item: findDemoItem(line.sku) }));
          return (
            <article className="pickdoc-order" key={order.id}>
              <div className="pickdoc-order-head">
                <div>
                  <div className="pickdoc-order-title">{order.num} - {order.customerName}</div>
                  <div className="pickdoc-order-sub">
                    {CHANNELS[order.channel]} - {order.city}<br />
                    Pedido: <span className="pickdoc-code">{order.code}</span> - Pagamento: {order.payment === "pago" ? "pago" : "aguardando"}
                  </div>
                  {order.note && <div className="pickdoc-note">Obs.: {order.note}</div>}
                </div>
                <Barcode code={order.code} size="md" />
              </div>

              <table className="pickdoc-table">
                <thead>
                  <tr>
                    <th className="pickdoc-check">Ok</th>
                    <th>Qtd</th>
                    <th>Item</th>
                    <th>SKU</th>
                    <th>Codigo</th>
                    <th>Local</th>
                    <th>Conferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.sku}>
                      <td className="pickdoc-check"><span className="pickdoc-box" /></td>
                      <td className="pickdoc-qty">{line.qty}</td>
                      <td>
                        <div className="pickdoc-item">{line.item?.name ?? line.sku}</div>
                        <div>{line.item?.variant ?? ""}</div>
                      </td>
                      <td className="pickdoc-code">{line.sku}</td>
                      <td className="pickdoc-code">{line.item?.code ?? "-"}</td>
                      <td>{itemLocation(line.sku)}</td>
                      <td><span className="pickdoc-box" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pickdoc-sign">
                <span>Separado por / hora</span>
                <span>Conferido por / hora</span>
                <span>Embalado por / hora</span>
              </div>
            </article>
          );
        })}

        <div className="pickdoc-flow">
          <strong>Fluxo recomendado</strong>
          1. No Modo Operacao, bipe o codigo de barras do pedido nesta folha. 2. Separe cada item e finalize. 3. Releia os itens em Conferencia. 4. Complete o checklist de embalagem e aplique a etiqueta de envio.
        </div>
      </div>
    </div>
  );
}

function OrderDrawer({
  order,
  go,
  onClose,
  onPrint,
  onUpdate,
}: {
  order: DemoOrder;
  go: Go;
  onClose: () => void;
  onPrint: (orders: DemoOrder[], title: string) => void;
  onUpdate: (orderId: string, patch: OrderPatch) => void;
}) {
  const status = ORDER_STATUS[order.status];
  const lines = order.items.map((line) => ({ ...line, item: findDemoItem(line.sku) }));
  const subtotal = lines.reduce((sum, line) => sum + (line.item?.price ?? 0) * line.qty, 0);
  const waitingPayment = order.payment !== "pago" || order.status === "aguardando_pagamento";
  const nextAction =
    canPick(order)
      ? { label: "Iniciar separacao", icon: "scan", route: { screen: "operacao", mode: "separacao", order: order.id } }
      : order.status === "separado"
        ? { label: "Conferir separacao", icon: "listChecks", route: { screen: "operacao", mode: "conferencia", order: order.id } }
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

          {waitingPayment && (
            <div style={{ background: "hsl(var(--info-bg))", color: "hsl(var(--info))", padding: "11px 12px", borderRadius: 8, fontSize: 12.5, marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <Icon name="banknote" size={16} />
              <div>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>Pagamento aguardando confirmacao manual</div>
                <div>Sem integracao conectada, confirme o recebimento para liberar pick list, separacao e embalagem.</div>
              </div>
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
          <div className="field"><span className="field-k">Etiqueta</span><span className="field-v"><LabelBadge kind={orderLabelKind(order)} /></span></div>

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
          {waitingPayment && (
            <Button
              variant="default"
              icon="checkCircle"
              style={{ flex: 1 }}
              onClick={() => {
                onUpdate(order.id, { payment: "pago", status: "pago" });
                toast("Pagamento confirmado. Pedido liberado para separacao.", "ok");
              }}
            >
              Confirmar pagamento
            </Button>
          )}
          {nextAction && (
            <Button variant="default" icon={nextAction.icon} style={{ flex: 1 }} onClick={() => go(nextAction.route.screen, nextAction.route)}>
              {nextAction.label}
            </Button>
          )}
          <Button variant="outline" icon="printer" onClick={() => onPrint([order], `Pick list ${order.num}`)}>Pick list</Button>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </div>
      </aside>
    </>
  );
}

type DraftLine = { id: number; sku: string; qty: string };

function parseMoney(value: string) {
  const clean = value.trim().replace(/\s/g, "");
  if (!clean) return 0;
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean;
  return Math.max(0, Number.parseFloat(normalized.replace(/[^\d.]/g, "")) || 0);
}

function NewOrderModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (order: DemoOrder) => void }) {
  const idPrefix = React.useId();
  const nextId = React.useRef(0);
  const nextLineId = React.useRef(1);
  const products = productOptions();
  const [customer, setCustomer] = React.useState("Cliente novo");
  const [city, setCity] = React.useState("Sao Paulo - SP");
  const [channel, setChannel] = React.useState<DemoOrder["channel"]>("whatsapp");
  const [payment, setPayment] = React.useState<DemoOrder["payment"]>("pago");
  const [labelKind, setLabelKind] = React.useState<LabelKind>("internal");
  const [freight, setFreight] = React.useState("24,90");
  const [discount, setDiscount] = React.useState("0,00");
  const [tracking, setTracking] = React.useState("");
  const [lines, setLines] = React.useState<DraftLine[]>(() => [{ id: 0, sku: products[0]?.sku ?? "", qty: "1" }]);
  const [note, setNote] = React.useState("");

  const draftLines = lines.map((line) => {
    const item = findDemoItem(line.sku);
    const qty = Math.max(1, Number.parseInt(line.qty, 10) || 1);
    return { ...line, item, qty, total: (item?.price ?? 0) * qty };
  });
  const subtotal = draftLines.reduce((sum, line) => sum + line.total, 0);
  const freightValue = parseMoney(freight);
  const discountValue = Math.min(parseMoney(discount), subtotal + freightValue);
  const total = Math.max(0, subtotal + freightValue - discountValue);

  const setLine = (lineId: number, patch: Partial<DraftLine>) => {
    setLines((current) => current.map((line) => line.id === lineId ? { ...line, ...patch } : line));
  };

  const addLine = () => {
    setLines((current) => [...current, { id: nextLineId.current++, sku: products[0]?.sku ?? "", qty: "1" }]);
  };

  const removeLine = (lineId: number) => {
    setLines((current) => current.length > 1 ? current.filter((line) => line.id !== lineId) : current);
  };

  const submit = () => {
    const aggregated = new Map<string, number>();
    for (const line of draftLines) {
      if (!line.sku) continue;
      aggregated.set(line.sku, (aggregated.get(line.sku) ?? 0) + line.qty);
    }
    const items = Array.from(aggregated, ([sku, qty]) => ({ sku, qty }));
    if (!items.length) {
      toast("Adicione pelo menos um item ao pedido.", "bad");
      return;
    }
    const next = nextId.current++;
    const id = `${idPrefix}-${next}`;
    onCreate({
      id,
      code: `040100${String(900000 + next).slice(-6)}`,
      num: `#${1044 + next}`,
      channel,
      labelKind,
      customerName: customer.trim() || "Cliente novo",
      city: city.trim() || "Sao Paulo - SP",
      status: payment === "pago" ? "pago" : "aguardando_pagamento",
      payment,
      createdAt: "agora",
      freight: freightValue,
      discount: discountValue,
      total,
      items,
      tracking: tracking.trim() || null,
      note: note.trim() || null,
    });
    toast("Pedido criado nesta sessao.", "info");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} icon="pedidos" title="Novo pedido" subtitle="Rascunho local para a operacao" width={760}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><div className="spacer" style={{ flex: 1 }} /><Button variant="default" icon="plus" onClick={submit}>Criar pedido</Button></>}>
      <div className="order-form-layout">
        <div className="order-form-main">
          <section className="order-form-section">
            <div className="block-label">Cliente e origem</div>
            <div className="ff-grid">
              <Field label="Cliente"><Input value={customer} onChange={(event) => setCustomer(event.target.value)} /></Field>
              <Field label="Cidade"><Input value={city} onChange={(event) => setCity(event.target.value)} /></Field>
            </div>
            <div className="ff-grid">
              <Field label="Canal">
                <Select
                  value={channel}
                  onChange={(value) => {
                    const next = value as DemoOrder["channel"];
                    setChannel(next);
                    setLabelKind(defaultLabelKind(next));
                  }}
                  options={Object.entries(CHANNELS).map(([value, label]) => ({ value, label }))}
                />
              </Field>
              <Field label="Pagamento">
                <Select value={payment} onChange={(value) => setPayment(value as DemoOrder["payment"])} options={[
                  { value: "pago", label: "Pago" },
                  { value: "aguardando", label: "Aguardando pagamento" },
                ]} />
              </Field>
            </div>
          </section>

          <section className="order-form-section">
            <div className="row between" style={{ marginBottom: 8 }}>
              <div className="block-label" style={{ marginBottom: 0 }}>Itens do pedido</div>
              <Button variant="outline" size="sm" icon="plus" onClick={addLine}>Adicionar item</Button>
            </div>
            <div className="order-line-list">
              {draftLines.map((line, index) => (
                <div key={line.id} className="order-line-edit">
                  <Field label={index === 0 ? "Produto" : ""} style={{ flex: 1, marginBottom: 0 }}>
                    <Select value={line.sku} onChange={(value) => setLine(line.id, { sku: value })} options={products.map((item) => ({ value: item.sku, label: `${item.name} ${item.variant}` }))} />
                  </Field>
                  <Field label={index === 0 ? "Qtd" : ""} style={{ width: 78, marginBottom: 0 }}>
                    <Input value={line.qty} inputMode="numeric" onChange={(event) => setLine(line.id, { qty: event.target.value })} />
                  </Field>
                  <div className="order-line-price">
                    <span>{BRL(line.item?.price ?? 0)}</span>
                    <strong>{BRL(line.total)}</strong>
                  </div>
                  <Button variant="ghost" size="icon" icon="x" onClick={() => removeLine(line.id)} disabled={lines.length === 1} aria-label="Remover item" />
                </div>
              ))}
            </div>
          </section>

          <section className="order-form-section">
            <div className="block-label">Envio e etiqueta</div>
            <div className="ff-grid">
              <Field label="Rastreio">
                <Input value={tracking} onChange={(event) => setTracking(event.target.value)} placeholder="BR000000000BR ou pendente" />
              </Field>
              <Field label="Etiqueta">
                <Select value={labelKind} onChange={(value) => setLabelKind(value as LabelKind)} options={[
                  { value: "internal", label: "Interna" },
                  { value: "pdf_attached", label: "PDF anexada manualmente" },
                ]} />
              </Field>
            </div>
            <Field label="Observacao"><Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Cartao, retirada, embalagem especial..." /></Field>
          </section>
        </div>

        <aside className="order-form-side">
          <div className="block-label">Valores</div>
          <div className="order-summary-box">
            <div className="field"><span className="field-k">Subtotal</span><span className="field-v">{BRL(subtotal)}</span></div>
            <div className="order-money-fields">
              <Field label="Frete" style={{ marginBottom: 0 }}><Input value={freight} inputMode="decimal" onChange={(event) => setFreight(event.target.value)} /></Field>
              <Field label="Desconto" style={{ marginBottom: 0 }}><Input value={discount} inputMode="decimal" onChange={(event) => setDiscount(event.target.value)} /></Field>
            </div>
            <div className="field"><span className="field-k">Frete</span><span className="field-v">{freightValue ? BRL(freightValue) : "a definir"}</span></div>
            {discountValue > 0 && <div className="field"><span className="field-k">Desconto</span><span className="field-v om-text--bad">- {BRL(discountValue)}</span></div>}
            <div className="field order-total-row"><span>Total</span><span>{BRL(total)}</span></div>
          </div>

          <div className="block-label" style={{ marginTop: 16 }}>Resumo operacional</div>
          <div className="order-summary-box">
            <div className="field"><span className="field-k">Canal</span><span className="field-v">{CHANNELS[channel]}</span></div>
            <div className="field"><span className="field-k">Pagamento</span><span className="field-v">{payment === "pago" ? <Badge tone="ok" dot>Pago</Badge> : <Badge tone="warn" dot>Aguardando</Badge>}</span></div>
            <div className="field"><span className="field-k">Rastreio</span><span className="field-v">{tracking.trim() ? <span className="sku">{tracking.trim()}</span> : <span className="muted">pendente</span>}</span></div>
            <div className="field"><span className="field-k">Etiqueta</span><span className="field-v"><LabelBadge kind={labelKind} /></span></div>
            <div className="field"><span className="field-k">Status inicial</span><span className="field-v">{payment === "pago" ? ORDER_STATUS.pago.label : ORDER_STATUS.aguardando_pagamento.label}</span></div>
          </div>
        </aside>
      </div>
    </Modal>
  );
}

export function OrdersScreen({ go, route }: { go: Go; route: Route }) {
  const [orders, setOrders] = React.useState<DemoOrder[]>(() => [...DEMO_ORDERS]);
  const [filter, setFilter] = React.useState<OrderFilter>((route.filter as OrderFilter) || "todos");
  const [openId, setOpenId] = React.useState<string | null>(route.open ?? null);
  const [query, setQuery] = React.useState("");
  const [newOpen, setNewOpen] = React.useState(false);
  const [printJob, setPrintJob] = React.useState<PickListJob | null>(null);
  const printCounter = React.useRef(1);

  React.useEffect(() => {
    setOrders(loadDemoOrders(DEMO_ORDERS));
  }, []);

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
  const pickableRows = rows.filter(canPick);
  const sort = useSort(rows, {
    num: (order) => order.num,
    customerName: (order) => order.customerName,
    channel: (order) => CHANNELS[order.channel],
    qty: orderQuantity,
    total: (order) => order.total,
    status: (order) => ORDER_STATUS[order.status].step,
  }, "status", "asc");
  const openOrder = orders.find((order) => order.id === openId);
  const updateOrder = React.useCallback((orderId: string, patch: OrderPatch) => {
    writeDemoOrderOverride(orderId, patch);
    setOrders((current) => current.map((order) => order.id === orderId ? { ...order, ...patch } : order));
  }, []);
  const printPickList = React.useCallback((selected: DemoOrder[], title: string) => {
    const next = printCounter.current++;
    setPrintJob({
      id: `pick-${next}`,
      code: `049900${String(100000 + next).slice(-6)}`,
      title,
      orders: selected,
      generatedAt: "agora",
    });
  }, []);

  React.useEffect(() => {
    if (!printJob) return;
    document.body.dataset.printMode = "picklist";
    const clear = () => {
      delete document.body.dataset.printMode;
      setPrintJob(null);
    };
    window.addEventListener("afterprint", clear, { once: true });
    const timer = window.setTimeout(() => window.print(), 80);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", clear);
      delete document.body.dataset.printMode;
    };
  }, [printJob]);

  return (
    <div className="page page--wide fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-h1">Pedidos</h1>
          <p className="page-lede">{sort.sorted.length} pedidos nesta visao</p>
        </div>
        <div className="row-wrap">
          <Button
            variant="outline"
            icon="printer"
            onClick={() => printPickList(pickableRows, `Pick list em lote - ${pickableRows.length} pedidos`)}
            disabled={!pickableRows.length}
          >
            Pick list em lote{pickableRows.length ? ` (${pickableRows.length})` : ""}
          </Button>
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

      {openOrder && <OrderDrawer order={openOrder} go={go} onClose={() => setOpenId(null)} onPrint={printPickList} onUpdate={updateOrder} />}
      <NewOrderModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreate={(order) => {
          writeDemoCustomOrder(order);
          setOrders((current) => [order, ...current]);
        }}
      />
      <PickListDocument job={printJob} />
      <Sep style={{ marginTop: 18 }} />
    </div>
  );
}
