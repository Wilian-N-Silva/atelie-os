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
  Select,
  Sep,
  SortTh,
  Tabs,
  Textarea,
  cn,
  toast,
  useSort,
} from "@/components/ui";
import { Barcode } from "@/components/barcode";
import {
  BRL,
  CHANNELS,
  expandKitOrderItems,
  type Customer,
  type ItemSummary,
  type Order,
} from "@/lib/domain";
import { createOrder, loadOrders, updateOrder as saveOrderPatch } from "@/lib/orders-client";
import { loadCustomers, type CustomerInput } from "@/lib/customers-client";
import { lookupPostalCode } from "@/lib/postal-code-client";
import { createShippingCartLabel, quoteShipping, runShippingLabelAction, type ShippingAddressInput, type ShippingQuoteService } from "@/lib/shipping-client";
import { type WorkflowStep, useWorkflows } from "@/lib/workflows";
import { buildStatusMap, statusInfo, type StatusInfo } from "@/lib/workflow-status";
import { useItemDirectory, type ItemDirectory } from "@/lib/item-directory";
import type { Go, Route } from "@/lib/types";

type FindItem = (sku: string) => ItemSummary | undefined;
type StatusMap = Map<string, StatusInfo>;

type OrderFilter = "todos" | "a_separar" | "a_embalar" | "envio" | "pagamento" | "enviados";
type PickListJob = { id: string; code: string; title: string; orders: Order[]; generatedAt: string };
type OrderPatch = Partial<Pick<Order, "payment" | "status" | "freight" | "total" | "shippingQuote">>;
type LabelKind = NonNullable<Order["labelKind"]>;
type ShippingLabel = NonNullable<Order["shippingLabel"]>;
type AutocompleteOption = {
  value: string;
  title: string;
  subtitle?: string;
};
type ShippingAddressCard = ShippingAddressInput & {
  id: string;
  label: string;
};

function orderQuantity(order: Order) {
  return order.items.reduce((sum, item) => sum + item.qty, 0);
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
            <span className="inc-ac-main"><strong>Usar como novo cliente</strong><small>O pedido cria cadastro com os dados informados</small></span>
          </button>
          {matches.map((option) => (
            <button key={option.value} className="inc-ac-row" type="button" onMouseDown={(event) => { event.preventDefault(); pick(option); }}>
              <span className="inc-ac-main"><strong>{option.title}</strong>{option.subtitle && <small>{option.subtitle}</small>}</span>
            </button>
          ))}
          {matches.length === 0 && (
            <div className="inc-ac-empty">Nenhum cliente encontrado. O pedido vai criar um novo cadastro.</div>
          )}
        </div>
      )}
    </div>
  );
}

function orderLinePrice(line: Order["items"][number], find: FindItem) {
  return line.unitPrice ?? find(line.sku)?.price ?? 0;
}

function parseDimensionText(value: string | null | undefined) {
  if (!value) return null;
  const parts = value
    .toLowerCase()
    .replace(/cm/g, "")
    .split(/[x×*]/)
    .map((part) => Number(part.trim().replace(",", ".")))
    .filter((part) => Number.isFinite(part) && part > 0);
  return parts.length === 3 ? { lengthCm: parts[0], widthCm: parts[1], heightCm: parts[2] } : null;
}

function packageDefaults(lines: Order["items"], find: FindItem) {
  let weightG = 0;
  let lengthCm = 16;
  let widthCm = 11;
  let heightCm = 4;
  for (const line of lines) {
    const item = find(line.sku);
    if (!item) continue;
    weightG += (item.packedWeightG ?? item.weightG ?? 0) * line.qty;
    const dims = parseDimensionText(item.packedDimensions ?? item.dimensions);
    if (dims) {
      lengthCm = Math.max(lengthCm, dims.lengthCm);
      widthCm = Math.max(widthCm, dims.widthCm);
      heightCm += dims.heightCm * line.qty;
    }
  }
  return {
    weightG: Math.max(1, Math.round(weightG || 500)),
    lengthCm,
    widthCm,
    heightCm,
  };
}

function canPick(order: Order) {
  return order.status === "pago" || order.status === "a_separar";
}

function orderFlowFromWorkflow(steps: WorkflowStep[], currentStatus: string, statusMap: StatusMap) {
  if (steps.some((step) => step.key === currentStatus)) return steps;
  const info = statusInfo(statusMap, currentStatus);
  return [
    ...steps,
    { key: currentStatus, label: info.label, color: info.tone, automation: "none" as const },
  ];
}

function itemLocation(sku: string) {
  if (sku.startsWith("KIT-")) return "Kits / B2";
  if (sku.includes("CED")) return "Prateleira A3";
  if (sku.includes("BAU")) return "Prateleira A2";
  if (sku.includes("CAP")) return "Prateleira A1";
  return "Prateleira A1";
}

function ChannelBadge({ channel }: { channel: Order["channel"] }) {
  const external = channel === "mercadolivre" || channel === "shopee";
  return <Badge tone={external ? "warn" : "neutral"}>{CHANNELS[channel]}</Badge>;
}

function defaultLabelKind(channel: Order["channel"]): LabelKind {
  return channel === "mercadolivre" || channel === "shopee" ? "pdf_attached" : "internal";
}

function orderLabelKind(order: Pick<Order, "channel" | "labelKind">): LabelKind {
  return order.labelKind ?? defaultLabelKind(order.channel);
}

function LabelBadge({ kind }: { kind: LabelKind }) {
  return kind === "pdf_attached" ? <Badge tone="info">PDF anexada</Badge> : <Badge tone="neutral">Interna</Badge>;
}

function cityParts(value: string) {
  const [city = "", state = ""] = value.split("-").map((part) => part.trim());
  return { city, stateAbbr: state.slice(0, 2).toUpperCase() };
}

function onlyDigits(value: string, max = 32) {
  return value.replace(/\D/g, "").slice(0, max);
}

function maskCep(value: string) {
  const digits = onlyDigits(value, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

function maskPhone(value: string) {
  const digits = onlyDigits(value, 11);
  if (digits.length <= 10) {
    return digits.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_match, ddd, first, last) => [ddd && `(${ddd}`, ddd?.length === 2 && ") ", first, last && `-${last}`].filter(Boolean).join(""));
  }
  return digits.replace(/^(\d{0,2})(\d{0,5})(\d{0,4}).*/, (_match, ddd, first, last) => [ddd && `(${ddd}`, ddd?.length === 2 && ") ", first, last && `-${last}`].filter(Boolean).join(""));
}

function maskDocument(value: string, type: "cpf" | "cnpj") {
  const digits = onlyDigits(value, type === "cnpj" ? 14 : 11);
  if (type === "cnpj") {
    return digits
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function emptyShippingAddress(name = "", cityLabel = ""): ShippingAddressInput {
  const parsed = cityParts(cityLabel);
  return {
    documentType: "cpf",
    name,
    phone: "",
    email: "",
    document: "",
    companyDocument: "",
    stateRegister: "",
    address: "",
    complement: "",
    number: "",
    district: "",
    city: parsed.city,
    stateAbbr: parsed.stateAbbr,
    postalCode: "",
    note: "",
  };
}

function addressComplete(address: ShippingAddressInput) {
  const documentType = address.documentType ?? (address.companyDocument ? "cnpj" : "cpf");
  const document = documentType === "cnpj" ? address.companyDocument ?? "" : address.document ?? "";
  return Boolean(
    address.name.trim()
      && document.replace(/\D/g, "").length === (documentType === "cnpj" ? 14 : 11)
      && address.address.trim()
      && address.number.trim()
      && address.district.trim()
      && address.city.trim()
      && /^[A-Za-z]{2}$/.test(address.stateAbbr.trim())
      && address.postalCode.replace(/\D/g, "").length === 8,
  );
}

function PickListDocument({ job, find }: { job: PickListJob | null; find: FindItem }) {
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
          const lines = expandKitOrderItems(order.items, find).map((line) => ({ ...line, item: find(line.sku) }));
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
                  {lines.map((line, index) => (
                    <tr key={`${line.sku}-${index}`}>
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
  onShippingLabel,
  orderSteps,
  statusMap,
  find,
}: {
  order: Order;
  go: Go;
  onClose: () => void;
  onPrint: (orders: Order[], title: string) => void;
  onUpdate: (orderId: string, patch: OrderPatch) => void;
  onShippingLabel: (orderId: string, shippingLabel: ShippingLabel) => void;
  orderSteps: WorkflowStep[];
  statusMap: StatusMap;
  find: FindItem;
}) {
  const status = statusInfo(statusMap, order.status);
  const lines = order.items.map((line) => ({ ...line, item: find(line.sku) }));
  const subtotal = lines.reduce((sum, line) => sum + orderLinePrice(line, find) * line.qty, 0);
  const defaults = React.useMemo(() => packageDefaults(order.items, find), [order.items, find]);
  const [destinationZip, setDestinationZip] = React.useState(order.customerAddress?.postalCode ?? "");
  const [weightG, setWeightG] = React.useState(String(defaults.weightG));
  const [lengthCm, setLengthCm] = React.useState(String(defaults.lengthCm));
  const [widthCm, setWidthCm] = React.useState(String(defaults.widthCm));
  const [heightCm, setHeightCm] = React.useState(String(defaults.heightCm));
  const [quoteMessage, setQuoteMessage] = React.useState<string | null>(null);
  const [quoteServices, setQuoteServices] = React.useState<ShippingQuoteService[]>([]);
  const [quoting, setQuoting] = React.useState(false);
  const [sender, setSender] = React.useState<ShippingAddressInput>(() => emptyShippingAddress("", ""));
  const [recipient, setRecipient] = React.useState<ShippingAddressInput>(() => ({
    ...emptyShippingAddress(order.customerName, order.city),
    documentType: (order.customerDocument ?? "").replace(/\D/g, "").length === 14 ? "cnpj" : "cpf",
    phone: order.customerPhone ?? "",
    email: order.customerEmail ?? "",
    document: (order.customerDocument ?? "").replace(/\D/g, "").length === 14 ? "" : order.customerDocument ?? "",
    companyDocument: (order.customerDocument ?? "").replace(/\D/g, "").length === 14 ? order.customerDocument ?? "" : "",
    address: order.customerAddress?.address ?? "",
    number: order.customerAddress?.number ?? "",
    complement: order.customerAddress?.complement ?? "",
    district: order.customerAddress?.district ?? "",
    city: order.customerAddress?.city || cityParts(order.city).city,
    stateAbbr: order.customerAddress?.stateAbbr || cityParts(order.city).stateAbbr,
    postalCode: order.customerAddress?.postalCode ?? "",
  }));
  const [insuranceValue, setInsuranceValue] = React.useState(() => String(Math.max(1, Math.round(subtotal * 100) / 100)));
  const [invoiceKey, setInvoiceKey] = React.useState("");
  const [nonCommercial, setNonCommercial] = React.useState(true);
  const [receipt, setReceipt] = React.useState(false);
  const [ownHand, setOwnHand] = React.useState(false);
  const [shippingHelp, setShippingHelp] = React.useState<"receipt" | "ownHand" | null>(null);
  const [creatingLabel, setCreatingLabel] = React.useState(false);
  const [labelAction, setLabelAction] = React.useState<string | null>(null);
  const [labelMessage, setLabelMessage] = React.useState<string | null>(null);
  const [senderCards, setSenderCards] = React.useState<ShippingAddressCard[]>([]);
  const [senderCardId, setSenderCardId] = React.useState("");
  const autoLookedUpRecipientCep = React.useRef("");
  const selectedQuoteId = order.shippingQuote?.serviceId ?? "";
  const waitingPayment = order.payment !== "pago" || order.status === "aguardando_pagamento";
  const nextAction =
    canPick(order)
      ? { label: "Iniciar separacao", icon: "scan", route: { screen: "operacao", mode: "separacao", order: order.id } }
      : order.status === "separado"
        ? { label: "Conferir separacao", icon: "listChecks", route: { screen: "operacao", mode: "conferencia", order: order.id } }
        : null;

  const flow = orderFlowFromWorkflow(orderSteps, order.status, statusMap);
  React.useEffect(() => {
    let alive = true;
    fetch("/api/app/shipping", { cache: "no-store", credentials: "include" })
      .then((res) => res.ok ? res.json() : null)
      .then((payload: { shipping?: Record<string, unknown> } | null) => {
        if (!alive || !payload?.shipping) return;
        const shipping = payload.shipping;
        const rawAddresses = Array.isArray(shipping.shippingAddresses) ? shipping.shippingAddresses as Array<Record<string, unknown>> : [];
        const cards = rawAddresses.map((address) => ({
          id: String(address.id ?? ""),
          label: String(address.label ?? "Endereco"),
          documentType: address.documentType === "cnpj" ? "cnpj" as const : "cpf" as const,
          name: String(address.name ?? ""),
          phone: String(address.phone ?? ""),
          email: String(address.email ?? ""),
          document: String(address.document ?? ""),
          companyDocument: String(address.companyDocument ?? ""),
          stateRegister: String(address.stateRegister ?? ""),
          address: String(address.address ?? ""),
          number: String(address.number ?? ""),
          complement: String(address.complement ?? ""),
          district: String(address.district ?? ""),
          city: String(address.city ?? ""),
          stateAbbr: String(address.stateAbbr ?? ""),
          postalCode: String(address.postalCode ?? ""),
          note: "",
        })).filter((address) => address.id);
        const fallbackOrigin = cityParts(String(shipping.originCity ?? ""));
        const fallback: ShippingAddressCard = {
          id: "store",
          label: "Loja",
          documentType: shipping.senderDocumentType === "cnpj" ? "cnpj" : "cpf",
          name: String(shipping.senderName || shipping.storeName || ""),
          phone: String(shipping.senderPhone || ""),
          email: String(shipping.senderEmail || ""),
          document: String(shipping.senderDocument || ""),
          companyDocument: String(shipping.senderCompanyDocument || ""),
          stateRegister: String(shipping.senderStateRegister || ""),
          address: String(shipping.senderAddress || ""),
          number: String(shipping.senderNumber || ""),
          complement: String(shipping.senderComplement || ""),
          district: String(shipping.senderDistrict || ""),
          city: fallbackOrigin.city,
          stateAbbr: String(shipping.senderStateAbbr || fallbackOrigin.stateAbbr || ""),
          postalCode: String(shipping.originZip || ""),
          note: "",
        };
        const nextCards = cards.length ? cards : [fallback];
        const selected = nextCards.find((address) => address.id === shipping.defaultShippingAddressId) ?? nextCards[0];
        setSenderCards(nextCards);
        setSenderCardId(selected.id);
        setSender((current) => ({
          ...current,
          ...selected,
        }));
      })
      .catch(() => null);
    return () => { alive = false; };
  }, []);
  const setRecipientField = (field: keyof ShippingAddressInput, value: string) => setRecipient((current) => ({ ...current, [field]: value }));
  const canCreateLabel = Boolean(order.shippingQuote && addressComplete(sender) && addressComplete(recipient) && Number(weightG) > 0);
  const applyPostalCode = async (target: "sender" | "recipient") => {
    const current = target === "sender" ? sender : recipient;
    try {
      const found = await lookupPostalCode(current.postalCode);
      const setAddress = target === "sender" ? setSender : setRecipient;
      setAddress((value) => ({
        ...value,
        postalCode: found.postalCode,
        address: found.address || value.address,
        district: found.district || value.district,
        city: found.city || value.city,
        stateAbbr: found.stateAbbr || value.stateAbbr,
        complement: value.complement || found.complement,
      }));
    } catch {
      toast("Nao foi possivel buscar o CEP.", "bad");
    }
  };
  const quote = async () => {
    setQuoting(true);
    setQuoteServices([]);
    try {
      const result = await quoteShipping({
        destinationZip,
        weightG: Number(weightG) || 0,
        lengthCm: Number(lengthCm) || 0,
        widthCm: Number(widthCm) || 0,
        heightCm: Number(heightCm) || 0,
      });
      setQuoteMessage(result.message);
      setQuoteServices(result.services ?? []);
    } catch {
      setQuoteMessage("Cotacao indisponivel. Use o preenchimento manual.");
    } finally {
      setQuoting(false);
    }
  };

  React.useEffect(() => {
    const cep = onlyDigits(recipient.postalCode, 8);
    if (cep.length !== 8 || autoLookedUpRecipientCep.current === cep) return;
    autoLookedUpRecipientCep.current = cep;
    void applyPostalCode("recipient");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipient.postalCode]);

  const applyQuote = (service: ShippingQuoteService) => {
    const freight = service.price;
    setRecipientField("postalCode", destinationZip);
    onUpdate(order.id, {
      freight,
      total: Math.max(0, subtotal + freight - order.discount),
      shippingQuote: {
        provider: "melhor_envio",
        serviceId: service.id,
        serviceName: service.name,
        company: service.company,
        price: service.price,
        deliveryTime: service.deliveryTime,
        selectedAt: new Date().toISOString(),
      },
    });
    toast("Cotacao aplicada ao pedido.", "ok");
  };

  const createLabel = async () => {
    if (!order.shippingQuote) {
      toast("Aplique uma cotacao antes de inserir a etiqueta.", "bad");
      return;
    }
    setCreatingLabel(true);
    setLabelMessage(null);
    try {
      const shippingLabel = await createShippingCartLabel({
        orderId: order.id,
        sender,
        recipient,
        volume: {
          weightG: Number(weightG) || 0,
          lengthCm: Number(lengthCm) || 0,
          widthCm: Number(widthCm) || 0,
          heightCm: Number(heightCm) || 0,
        },
        options: {
          insuranceValue: Number(insuranceValue.replace(",", ".")) || Math.max(1, subtotal),
          receipt,
          ownHand,
          nonCommercial,
          invoiceKey,
        },
      });
      onShippingLabel(order.id, shippingLabel);
      setLabelMessage(`Carrinho: ${shippingLabel.protocol ?? shippingLabel.externalId}`);
      toast("Etiqueta inserida no carrinho do Melhor Envio.", "ok");
    } catch (error) {
      setLabelMessage(error instanceof Error ? error.message : "Nao foi possivel inserir a etiqueta.");
      toast("Nao foi possivel inserir a etiqueta no carrinho.", "bad");
    } finally {
      setCreatingLabel(false);
    }
  };

  const runLabelAction = async (action: "checkout" | "generate" | "preview" | "print") => {
    if (!order.shippingLabel) return;
    setLabelAction(action);
    setLabelMessage(null);
    try {
      const result = await runShippingLabelAction({ orderId: order.id, action });
      onShippingLabel(order.id, result.shippingLabel);
      if (result.url) window.open(result.url, "_blank", "noopener,noreferrer");
      const labels = { checkout: "Compra registrada.", generate: "Geracao solicitada.", preview: "Previa aberta.", print: "Impressao aberta." };
      setLabelMessage(labels[action]);
      toast(labels[action], "ok");
    } catch (error) {
      setLabelMessage(error instanceof Error ? error.message : "Nao foi possivel atualizar a etiqueta.");
      toast("Nao foi possivel atualizar a etiqueta.", "bad");
    } finally {
      setLabelAction(null);
    }
  };

  return (
    <div className="page page--wide fade-in order-create-page">
      <div className="page-head">
        <div>
          <div className="row" style={{ gap: 8, marginBottom: 8 }}>
            <Button variant="ghost" size="sm" icon="arrowLeft" onClick={onClose}>Pedidos</Button>
            <Badge tone={status.tone} dot>{status.label}</Badge>
            <ChannelBadge channel={order.channel} />
          </div>
          <h1 className="page-h1">{order.num}</h1>
          <p className="page-lede">{order.customerName} - {order.city}</p>
        </div>
        <div className="row-wrap">
          <Button variant="outline" icon="printer" onClick={() => onPrint([order], `Pick list ${order.num}`)}>Pick list</Button>
          {nextAction && (
            <Button variant="default" icon={nextAction.icon} onClick={() => go(nextAction.route.screen, nextAction.route)}>
              {nextAction.label}
            </Button>
          )}
        </div>
      </div>

      <div className="order-create-layout">
        <aside className="order-create-menu">
          <div className="order-create-menu-title">Pedido</div>
          {[
            ["Resumo", order.customerName],
            ["Itens", `${orderQuantity(order)} item(s)`],
            ["Envio", order.tracking || order.shippingQuote?.serviceName || "pendente"],
            ["Fluxo", status.label],
          ].map(([label, value]) => (
            <a key={label} href={`#${label.toLowerCase()}`} className="order-create-menu-item">
              <span>{label}</span>
              <small>{value}</small>
            </a>
          ))}
        </aside>

        <main className="order-create-main">
          <section className="order-create-section" id="resumo">
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

          {order.customerIncomplete && (
            <div style={{ background: "hsl(var(--warn-bg))", color: "hsl(var(--warn))", padding: "11px 12px", borderRadius: 8, fontSize: 12.5, marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <Icon name="alertCircle" size={16} />
              <div>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>Complete os dados do cliente antes da etiqueta</div>
                <div>Documento e endereco completo serao necessarios para frete, etiqueta e rastreio.</div>
              </div>
            </div>
          )}

          <div className="block-label">Itens do pedido</div>
          <table className="minitable" style={{ marginBottom: 18 }}>
            <tbody>
              {lines.map((line, index) => (
                <tr key={`${line.sku}-${index}`}>
                  <td>
                    <div className="item-cell">
                      <div className={line.item?.type === "kit" ? "swatch swatch--kit" : "swatch"}><Icon name="flame" size={15} /></div>
                      <div style={{ minWidth: 0 }}>
                        <div className="cell-title">{line.item?.name ?? line.sku} {line.item?.variant}</div>
                        <div className="cell-sub sku">{line.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td className="r muted" style={{ whiteSpace: "nowrap" }}>{line.qty} x {BRL(orderLinePrice(line, find))}</td>
                  <td className="r" style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{BRL(orderLinePrice(line, find) * line.qty)}</td>
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
          <div className="field">
            <span className="field-k">Cotacao</span>
            <span className="field-v">
              {order.shippingQuote
                ? `${order.shippingQuote.company ? `${order.shippingQuote.company} - ` : ""}${order.shippingQuote.serviceName} (${BRL(order.shippingQuote.price)})`
                : <span className="muted">sem cotacao aplicada</span>}
            </span>
          </div>

          <div className="shipping-flow">
            <div className="shipping-step">
              <div className="shipping-step-head">
                <span className="shipping-step-index">1</span>
                <div>
                  <div className="block-label">Cotação</div>
                  <div className="section-hint">Informe pacote e CEP para escolher a opção de frete.</div>
                </div>
              </div>
              <div className="shipping-quote-form">
                <Field label="CEP destino">
                  <Input value={maskCep(destinationZip)} onChange={(event) => setDestinationZip(onlyDigits(event.target.value, 8))} placeholder="00000-000" />
                </Field>
                <Field label="Peso (g)">
                  <Input value={weightG} inputMode="numeric" onChange={(event) => setWeightG(event.target.value.replace(/\D/g, ""))} />
                </Field>
                <Field label="Comp.">
                  <Input value={lengthCm} inputMode="decimal" onChange={(event) => setLengthCm(event.target.value.replace(/[^\d,.]/g, ""))} />
                </Field>
                <Field label="Larg.">
                  <Input value={widthCm} inputMode="decimal" onChange={(event) => setWidthCm(event.target.value.replace(/[^\d,.]/g, ""))} />
                </Field>
                <Field label="Alt.">
                  <Input value={heightCm} inputMode="decimal" onChange={(event) => setHeightCm(event.target.value.replace(/[^\d,.]/g, ""))} />
                </Field>
                <div className="shipping-quote-action">
                  <Button variant="outline" size="sm" icon="truck" disabled={quoting} onClick={quote}>{quoting ? "Cotando..." : "Cotar"}</Button>
                </div>
              </div>
              {quoteMessage && <div className="section-hint" style={{ marginBottom: 10 }}>{quoteMessage}</div>}
              {quoteServices.length > 0 && (
                <div className="shipping-rate-grid">
                  {quoteServices.slice(0, 4).map((service) => {
                    const selected = selectedQuoteId === service.id;
                    return (
                      <button key={`${service.id}-${service.name}`} type="button" className={cn("shipping-rate-card", selected && "shipping-rate-card--on")} onClick={() => applyQuote(service)}>
                        <div>
                          <strong>{service.company ? `${service.company} - ${service.name}` : service.name}</strong>
                          <span>{service.deliveryTime === null ? "Prazo indisponivel" : `Ate ${service.deliveryTime} dia(s)`}</span>
                        </div>
                        <div className="shipping-rate-price">{BRL(service.price)}</div>
                        <Badge tone={selected ? "ok" : "outline"}>{selected ? "aplicado" : "aplicar"}</Badge>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="shipping-step">
              <div className="shipping-step-head">
                <span className="shipping-step-index">2</span>
                <div>
                  <div className="block-label">Destinatário</div>
                  <div className="section-hint">CEP preenche o endereço automaticamente; complete número e documento.</div>
                </div>
              </div>
              <div className="shipping-recipient-grid">
                <Field label="CEP destino">
                  <div className="row" style={{ gap: 8 }}>
                    <Input value={maskCep(recipient.postalCode)} onChange={(event) => setRecipientField("postalCode", onlyDigits(event.target.value, 8))} placeholder="00000-000" />
                    <Button variant="ghost" size="sm" icon="search" onClick={() => applyPostalCode("recipient")}>CEP</Button>
                  </div>
                </Field>
                <Field label="Destinatário"><Input value={recipient.name} onChange={(event) => setRecipientField("name", event.target.value)} /></Field>
                <Field label="Endereço destino"><Input value={recipient.address} onChange={(event) => setRecipientField("address", event.target.value)} /></Field>
                <Field label="Número"><Input value={recipient.number} onChange={(event) => setRecipientField("number", event.target.value)} /></Field>
                <Field label="Bairro"><Input value={recipient.district} onChange={(event) => setRecipientField("district", event.target.value)} /></Field>
                <Field label="Cidade"><Input value={recipient.city} onChange={(event) => setRecipientField("city", event.target.value)} /></Field>
                <Field label="UF"><Input value={recipient.stateAbbr} maxLength={2} onChange={(event) => setRecipientField("stateAbbr", event.target.value.toUpperCase())} /></Field>
              </div>
              <div className="shipping-contact-grid">
                <Field label="Telefone destino">
                  <Input value={maskPhone(recipient.phone ?? "")} onChange={(event) => setRecipientField("phone", onlyDigits(event.target.value, 11))} />
                </Field>
                <Field label="E-mail destino">
                  <Input value={recipient.email ?? ""} onChange={(event) => setRecipientField("email", event.target.value)} />
                </Field>
                <Field label="CPF/CNPJ destino">
                  <div className="row" style={{ gap: 8 }}>
                    <Select
                      value={recipient.documentType ?? (recipient.companyDocument ? "cnpj" : "cpf")}
                      onChange={(value) => setRecipient((current) => ({
                        ...current,
                        documentType: value as "cpf" | "cnpj",
                        document: "",
                        companyDocument: "",
                      }))}
                      options={[
                        { value: "cpf", label: "CPF" },
                        { value: "cnpj", label: "CNPJ" },
                      ]}
                      style={{ width: 92 }}
                    />
                    <Input
                      value={maskDocument((recipient.documentType ?? (recipient.companyDocument ? "cnpj" : "cpf")) === "cnpj" ? recipient.companyDocument ?? "" : recipient.document ?? "", recipient.documentType ?? (recipient.companyDocument ? "cnpj" : "cpf"))}
                      onChange={(event) => {
                        const type = recipient.documentType ?? (recipient.companyDocument ? "cnpj" : "cpf");
                        const digits = onlyDigits(event.target.value, type === "cnpj" ? 14 : 11);
                        setRecipient((current) => type === "cnpj" ? { ...current, companyDocument: digits } : { ...current, document: digits });
                      }}
                    />
                  </div>
                </Field>
              </div>
            </div>

            <div className="shipping-step">
              <div className="shipping-step-head">
                <span className="shipping-step-index">3</span>
                <div>
                  <div className="block-label">Remetente</div>
                  <div className="section-hint">Selecione um endereço salvo nas configurações.</div>
                </div>
              </div>
              {senderCards.length > 0 && (
                <div className="shipping-address-picker">
                  {senderCards.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      className={cn("shipping-address-option", senderCardId === card.id && "shipping-address-option--on")}
                      onClick={() => {
                        setSenderCardId(card.id);
                        setSender({ ...card });
                      }}
                    >
                      <span className="shipping-address-option-title">{card.label}</span>
                      <span>{card.city}{card.stateAbbr ? ` - ${card.stateAbbr}` : ""}</span>
                      <small>{card.postalCode ? card.postalCode.replace(/^(\d{5})(\d{3})$/, "$1-$2") : "CEP pendente"}</small>
                      {senderCardId === card.id && <Badge tone="ok">selecionado</Badge>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="shipping-step">
              <div className="shipping-step-head">
                <span className="shipping-step-index">4</span>
                <div>
                  <div className="block-label">Carrinho e etiqueta</div>
                  <div className="section-hint">{order.shippingLabel ? `Carrinho: ${order.shippingLabel.protocol ?? order.shippingLabel.externalId}` : "Insira no carrinho depois de aplicar uma cotação e conferir os dados."}</div>
                </div>
              </div>
              {order.shippingLabel && (
                <div className="row-wrap" style={{ gap: 8, marginBottom: 12 }}>
                  <Button variant="outline" size="sm" icon="check" disabled={!!labelAction} onClick={() => runLabelAction("checkout")}>
                    {labelAction === "checkout" ? "Comprando..." : "Comprar"}
                  </Button>
                  <Button variant="outline" size="sm" icon="package2" disabled={!!labelAction} onClick={() => runLabelAction("generate")}>
                    {labelAction === "generate" ? "Gerando..." : "Gerar"}
                  </Button>
                  <Button variant="ghost" size="sm" icon="fileText" disabled={!!labelAction} onClick={() => runLabelAction("preview")}>
                    Previa
                  </Button>
                  <Button variant="ghost" size="sm" icon="printer" disabled={!!labelAction} onClick={() => runLabelAction("print")}>
                    Imprimir
                  </Button>
                </div>
              )}
              <div className="shipping-options-grid">
                <Field label="Seguro"><Input value={insuranceValue} inputMode="decimal" onChange={(event) => setInsuranceValue(event.target.value.replace(/[^\d,.]/g, ""))} /></Field>
                <Field label="NF-e"><Input value={invoiceKey} onChange={(event) => setInvoiceKey(event.target.value.replace(/\D/g, ""))} placeholder="opcional" /></Field>
                <Field label="Tipo">
                  <Select value={nonCommercial ? "non_commercial" : "commercial"} onChange={(value) => setNonCommercial(value === "non_commercial")} options={[
                    { value: "non_commercial", label: "Declaracao" },
                    { value: "commercial", label: "Nota fiscal" },
                  ]} />
                </Field>
              </div>
              <div className="row-wrap" style={{ gap: 8, alignItems: "center", marginBottom: 4 }}>
                <div className="shipping-option-help">
                  <label className="row" style={{ gap: 6, fontSize: 12.5 }}><input type="checkbox" checked={receipt} onChange={(event) => setReceipt(event.target.checked)} /> AR</label>
                  <button type="button" className="shipping-help-btn" onClick={() => setShippingHelp((current) => current === "receipt" ? null : "receipt")} aria-label="Explicar AR">
                    <Icon name="alertCircle" size={14} />
                  </button>
                  {shippingHelp === "receipt" && (
                    <div className="shipping-help-pop">
                      <strong>AR</strong>
                      <span>Aviso de Recebimento. Solicita comprovação de entrega assinada pelo recebedor.</span>
                    </div>
                  )}
                </div>
                <div className="shipping-option-help">
                  <label className="row" style={{ gap: 6, fontSize: 12.5 }}><input type="checkbox" checked={ownHand} onChange={(event) => setOwnHand(event.target.checked)} /> Mao propria</label>
                  <button type="button" className="shipping-help-btn" onClick={() => setShippingHelp((current) => current === "ownHand" ? null : "ownHand")} aria-label="Explicar mao propria">
                    <Icon name="alertCircle" size={14} />
                  </button>
                  {shippingHelp === "ownHand" && (
                    <div className="shipping-help-pop">
                      <strong>Mao propria</strong>
                      <span>Restringe a entrega ao destinatario indicado, quando o servico dos Correios/transportadora oferecer essa opcao.</span>
                    </div>
                  )}
                </div>
                <Button variant="default" size="sm" icon="package2" disabled={!canCreateLabel || creatingLabel} onClick={createLabel}>
                  {creatingLabel ? "Inserindo..." : "Inserir no carrinho"}
                </Button>
                {labelMessage && <span className="muted" style={{ fontSize: 12.5 }}>{labelMessage}</span>}
              </div>
            </div>
          </div>

          <div className="block-label" style={{ marginTop: 18 }}>Fluxo</div>
          <div className="stepper">
            {flow.map((step, index) => {
              const meta = statusInfo(statusMap, step.key);
              const done = status.step > meta.step;
              const current = order.status === step.key;
              return (
                <div className="step" key={step.key}>
                  <div className="step-rail">
                    <div className={`step-dot ${done ? "step-dot--done" : ""} ${current ? "step-dot--cur" : ""}`}>
                      {done ? <Icon name="check" size={12} /> : current ? <span style={{ width: 7, height: 7, borderRadius: 99, background: "currentColor" }} /> : null}
                    </div>
                    {index < flow.length - 1 && <div className={`step-line ${done ? "step-line--done" : ""}`} />}
                  </div>
                  <div className="step-body">
                    <div className="step-label">{step.label}</div>
                    {(done || current) && <div className="step-time">{current ? `${order.createdAt} - agora` : "concluido"}</div>}
                  </div>
                </div>
              );
            })}
          </div>
          </section>
        </main>

        <aside className="order-create-summary">
          <div className="block-label">Valores</div>
          <div className="order-summary-box">
            <div className="field"><span className="field-k">Subtotal</span><span className="field-v">{BRL(subtotal)}</span></div>
            <div className="field"><span className="field-k">Frete</span><span className="field-v">{order.freight ? BRL(order.freight) : "a definir"}</span></div>
            {order.discount > 0 && <div className="field"><span className="field-k">Desconto</span><span className="field-v om-text--bad">- {BRL(order.discount)}</span></div>}
            <div className="field order-total-row"><span>Total</span><span>{BRL(order.total)}</span></div>
          </div>

          <div className="block-label" style={{ marginTop: 16 }}>Resumo operacional</div>
          <div className="order-summary-box">
            <div className="field"><span className="field-k">Canal</span><span className="field-v"><ChannelBadge channel={order.channel} /></span></div>
            <div className="field"><span className="field-k">Pagamento</span><span className="field-v">{order.payment === "pago" ? <Badge tone="ok" dot>Pago</Badge> : <Badge tone="warn" dot>Aguardando</Badge>}</span></div>
            <div className="field"><span className="field-k">Rastreio</span><span className="field-v">{order.tracking ? <span className="sku">{order.tracking}</span> : <span className="muted">pendente</span>}</span></div>
            <div className="field"><span className="field-k">Etiqueta</span><span className="field-v"><LabelBadge kind={orderLabelKind(order)} /></span></div>
            <div className="field"><span className="field-k">Status</span><span className="field-v"><Badge tone={status.tone}>{status.label}</Badge></span></div>
          </div>

          <div className="order-create-actions">
          {waitingPayment && (
            <Button
              variant="default"
              icon="checkCircle"
              onClick={() => {
                onUpdate(order.id, { payment: "pago", status: "pago" });
                toast("Pagamento confirmado. Pedido liberado para separacao.", "ok");
              }}
            >
              Confirmar pagamento
            </Button>
          )}
          {nextAction && (
            <Button variant="default" icon={nextAction.icon} onClick={() => go(nextAction.route.screen, nextAction.route)}>
              {nextAction.label}
            </Button>
          )}
          <Button variant="outline" icon="printer" onClick={() => onPrint([order], `Pick list ${order.num}`)}>Pick list</Button>
          <Button variant="outline" onClick={onClose}>Voltar</Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

type DraftLine = { id: number; sku: string; qty: string; unitPrice: string };
type DraftLineView = DraftLine & {
  item: ItemSummary | undefined;
  qtyNumber: number;
  unitPriceNumber: number;
  total: number;
  overStock: boolean;
};

function parseMoney(value: string) {
  const clean = value.trim().replace(/\s/g, "");
  if (!clean) return 0;
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean;
  return Math.max(0, Number.parseFloat(normalized.replace(/[^\d.]/g, "")) || 0);
}

function moneyInput(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function makeDraftLine(id: number, sku: string, find: FindItem): DraftLine {
  return { id, sku, qty: "1", unitPrice: moneyInput(find(sku)?.price ?? 0) };
}

function buildOrderItems(lines: DraftLineView[]) {
  const grouped = new Map<string, { qty: number; total: number }>();
  for (const line of lines) {
    if (!line.sku) continue;
    const current = grouped.get(line.sku) ?? { qty: 0, total: 0 };
    current.qty += line.qtyNumber;
    current.total += line.total;
    grouped.set(line.sku, current);
  }
  return Array.from(grouped, ([sku, value]) => ({
    sku,
    qty: value.qty,
    unitPrice: value.qty ? value.total / value.qty : undefined,
  }));
}

function NewOrderView({ onCancel, onCreate, dir, statusMap, customers }: {
  onCancel: () => void;
  onCreate: (order: Order, customer: CustomerInput | null) => void;
  dir: ItemDirectory;
  statusMap: StatusMap;
  customers: Customer[];
}) {
  const idPrefix = React.useId();
  const nextId = React.useRef(0);
  const nextLineId = React.useRef(1);
  const autoLookedUpCustomerCep = React.useRef("");
  const find = dir.find;
  const products = dir.products;
  const firstSku = products[0]?.sku ?? "";
  const [customer, setCustomer] = React.useState("Cliente novo");
  const [customerId, setCustomerId] = React.useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [customerDocument, setCustomerDocument] = React.useState("");
  const [customerAddress, setCustomerAddress] = React.useState(() => emptyShippingAddress("", ""));
  const [city, setCity] = React.useState("Sao Paulo - SP");
  const [channel, setChannel] = React.useState<Order["channel"]>("whatsapp");
  const [payment, setPayment] = React.useState<Order["payment"]>("pago");
  const [labelKind, setLabelKind] = React.useState<LabelKind>("internal");
  const [freight, setFreight] = React.useState("24,90");
  const [discount, setDiscount] = React.useState("0,00");
  const [tracking, setTracking] = React.useState("");
  const [lines, setLines] = React.useState<DraftLine[]>(() => [makeDraftLine(0, firstSku, find)]);
  const [note, setNote] = React.useState("");
  const [orderQuoteServices, setOrderQuoteServices] = React.useState<ShippingQuoteService[]>([]);
  const [orderQuoteMessage, setOrderQuoteMessage] = React.useState<string | null>(null);
  const [orderQuoting, setOrderQuoting] = React.useState(false);
  const [selectedOrderQuoteId, setSelectedOrderQuoteId] = React.useState("");

  const draftLineBase = lines.map((line) => {
    const item = find(line.sku);
    const qtyNumber = Math.max(1, Number.parseInt(line.qty, 10) || 1);
    const unitPriceNumber = parseMoney(line.unitPrice);
    return {
      ...line,
      item,
      qtyNumber,
      unitPriceNumber,
      total: unitPriceNumber * qtyNumber,
      overStock: false,
    };
  });
  const demandBySku = draftLineBase.reduce((map, line) => {
    map.set(line.sku, (map.get(line.sku) ?? 0) + line.qtyNumber);
    return map;
  }, new Map<string, number>());
  const draftLines = draftLineBase.map((line) => ({ ...line, overStock: !!line.item && (demandBySku.get(line.sku) ?? 0) > line.item.available }));
  const draftPackage = packageDefaults(draftLines.map((line) => ({ sku: line.sku, qty: line.qtyNumber })), find);
  const subtotal = draftLines.reduce((sum, line) => sum + line.total, 0);
  const freightValue = parseMoney(freight);
  const discountValue = Math.min(parseMoney(discount), subtotal + freightValue);
  const total = Math.max(0, subtotal + freightValue - discountValue);
  const stockAlerts = Array.from(new Map(draftLines.filter((line) => line.overStock).map((line) => [line.sku, line])).values());
  const itemCount = draftLines.reduce((sum, line) => sum + line.qtyNumber, 0);
  const customerOptions = React.useMemo<AutocompleteOption[]>(() => customers.map((item) => ({
    value: item.id,
    title: item.name,
    subtitle: [item.document, item.phone, item.email, item.address ? `${item.address.city} - ${item.address.stateAbbr}` : null].filter(Boolean).join(" · "),
  })), [customers]);
  const selectedChannelIsMarketplace = channel === "mercadolivre" || channel === "shopee";
  const customerAddressComplete = addressComplete(customerAddress);
  const hasCustomerAddressDraft = Boolean(
    customerAddress.address.trim()
      || customerAddress.number.trim()
      || customerAddress.district.trim()
      || customerAddress.city.trim()
      || customerAddress.stateAbbr.trim()
      || customerAddress.postalCode.trim(),
  );
  const customerNeedsCompletion = !selectedChannelIsMarketplace && (!customerDocument.trim() || !customerAddressComplete);
  const setCustomerAddressField = (field: keyof ShippingAddressInput, value: string) => setCustomerAddress((current) => ({ ...current, [field]: value }));
  const selectCustomer = (option: AutocompleteOption | null) => {
    setCustomerId(option?.value ?? null);
    if (!option) return;
    const found = customers.find((item) => item.id === option.value);
    if (!found) return;
    setCustomer(found.name);
    setCustomerEmail(found.email ?? "");
    setCustomerPhone(found.phone ?? "");
    setCustomerDocument(found.document ?? "");
    if (found.address) {
      setCustomerAddress({
        ...emptyShippingAddress(found.name, `${found.address.city} - ${found.address.stateAbbr}`),
        address: found.address.address,
        number: found.address.number,
        complement: found.address.complement ?? "",
        district: found.address.district,
        city: found.address.city,
        stateAbbr: found.address.stateAbbr,
        postalCode: found.address.postalCode,
      });
      setCity(`${found.address.city} - ${found.address.stateAbbr}`);
    }
  };
  const lookupCustomerCep = async () => {
    try {
      const found = await lookupPostalCode(customerAddress.postalCode);
      setCustomerAddress((current) => ({
        ...current,
        postalCode: found.postalCode,
        address: found.address || current.address,
        district: found.district || current.district,
        city: found.city || current.city,
        stateAbbr: found.stateAbbr || current.stateAbbr,
        complement: current.complement || found.complement,
      }));
      if (found.city && found.stateAbbr) setCity(`${found.city} - ${found.stateAbbr}`);
    } catch {
      toast("Nao foi possivel buscar o CEP.", "bad");
    }
  };

  React.useEffect(() => {
    const cep = onlyDigits(customerAddress.postalCode, 8);
    if (cep.length !== 8 || autoLookedUpCustomerCep.current === cep) return;
    autoLookedUpCustomerCep.current = cep;
    void lookupCustomerCep();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerAddress.postalCode]);

  const setLine = (lineId: number, patch: Partial<DraftLine>) => {
    setLines((current) => current.map((line) => line.id === lineId ? { ...line, ...patch } : line));
  };

  const addLine = () => {
    setLines((current) => [...current, makeDraftLine(nextLineId.current++, firstSku, find)]);
  };

  const removeLine = (lineId: number) => {
    setLines((current) => current.length > 1 ? current.filter((line) => line.id !== lineId) : current);
  };

  const quoteOrderFreight = async () => {
    const destinationZip = onlyDigits(customerAddress.postalCode, 8);
    if (destinationZip.length !== 8) {
      toast("Informe o CEP do cliente antes de cotar.", "bad");
      return;
    }
    setOrderQuoting(true);
    setOrderQuoteServices([]);
    setOrderQuoteMessage(null);
    try {
      const result = await quoteShipping({
        destinationZip,
        weightG: draftPackage.weightG,
        lengthCm: draftPackage.lengthCm,
        widthCm: draftPackage.widthCm,
        heightCm: draftPackage.heightCm,
      });
      setOrderQuoteMessage(result.message);
      setOrderQuoteServices(result.services ?? []);
    } catch {
      setOrderQuoteMessage("Cotacao indisponivel. Preencha o frete manualmente.");
    } finally {
      setOrderQuoting(false);
    }
  };

  const applyOrderFreight = (service: ShippingQuoteService) => {
    setFreight(moneyInput(service.price));
    setSelectedOrderQuoteId(service.id);
    toast("Frete aplicado ao pedido.", "ok");
  };

  const submit = () => {
    const items = buildOrderItems(draftLines);
    if (!items.length) {
      toast("Adicione pelo menos um item ao pedido.", "bad");
      return;
    }
    const next = nextId.current++;
    const id = `${idPrefix}-${next}`;
    const address = hasCustomerAddressDraft ? {
      address: customerAddress.address.trim(),
      number: customerAddress.number.trim(),
      complement: customerAddress.complement?.trim() || null,
      district: customerAddress.district.trim(),
      city: customerAddress.city.trim(),
      stateAbbr: customerAddress.stateAbbr.trim().toUpperCase(),
      postalCode: customerAddress.postalCode.replace(/\D/g, "").slice(0, 8),
    } : null;
    const customerDraft: CustomerInput | null = {
      customerId,
      name: customer.trim() || "Cliente novo",
      email: customerEmail.trim() || null,
      phone: customerPhone.trim() || null,
      document: customerDocument.trim() || null,
      address,
    };
    const selectedQuote = selectedOrderQuoteId ? orderQuoteServices.find((service) => service.id === selectedOrderQuoteId) : null;
    onCreate({
      id,
      code: `040100${String(900000 + next).slice(-6)}`,
      num: `#${1044 + next}`,
      customerId,
      channel,
      labelKind,
      customerName: customer.trim() || "Cliente novo",
      city: city.trim() || "Sao Paulo - SP",
      customerEmail: customerEmail.trim() || null,
      customerPhone: customerPhone.trim() || null,
      customerDocument: customerDocument.trim() || null,
      customerAddress: address,
      customerIncomplete: customerNeedsCompletion,
      status: payment === "pago" ? "pago" : "aguardando_pagamento",
      payment,
      createdAt: "agora",
      freight: freightValue,
      discount: discountValue,
      total,
      items,
      tracking: tracking.trim() || null,
      shippingQuote: selectedQuote ? {
        provider: "melhor_envio",
        serviceId: selectedQuote.id,
        serviceName: selectedQuote.name,
        company: selectedQuote.company,
        price: selectedQuote.price,
        deliveryTime: selectedQuote.deliveryTime,
        selectedAt: new Date().toISOString(),
      } : undefined,
      note: note.trim() || null,
    }, customerDraft);
    toast(stockAlerts.length ? "Pedido criado com alerta de estoque." : "Pedido criado nesta sessao.", stockAlerts.length ? "info" : "ok");
    onCancel();
  };

  return (
    <div className="page page--wide fade-in order-create-page">
      <div className="page-head">
        <div>
          <div className="row" style={{ gap: 8, marginBottom: 8 }}>
            <Button variant="ghost" size="sm" icon="arrowLeft" onClick={onCancel}>Pedidos</Button>
            <Badge tone={payment === "pago" ? "ok" : "warn"} dot>{payment === "pago" ? "Pago" : "Aguardando pagamento"}</Badge>
            <ChannelBadge channel={channel} />
          </div>
          <h1 className="page-h1">Novo pedido</h1>
          <p className="page-lede">Cadastre o pedido manualmente e libere a operacao mesmo sem integracao.</p>
        </div>
        <div className="row-wrap">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button variant="default" icon="plus" onClick={submit}>Criar pedido</Button>
        </div>
      </div>

      <div className="order-create-layout">
        <aside className="order-create-menu">
          <div className="order-create-menu-title">Cadastro</div>
          {[
            ["Cliente", customer],
            ["Itens", `${itemCount} un em ${draftLines.length} linha(s)`],
            ["Valores", BRL(total)],
            ["Envio", tracking.trim() || "pendente"],
          ].map(([label, value]) => (
            <a key={label} href={`#${label.toLowerCase()}`} className="order-create-menu-item">
              <span>{label}</span>
              <small>{value}</small>
            </a>
          ))}
          {stockAlerts.length > 0 && (
            <div className="order-stock-menu-alert">
              <Icon name="alertCircle" size={16} />
              <span>{stockAlerts.length} alerta(s) de estoque</span>
            </div>
          )}
        </aside>

        <main className="order-create-main">
          <section className="order-create-section" id="cliente">
            <div className="order-section-head">
              <div>
                <div className="block-label">Cliente</div>
                <h2>Origem e pagamento</h2>
              </div>
            </div>
            <div className="ff-grid">
              <Field label="Cliente">
                <AutocompleteField
                  value={customer}
                  onChange={setCustomer}
                  options={customerOptions}
                  placeholder="Buscar por nome, documento, telefone ou e-mail"
                  onSelect={selectCustomer}
                />
              </Field>
              <Field label="Cidade"><Input value={city} onChange={(event) => setCity(event.target.value)} /></Field>
            </div>
            <div className="ff-grid-3">
              <Field label="Documento"><Input value={customerDocument} onChange={(event) => setCustomerDocument(event.target.value)} /></Field>
              <Field label="Telefone"><Input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} /></Field>
              <Field label="E-mail"><Input value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} /></Field>
            </div>
            <div className="ff-grid">
              <Field label="CEP">
                <div className="row" style={{ gap: 8 }}>
                  <Input value={maskCep(customerAddress.postalCode)} onChange={(event) => setCustomerAddressField("postalCode", onlyDigits(event.target.value, 8))} placeholder="00000-000" />
                  <Button variant="ghost" size="sm" icon="search" onClick={lookupCustomerCep}>CEP</Button>
                </div>
              </Field>
              <Field label="Endereco"><Input value={customerAddress.address} onChange={(event) => setCustomerAddressField("address", event.target.value)} /></Field>
            </div>
            <div className="ff-grid-3">
              <Field label="Numero"><Input value={customerAddress.number} onChange={(event) => setCustomerAddressField("number", event.target.value)} /></Field>
              <Field label="Bairro"><Input value={customerAddress.district} onChange={(event) => setCustomerAddressField("district", event.target.value)} /></Field>
              <Field label="UF"><Input value={customerAddress.stateAbbr} maxLength={2} onChange={(event) => setCustomerAddressField("stateAbbr", event.target.value.toUpperCase())} /></Field>
            </div>
            {customerNeedsCompletion && (
              <div className="order-stock-alert" style={{ marginBottom: 14 }}>
                <Icon name="alertCircle" size={17} />
                <div>
                  <strong>Cadastro do cliente incompleto</strong>
                  <span>O pedido pode ser criado, mas frete e etiqueta vao precisar de documento e endereco completo.</span>
                </div>
              </div>
            )}
            <div className="ff-grid">
              <Field label="Canal">
                <Select
                  value={channel}
                  onChange={(value) => {
                    const next = value as Order["channel"];
                    setChannel(next);
                    setLabelKind(defaultLabelKind(next));
                  }}
                  options={Object.entries(CHANNELS).map(([value, label]) => ({ value, label }))}
                />
              </Field>
              <Field label="Pagamento">
                <Select value={payment} onChange={(value) => setPayment(value as Order["payment"])} options={[
                  { value: "pago", label: "Pago" },
                  { value: "aguardando", label: "Aguardando pagamento" },
                ]} />
              </Field>
            </div>
          </section>

          <section className="order-create-section" id="itens">
            <div className="order-section-head">
              <div>
                <div className="block-label">Itens</div>
                <h2>Produtos, quantidade e preco</h2>
              </div>
              <Button variant="outline" size="sm" icon="plus" onClick={addLine}>Adicionar item</Button>
            </div>
            {stockAlerts.length > 0 && (
              <div className="order-stock-alert">
                <Icon name="alertCircle" size={17} />
                <div>
                  <strong>Pedido acima do estoque disponivel</strong>
                  <span>O pedido pode ser criado, mas a separacao ficara com pendencia ate reposicao ou producao.</span>
                </div>
              </div>
            )}
            <div className="order-line-list order-line-list--full">
              {draftLines.map((line, index) => (
                <div key={line.id} className={line.overStock ? "order-line-edit order-line-edit--warn" : "order-line-edit"}>
                  <Field label={index === 0 ? "Produto" : ""} style={{ marginBottom: 0 }}>
                    <Select
                      value={line.sku}
                      onChange={(value) => setLine(line.id, { sku: value, unitPrice: moneyInput(find(value)?.price ?? 0) })}
                      options={products.map((item) => ({ value: item.sku, label: `${item.name} ${item.variant}` }))}
                    />
                  </Field>
                  <Field label={index === 0 ? "Qtd" : ""} style={{ width: 78, marginBottom: 0 }}>
                    <Input value={line.qty} inputMode="numeric" onChange={(event) => setLine(line.id, { qty: event.target.value })} />
                  </Field>
                  <Field label={index === 0 ? "Valor un." : ""} style={{ width: 112, marginBottom: 0 }}>
                    <Input value={line.unitPrice} inputMode="decimal" onChange={(event) => setLine(line.id, { unitPrice: event.target.value })} />
                  </Field>
                  <div className="order-line-price">
                    <span>{line.item ? `${line.item.available} disp.` : "sem item"}</span>
                    <strong>{BRL(line.total)}</strong>
                  </div>
                  <Button variant="ghost" size="icon" icon="x" onClick={() => removeLine(line.id)} disabled={lines.length === 1} aria-label="Remover item" />
                  {line.overStock && <div className="order-line-warning">Demanda total do SKU acima do estoque: {demandBySku.get(line.sku) ?? line.qtyNumber} pedido(s), {line.item?.available ?? 0} disponivel.</div>}
                </div>
              ))}
            </div>
          </section>

          <section className="order-create-section" id="valores">
            <div className="order-section-head">
              <div>
                <div className="block-label">Valores</div>
                <h2>Frete, desconto e total</h2>
              </div>
            </div>
            <div className="shipping-step shipping-step--compact">
              <div className="shipping-step-head">
                <span className="shipping-step-index">1</span>
                <div>
                  <div className="block-label">Cotação de frete</div>
                  <div className="section-hint">Usa o CEP do cliente e as dimensões cadastradas dos itens.</div>
                </div>
              </div>
              <div className="shipping-quote-form shipping-quote-form--create">
                <Field label="CEP destino">
                  <Input value={maskCep(customerAddress.postalCode)} onChange={(event) => setCustomerAddressField("postalCode", onlyDigits(event.target.value, 8))} placeholder="00000-000" />
                </Field>
                <Field label="Peso (g)">
                  <Input value={String(draftPackage.weightG)} readOnly />
                </Field>
                <Field label="Comp.">
                  <Input value={String(draftPackage.lengthCm)} readOnly />
                </Field>
                <Field label="Larg.">
                  <Input value={String(draftPackage.widthCm)} readOnly />
                </Field>
                <Field label="Alt.">
                  <Input value={String(draftPackage.heightCm)} readOnly />
                </Field>
                <div className="shipping-quote-action">
                  <Button variant="outline" size="sm" icon="truck" disabled={orderQuoting} onClick={quoteOrderFreight}>{orderQuoting ? "Cotando..." : "Cotar"}</Button>
                </div>
              </div>
              {orderQuoteMessage && <div className="section-hint" style={{ marginBottom: 10 }}>{orderQuoteMessage}</div>}
              {orderQuoteServices.length > 0 && (
                <div className="shipping-rate-grid">
                  {orderQuoteServices.slice(0, 4).map((service) => {
                    const selected = selectedOrderQuoteId === service.id;
                    return (
                      <button key={`${service.id}-${service.name}`} type="button" className={cn("shipping-rate-card", selected && "shipping-rate-card--on")} onClick={() => applyOrderFreight(service)}>
                        <div>
                          <strong>{service.company ? `${service.company} - ${service.name}` : service.name}</strong>
                          <span>{service.deliveryTime === null ? "Prazo indisponivel" : `Ate ${service.deliveryTime} dia(s)`}</span>
                        </div>
                        <div className="shipping-rate-price">{BRL(service.price)}</div>
                        <Badge tone={selected ? "ok" : "outline"}>{selected ? "aplicado" : "aplicar"}</Badge>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="ff-grid">
              <Field label="Frete manual"><Input value={freight} inputMode="decimal" onChange={(event) => {
                setSelectedOrderQuoteId("");
                setFreight(event.target.value);
              }} /></Field>
              <Field label="Desconto"><Input value={discount} inputMode="decimal" onChange={(event) => setDiscount(event.target.value)} /></Field>
            </div>
          </section>

          <section className="order-create-section" id="envio">
            <div className="order-section-head">
              <div>
                <div className="block-label">Envio</div>
                <h2>Rastreio, etiqueta e observacoes</h2>
              </div>
            </div>
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
        </main>

        <aside className="order-create-summary">
          <div className="block-label">Valores</div>
          <div className="order-summary-box">
            <div className="field"><span className="field-k">Subtotal</span><span className="field-v">{BRL(subtotal)}</span></div>
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
            <div className="field"><span className="field-k">Status inicial</span><span className="field-v">{payment === "pago" ? statusInfo(statusMap, "pago").label : statusInfo(statusMap, "aguardando_pagamento").label}</span></div>
          </div>
          {stockAlerts.length > 0 && (
            <>
              <div className="block-label" style={{ marginTop: 16 }}>Alertas</div>
              <div className="order-summary-box order-alert-list">
                {stockAlerts.map((line) => (
                  <div key={line.id} className="order-alert-row">
                    <Icon name="alertCircle" size={15} />
                    <span>{line.item?.name ?? line.sku}: {demandBySku.get(line.sku) ?? line.qtyNumber} pedido(s), {line.item?.available ?? 0} disponivel.</span>
                  </div>
                ))}
              </div>
            </>
          )}
          <div className="order-create-actions">
            <Button variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button variant="default" icon="plus" onClick={submit}>Criar pedido</Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function OrdersScreen({ go, route }: { go: Go; route: Route }) {
  const [workflows] = useWorkflows();
  const dir = useItemDirectory();
  const statusMap = React.useMemo(() => buildStatusMap(workflows.order), [workflows.order]);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [filter, setFilter] = React.useState<OrderFilter>((route.filter as OrderFilter) || "todos");
  const [openId, setOpenId] = React.useState<string | null>(route.open ?? null);
  const [query, setQuery] = React.useState("");
  const [newOpen, setNewOpen] = React.useState(false);
  const [printJob, setPrintJob] = React.useState<PickListJob | null>(null);
  const printCounter = React.useRef(1);

  React.useEffect(() => {
    let alive = true;
    loadOrders()
      .then((nextOrders) => {
        if (alive) setOrders(nextOrders);
      })
      .catch(() => null);
    loadCustomers()
      .then((nextCustomers) => {
        if (alive) setCustomers(nextCustomers);
      })
      .catch(() => null);
    return () => { alive = false; };
  }, []);

  React.useEffect(() => {
    if (route.filter) setFilter(route.filter as OrderFilter);
    if (route.open) setOpenId(route.open);
  }, [route.filter, route.open]);

  const groups: Record<OrderFilter, (order: Order) => boolean> = {
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
    status: (order) => statusInfo(statusMap, order.status).step,
  }, "status", "asc");
  const openOrder = orders.find((order) => order.id === openId);
  const updateOrder = React.useCallback((orderId: string, patch: OrderPatch) => {
    setOrders((current) => current.map((order) => order.id === orderId ? { ...order, ...patch } : order));
    void saveOrderPatch(orderId, patch)
      .then(setOrders)
      .catch(() => toast("Nao foi possivel salvar a alteracao do pedido.", "bad"));
  }, []);
  const applyShippingLabel = React.useCallback((orderId: string, shippingLabel: ShippingLabel) => {
    setOrders((current) => current.map((order) => order.id === orderId ? { ...order, shippingLabel } : order));
  }, []);
  const printPickList = React.useCallback((selected: Order[], title: string) => {
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

  if (newOpen) {
    return (
      <>
        <NewOrderView
          dir={dir}
          statusMap={statusMap}
          customers={customers}
          onCancel={() => setNewOpen(false)}
          onCreate={(order, customerDraft) => {
            setOrders((current) => [order, ...current]);
            void createOrder(order, customerDraft)
              .then(setOrders)
              .catch(() => toast("Nao foi possivel salvar o pedido.", "bad"));
            void loadCustomers().then(setCustomers).catch(() => null);
          }}
        />
        <PickListDocument job={printJob} find={dir.find} />
      </>
    );
  }

  if (openOrder) {
    return (
      <>
        <OrderDrawer
          order={openOrder}
          go={go}
          onClose={() => setOpenId(null)}
          onPrint={printPickList}
          onUpdate={updateOrder}
          onShippingLabel={applyShippingLabel}
          orderSteps={workflows.order}
          statusMap={statusMap}
          find={dir.find}
        />
        <PickListDocument job={printJob} find={dir.find} />
      </>
    );
  }

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
              const status = statusInfo(statusMap, order.status);
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

      <PickListDocument job={printJob} find={dir.find} />
      <Sep style={{ marginTop: 18 }} />
    </div>
  );
}
