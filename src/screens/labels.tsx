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
  Field,
  Icon,
  Modal,
  Select,
  Stepper,
  cn,
  toast,
} from "@/components/ui";
import { LabelBarcode } from "@/components/label-barcode";
import { LabelSheetModelModal } from "@/components/label-sheet-model-modal";
import {
  CHANNELS,
  DEMO_ITEMS,
  DEMO_ORDERS,
  DEMO_PRODUCTION,
} from "@/lib/screen-fixtures";
import {
  BARCODE_TYPE_OPTIONS,
  type BarcodeType,
  type LabelSheet,
  useBarcodeType,
  useLabelSheets,
} from "@/lib/label-sheets";
import type { Go, Route } from "@/lib/types";

type LabelTarget = "item" | "lote" | "op" | "pedido" | "local";
type LabelField =
  | "name"
  | "variant"
  | "sku"
  | "code"
  | "barcode"
  | "lot"
  | "prodDate"
  | "opNum"
  | "productName"
  | "planned"
  | "recipe"
  | "orderNum"
  | "customer"
  | "city"
  | "channel"
  | "locName"
  | "locType";

type LabelTemplate = {
  id: string;
  name: string;
  target: LabelTarget;
  icon: string;
  w: number;
  h: number;
  desc: string;
  fields: LabelField[];
};

type LabelEntity = {
  code: string;
  name?: string;
  variant?: string;
  sku?: string;
  lot?: string;
  prodDate?: string;
  opNum?: string;
  productName?: string;
  planned?: number;
  recipe?: string;
  orderNum?: string;
  customer?: string;
  city?: string;
  channel?: string;
  locName?: string;
  locType?: string;
};

type EntityOption = {
  id: string;
  label: string;
  sub: string;
  entity: LabelEntity;
};

type FieldState = Partial<Record<LabelField, boolean>>;

type QueueItem = {
  id: string;
  template: LabelTemplate;
  entity: LabelEntity;
  fields: FieldState;
  barcodeType: BarcodeType;
  copies: number;
  title: string;
  sub: string;
};

type PrintSpec = {
  template: LabelTemplate;
  entity: LabelEntity;
  fields: FieldState;
  barcodeType: BarcodeType;
  qid: string;
};

const LABEL_TEMPLATES: LabelTemplate[] = [
  { id: "item", name: "Etiqueta de item", target: "item", icon: "tag", w: 50, h: 30, desc: "Produto ou insumo com SKU e codigo", fields: ["name", "variant", "sku", "code", "barcode"] },
  { id: "lote", name: "Etiqueta de lote", target: "lote", icon: "layers", w: 50, h: 30, desc: "Lote produzido com data", fields: ["name", "lot", "prodDate", "code", "barcode"] },
  { id: "op", name: "Etiqueta de OP", target: "op", icon: "producao", w: 60, h: 40, desc: "Ordem de producao", fields: ["opNum", "productName", "planned", "recipe", "barcode"] },
  { id: "pedido", name: "Etiqueta de pedido interno", target: "pedido", icon: "pedidos", w: 100, h: 60, desc: "Organizacao interna do pedido", fields: ["orderNum", "customer", "city", "channel", "barcode"] },
  { id: "local", name: "Etiqueta de local", target: "local", icon: "mapPin", w: 60, h: 40, desc: "Prateleira, caixa ou bancada", fields: ["locName", "locType", "code", "barcode"] },
];

const DEMO_LOCATIONS = [
  { code: "050100000017", name: "Prateleira B1", type: "Prateleira" },
  { code: "050200000024", name: "Caixa organizadora O3", type: "Caixa" },
  { code: "050300000031", name: "Bancada de producao", type: "Bancada" },
  { code: "050400000044", name: "Area de cura", type: "Cura" },
];

const FIELD_LABELS: Record<LabelField, string> = {
  name: "Nome do item",
  variant: "Variacao",
  sku: "SKU humano",
  code: "Codigo interno",
  barcode: "Codigo de barras",
  lot: "Numero do lote",
  prodDate: "Data de producao",
  opNum: "Numero da OP",
  productName: "Produto",
  planned: "Quantidade planejada",
  recipe: "Receita",
  orderNum: "Numero do pedido",
  customer: "Cliente",
  city: "Cidade",
  channel: "Canal",
  locName: "Nome do local",
  locType: "Tipo de local",
};

function barcodeTypeLabel(type: BarcodeType) {
  return BARCODE_TYPE_OPTIONS.find((option) => option.value === type)?.label.split(" - ")[0] ?? type;
}

function previewBarcodeHeight(type: BarcodeType, template: LabelTemplate) {
  if (type === "qr") {
    if (template.w >= 80) return 74;
    if (template.w >= 60) return 62;
    return 50;
  }
  if (template.w >= 80) return 58;
  if (template.w >= 60) return 44;
  return 34;
}

function previewBarcodeScale(type: BarcodeType, template: LabelTemplate) {
  if (type === "code39") {
    if (template.w >= 80) return 0.62;
    if (template.w >= 60) return 0.52;
    return 0.43;
  }
  if (type === "ean13") {
    if (template.w >= 80) return 1.25;
    if (template.w >= 60) return 1.05;
    return 0.92;
  }
  if (template.w >= 80) return 1.15;
  if (template.w >= 60) return 1;
  return 0.85;
}

function printBarcodeHeight(type: BarcodeType, sheet: LabelSheet) {
  if (type === "qr") return Math.max(12, Math.min(24, sheet.labelW - 5, sheet.labelH - 7));
  return Math.max(10, Math.min(22, sheet.labelH * 0.48));
}

function printBarcodeScale(type: BarcodeType, sheet: LabelSheet) {
  if (type === "code39") return sheet.labelW >= 60 ? 0.24 : 0.22;
  if (type === "ean13") return 0.33;
  return 0.28;
}

function printBarcodeMaxWidth(sheet: LabelSheet) {
  return Math.max(8, sheet.labelW - 3);
}

function defaultFields(template: LabelTemplate): FieldState {
  return Object.fromEntries(template.fields.map((field) => [field, true])) as FieldState;
}

function entityOptionsFor(target: LabelTarget): EntityOption[] {
  switch (target) {
    case "item":
      return DEMO_ITEMS.map((item) => ({
        id: item.code,
        label: `${item.name} ${item.variant}`,
        sub: item.sku,
        entity: { name: item.name, variant: item.variant, sku: item.sku, code: item.code },
      }));
    case "lote":
      return DEMO_PRODUCTION
        .filter((order) => order.lot)
        .map((order) => ({
          id: order.lot ?? order.code,
          label: `Lote ${order.lot}`,
          sub: order.productName,
          entity: { name: order.productName, lot: order.lot, prodDate: order.date, code: order.lot ?? order.code },
        }));
    case "op":
      return DEMO_PRODUCTION.map((order) => ({
        id: order.code,
        label: order.num,
        sub: order.productName,
        entity: {
          opNum: order.num,
          productName: order.productName,
          planned: order.planned,
          recipe: `${order.recipe} ${order.recipeVer}`,
          code: order.code,
        },
      }));
    case "pedido":
      return DEMO_ORDERS.map((order) => ({
        id: order.code,
        label: order.num,
        sub: order.customerName,
        entity: {
          orderNum: order.num,
          customer: order.customerName,
          city: order.city,
          channel: CHANNELS[order.channel],
          code: order.code,
        },
      }));
    case "local":
      return DEMO_LOCATIONS.map((location) => ({
        id: location.code,
        label: location.name,
        sub: location.type,
        entity: { locName: location.name, locType: location.type, code: location.code },
      }));
  }
}

function LabelPreview({
  template,
  entity,
  fields,
  barcodeType,
  mm = 3,
}: {
  template: LabelTemplate;
  entity: LabelEntity;
  fields: FieldState;
  barcodeType: BarcodeType;
  mm?: number;
}) {
  const width = template.w * mm;
  const height = template.h * mm;
  const big = template.w >= 80;
  const nameSize = big ? 17 : template.w >= 60 ? 14 : 12;

  return (
    <div className="lab-paper" style={{ width, height }}>
      <div className="lab-paper-pad" style={{ gap: big ? 8 : 5 }}>
        {fields.name && <div className="lab-name" style={{ fontSize: nameSize }}>{entity.name}{fields.variant && entity.variant ? <span className="lab-variant"> - {entity.variant}</span> : null}</div>}
        {fields.opNum && <div className="lab-name" style={{ fontSize: 20 }}>{entity.opNum}</div>}
        {fields.productName && <div style={{ fontSize: 13, color: "#333" }}>{entity.productName}</div>}
        {fields.orderNum && <div className="lab-name" style={{ fontSize: 22 }}>{entity.orderNum}</div>}
        {fields.customer && <div style={{ fontSize: 13, color: "#333" }}>{entity.customer}{fields.city && entity.city ? ` - ${entity.city}` : ""}</div>}
        {fields.channel && entity.channel && <div className="lab-meta" style={{ fontSize: 12 }}>Canal {entity.channel}</div>}
        {fields.locName && <div className="lab-name" style={{ fontSize: 18 }}>{entity.locName}</div>}
        {fields.locType && <div style={{ fontSize: 12, color: "#555" }}>{entity.locType}</div>}
        {fields.sku && <div className="lab-sku" style={{ fontSize: big ? 14 : 12 }}>{entity.sku}</div>}
        {fields.lot && <div className="lab-meta" style={{ fontSize: 12 }}>Lote {entity.lot}</div>}
        {fields.prodDate && <div className="lab-meta" style={{ fontSize: 11 }}>Producao {entity.prodDate}</div>}
        {fields.planned && <div className="lab-meta" style={{ fontSize: 12 }}>{entity.planned} un - {entity.recipe}</div>}
        {fields.code && !fields.barcode && <div className="lab-meta" style={{ fontSize: 11 }}>{entity.code}</div>}
        <div style={{ flex: 1 }} />
        {fields.barcode && (
          <div>
            <LabelBarcode code={entity.code} type={barcodeType} height={previewBarcodeHeight(barcodeType, template)} scale={previewBarcodeScale(barcodeType, template)} />
            <div className="lab-code-h" style={{ fontSize: big ? 13 : 10.5, marginTop: 3 }}>{entity.code}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function PrintLabel({ spec, sheet }: { spec: PrintSpec; sheet: LabelSheet }) {
  const { entity, fields, barcodeType } = spec;
  return (
    <div className="label-print-label">
      <div>
        {fields.name && <div style={{ fontWeight: 700, fontSize: "2.6mm", lineHeight: 1.1 }}>{entity.name}{fields.variant && entity.variant ? ` - ${entity.variant}` : ""}</div>}
        {fields.opNum && <div style={{ fontWeight: 700, fontSize: "3.4mm" }}>{entity.opNum}</div>}
        {fields.orderNum && <div style={{ fontWeight: 700, fontSize: "3.6mm" }}>{entity.orderNum}</div>}
        {fields.customer && <div style={{ fontSize: "2.2mm", color: "#333" }}>{entity.customer}{fields.city && entity.city ? ` - ${entity.city}` : ""}</div>}
        {fields.channel && entity.channel && <div style={{ fontSize: "2.1mm", color: "#333" }}>Canal {entity.channel}</div>}
        {fields.locName && <div style={{ fontWeight: 700, fontSize: "3mm" }}>{entity.locName}</div>}
        {fields.locType && <div style={{ fontSize: "2.2mm", color: "#333" }}>{entity.locType}</div>}
        {fields.productName && <div style={{ fontSize: "2.2mm", color: "#333" }}>{entity.productName}</div>}
        {fields.sku && <div style={{ fontFamily: "Geist Mono, monospace", fontSize: "2.2mm" }}>{entity.sku}</div>}
        {fields.lot && <div style={{ fontFamily: "Geist Mono, monospace", fontSize: "2.2mm", color: "#333" }}>Lote {entity.lot}</div>}
        {fields.prodDate && <div style={{ fontFamily: "Geist Mono, monospace", fontSize: "2mm", color: "#333" }}>Producao {entity.prodDate}</div>}
        {fields.planned && <div style={{ fontFamily: "Geist Mono, monospace", fontSize: "2.1mm", color: "#333" }}>{entity.planned} un - {entity.recipe}</div>}
        {fields.code && !fields.barcode && <div style={{ fontFamily: "Geist Mono, monospace", fontSize: "2mm" }}>{entity.code}</div>}
      </div>
      {fields.barcode && (
        <div>
          <LabelBarcode
            code={entity.code}
            type={barcodeType}
            height={printBarcodeHeight(barcodeType, sheet)}
            scale={printBarcodeScale(barcodeType, sheet)}
            unit="mm"
            maxWidth={printBarcodeMaxWidth(sheet)}
          />
          <div className="label-print-code">{entity.code}</div>
        </div>
      )}
    </div>
  );
}

function AddLabelModal({
  open,
  onClose,
  onAdd,
  defaultBarcodeType,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (item: QueueItem) => void;
  defaultBarcodeType: BarcodeType;
}) {
  const idPrefix = React.useId();
  const nextId = React.useRef(0);
  const [templateId, setTemplateId] = React.useState(LABEL_TEMPLATES[0].id);
  const template = LABEL_TEMPLATES.find((item) => item.id === templateId) ?? LABEL_TEMPLATES[0];
  const entityOptions = React.useMemo(() => entityOptionsFor(template.target), [template.target]);
  const [entityId, setEntityId] = React.useState(entityOptions[0]?.id ?? "");
  const [fields, setFields] = React.useState<FieldState>(() => defaultFields(template));
  const [barcodeType, setBarcodeType] = React.useState<BarcodeType>(defaultBarcodeType);
  const [copies, setCopies] = React.useState(1);

  React.useEffect(() => {
    if (!open) return;
    const firstTemplate = LABEL_TEMPLATES[0];
    setTemplateId(firstTemplate.id);
    setFields(defaultFields(firstTemplate));
    setEntityId(entityOptionsFor(firstTemplate.target)[0]?.id ?? "");
    setBarcodeType(defaultBarcodeType);
    setCopies(1);
  }, [defaultBarcodeType, open]);

  React.useEffect(() => {
    const nextOptions = entityOptionsFor(template.target);
    setFields(defaultFields(template));
    setEntityId(nextOptions[0]?.id ?? "");
  }, [template]);

  const selected = entityOptions.find((option) => option.id === entityId) ?? entityOptions[0];
  const entity = selected?.entity ?? {};

  const toggleField = (field: LabelField) => {
    setFields((current) => ({ ...current, [field]: !current[field] }));
  };

  const add = (keepOpen: boolean) => {
    if (!selected) return;
    const id = `${idPrefix}-${nextId.current++}`;
    onAdd({
      id,
      template,
      entity: selected.entity,
      fields: { ...fields },
      barcodeType,
      copies,
      title: selected.label,
      sub: template.name,
    });
    if (!keepOpen) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon="tag"
      title="Adicionar etiqueta"
      subtitle="Escolha tipo, registro e campos"
      width={860}
      footer={(
        <>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <div className="spacer" style={{ flex: 1 }} />
          <Button variant="outline" icon="plus" onClick={() => add(true)}>Adicionar e continuar</Button>
          <Button variant="default" icon="check" onClick={() => add(false)}>Adicionar a fila</Button>
        </>
      )}
    >
      <div className="addlab">
        <div className="addlab-form">
          <div className="block-label" style={{ marginBottom: 8 }}>Tipo de etiqueta</div>
          <div className="lab-tpl-grid" style={{ marginBottom: 16 }}>
            {LABEL_TEMPLATES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn("lab-tpl", templateId === item.id && "lab-tpl--on")}
                onClick={() => setTemplateId(item.id)}
              >
                <div className={cn("chip", templateId === item.id ? "chip--brand" : "chip--neutral")} style={{ width: 30, height: 30, borderRadius: 8 }}>
                  <Icon name={item.icon} size={15} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</div>
                  <div className="muted" style={{ fontSize: 11 }}>{item.w}x{item.h}mm - {item.desc}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="addlab-control-grid">
            <Field label="Registro">
              <Select
                value={selected?.id ?? ""}
                onChange={setEntityId}
                options={entityOptions.map((option) => ({ value: option.id, label: `${option.label} - ${option.sub}` }))}
              />
            </Field>
            <Field label="Tipo de codigo">
              <Select
                value={barcodeType}
                onChange={(value) => setBarcodeType(value as BarcodeType)}
                options={BARCODE_TYPE_OPTIONS}
                disabled={!fields.barcode}
              />
            </Field>
          </div>

          <div className="block-label" style={{ margin: "4px 0 8px" }}>Campos exibidos</div>
          <div className="lab-field-grid">
            {template.fields.map((field) => (
              <button
                key={field}
                type="button"
                className={cn("lab-field-toggle", fields[field] && "lab-field-toggle--on")}
                onClick={() => toggleField(field)}
              >
                <span>{FIELD_LABELS[field]}</span>
                <span className={cn("lab-sw", fields[field] && "lab-sw--on")} />
              </button>
            ))}
          </div>
        </div>

        <div className="addlab-side">
          <div className="block-label" style={{ marginBottom: 8 }}>Pre-visualizacao</div>
          <div className="lab-stage lab-stage--mini" style={{ marginBottom: 14 }}>
            <div className="lab-stage-grid" />
            {selected ? <LabelPreview template={template} entity={entity} fields={fields} barcodeType={barcodeType} mm={template.w >= 80 ? 2 : 3} /> : <Empty title="Sem registro" />}
          </div>
          <Field label="Quantidade">
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <Stepper value={copies} onChange={(value) => setCopies(Math.max(1, Math.round(value)))} min={1} />
              {[6, 12, 24].map((value) => <Button key={value} variant="ghost" size="sm" onClick={() => setCopies(value)}>{value}x</Button>)}
            </div>
          </Field>
        </div>
      </div>
    </Modal>
  );
}

function assignmentFor(queue: QueueItem[], skip: number[], perSheet: number) {
  const flat: PrintSpec[] = [];
  queue.forEach((item) => {
    for (let index = 0; index < item.copies; index += 1) {
      flat.push({ template: item.template, entity: item.entity, fields: item.fields, barcodeType: item.barcodeType, qid: item.id });
    }
  });

  const slots: number[] = [];
  let page = 0;
  while (slots.length < flat.length && page < 300) {
    for (let cell = 0; cell < perSheet; cell += 1) {
      if (page === 0 && skip.includes(cell)) continue;
      slots.push(page * perSheet + cell);
      if (slots.length >= flat.length) break;
    }
    page += 1;
  }

  const assignment = new Map<number, PrintSpec>();
  const cellQid = new Map<number, string>();
  const cellNum = new Map<number, number>();
  slots.forEach((slot, index) => {
    assignment.set(slot, flat[index]);
    cellQid.set(slot, flat[index].qid);
    cellNum.set(slot, index + 1);
  });

  const lastCell = slots.length ? slots[slots.length - 1] : -1;
  return {
    totalLabels: flat.length,
    pages: Math.max(1, lastCell >= 0 ? Math.floor(lastCell / perSheet) + 1 : 1),
    assignment,
    cellQid,
    cellNum,
  };
}

export function LabelsScreen({ go: _go }: { go: Go; route: Route }) {
  const [sheets, setSheets] = useLabelSheets();
  const [defaultBarcodeType] = useBarcodeType();
  const [sheetId, setSheetId] = React.useState(sheets[0]?.id ?? "");
  const [queue, setQueue] = React.useState<QueueItem[]>([]);
  const [skip, setSkip] = React.useState<number[]>([]);
  const [printed, setPrinted] = React.useState<{ count: number; pages: number; sheet: string } | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [previewId, setPreviewId] = React.useState<string | null>(null);

  const sheet = sheets.find((item) => item.id === sheetId) ?? sheets[0];
  const perSheet = Math.max(1, (sheet?.cols ?? 1) * (sheet?.rows ?? 1));
  const skipCount = skip.filter((index) => index < perSheet).length;
  const { totalLabels, pages, assignment, cellQid, cellNum } = React.useMemo(
    () => assignmentFor(queue, skip, perSheet),
    [queue, skip, perSheet],
  );
  const freeTotal = pages * perSheet - skipCount - totalLabels;

  React.useEffect(() => {
    if (!sheet && sheets[0]) setSheetId(sheets[0].id);
  }, [sheet, sheets]);

  React.useEffect(() => {
    setSkip([]);
  }, [sheetId]);

  const addToQueue = (item: QueueItem) => {
    setQueue((current) => [...current, item]);
    setPreviewId(item.id);
    setPrinted(null);
  };

  const removeQueueItem = (id: string) => {
    setQueue((current) => current.filter((item) => item.id !== id));
    setPreviewId((current) => (current === id ? null : current));
    setPrinted(null);
  };

  const setCopies = (id: string, delta: number) => {
    setQueue((current) => current.map((item) => item.id === id ? { ...item, copies: Math.max(1, item.copies + delta) } : item));
    setPrinted(null);
  };

  const clearQueue = () => {
    setQueue([]);
    setPreviewId(null);
    setPrinted(null);
  };

  const toggleSkip = (index: number) => {
    setSkip((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index]);
    setPrinted(null);
  };

  const printLabels = () => {
    if (!totalLabels || !sheet) return;
    setPrinted({ count: totalLabels, pages, sheet: sheet.name });
    document.body.dataset.printMode = "labels";
    const clear = () => {
      delete document.body.dataset.printMode;
    };
    window.addEventListener("afterprint", clear, { once: true });
    window.setTimeout(() => window.print(), 80);
  };

  if (!sheet) {
    return <div className="page page--wide fade-in"><Empty icon="tag" title="Sem modelos de folha" /></div>;
  }

  return (
    <div className="page page--wide lab-page fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-h1">Etiquetas</h1>
          <p className="page-lede">Monte a fila e imprima apenas as etiquetas no modelo de folha escolhido.</p>
        </div>
        <div className="row-wrap">
          <Button variant="ghost" icon="sliders" onClick={() => setSheetOpen(true)}>Novo modelo de folha</Button>
          <Button variant="outline" icon="fileText" onClick={printLabels} disabled={!totalLabels}>Gerar PDF</Button>
          <Button variant="default" icon="printer" onClick={printLabels} disabled={!totalLabels}>Imprimir{totalLabels ? ` ${totalLabels}x` : ""}</Button>
        </div>
      </div>

      <div className="toolbar">
        <div style={{ minWidth: 320, maxWidth: "100%" }}>
          <Select
            value={sheet.id}
            onChange={setSheetId}
            options={sheets.map((item) => ({
              value: item.id,
              label: `Folha: ${item.name} - ${item.roll ? "rolo" : `${item.cols}x${item.rows}`} (${item.cols * item.rows}/folha)`,
            }))}
          />
        </div>
        <div className="spacer" />
        <Button variant="default" icon="plus" onClick={() => setAddOpen(true)}>Adicionar etiqueta</Button>
      </div>

      <div className="lab-queue-grid">
        <Card style={{ overflow: "hidden" }}>
          <CardHeader>
            <CardTitle>Fila de impressao</CardTitle>
            <div className="row" style={{ gap: 10 }}>
              <span className="muted" style={{ fontSize: 12.5 }}>{queue.length} item(ns) - {totalLabels} etiqueta(s) - {pages} folha(s)</span>
              {queue.length > 0 && <button className="notif-resolve" onClick={clearQueue}>Limpar</button>}
            </div>
          </CardHeader>
          {queue.length === 0 ? (
            <div style={{ padding: "12px 0" }}><Empty icon="tag" title="Fila vazia" hint="Clique em Adicionar etiqueta para montar a primeira." /></div>
          ) : (
            <div className="lab-q-scroll">
              <table className="om-table">
                <thead><tr><th style={{ width: 40 }}>#</th><th>Etiqueta</th><th>Tipo</th><th>Tamanho</th><th className="om-td-right">Qtd</th><th /></tr></thead>
                <tbody>
                  {queue.map((item, index) => (
                    <tr key={item.id} className={cn("om-row-click", previewId === item.id && "om-row-active")} onClick={() => setPreviewId(item.id)}>
                      <td className="muted">{index + 1}</td>
                      <td>
                        <div className="item-cell">
                          <div className="lab-q-thumb"><Icon name={item.template.icon} size={15} /></div>
                          <div style={{ minWidth: 0 }}>
                            <div className="cell-title">{item.title}</div>
                            <div className="cell-sub">{item.entity.code}</div>
                          </div>
                        </div>
                      </td>
                      <td><Badge tone="neutral">{item.sub}</Badge></td>
                      <td>
                        <div className="muted mono" style={{ fontSize: 12 }}>{item.template.w}x{item.template.h}mm</div>
                        <div className="cell-sub">{barcodeTypeLabel(item.barcodeType)}</div>
                      </td>
                      <td className="om-td-right" onClick={(event) => event.stopPropagation()}>
                        <div className="lab-stepper" style={{ height: 30, marginLeft: "auto" }}>
                          <button style={{ width: 28, height: 28 }} onClick={() => setCopies(item.id, -1)}><Icon name="minus" size={13} /></button>
                          <input style={{ width: 38, height: 28 }} value={item.copies} readOnly />
                          <button style={{ width: 28, height: 28 }} onClick={() => setCopies(item.id, 1)}><Icon name="plus" size={13} /></button>
                        </div>
                      </td>
                      <td className="om-td-right" onClick={(event) => event.stopPropagation()}>
                        <button className="wf-handle-btn" onClick={() => removeQueueItem(item.id)}><Icon name="x" size={15} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {queue.length > 0 && (
            <div style={{ padding: "14px 16px", borderTop: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", gap: 12 }}>
              <Button variant="outline" size="sm" icon="plus" onClick={() => setAddOpen(true)}>Adicionar outra</Button>
              <div className="spacer" style={{ flex: 1 }} />
              <Button variant="default" icon="printer" onClick={printLabels}>Imprimir {totalLabels} - {pages} folha(s)</Button>
            </div>
          )}
          {printed && (
            <div className="lab-print-message">
              <Icon name="check" size={15} /> {printed.count} etiqueta(s) em {printed.pages} folha(s) de {printed.sheet} enviadas para impressao.
            </div>
          )}
        </Card>

        <div className="lab-side">
          <Card className="lab-folha-card">
            <CardHeader><CardTitle>Folha</CardTitle><span className="muted" style={{ fontSize: 12 }}>{sheet.name} - {sheet.roll ? "rolo" : `${sheet.cols}x${sheet.rows}`}</span></CardHeader>
            <CardContent style={{ paddingTop: 8, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <div className="lab-fill lab-fill--big" style={{ gridTemplateColumns: `repeat(${Math.min(sheet.cols, 8)}, 1fr)` }}>
                {Array.from({ length: Math.min(perSheet, 48) }).map((_, index) => {
                  const isSkip = skip.includes(index);
                  const hasLabel = assignment.has(index);
                  const highlighted = hasLabel && cellQid.get(index) === previewId;
                  return (
                    <button
                      key={index}
                      type="button"
                      title={isSkip ? "Posicao pulada - clique para liberar" : "Clique para pular esta posicao"}
                      onClick={() => toggleSkip(index)}
                      className={cn("lab-fill-cell", isSkip ? "lab-fill-cell--skip" : hasLabel ? "lab-fill-cell--on" : "lab-fill-cell--free", highlighted && "lab-fill-cell--hi")}
                    >
                      {isSkip ? <Icon name="x" size={13} /> : hasLabel ? <span className="lab-fill-n">{cellNum.get(index)}</span> : null}
                    </button>
                  );
                })}
              </div>
              <div className="row between" style={{ marginTop: 12 }}>
                <span className="muted" style={{ fontSize: 12 }}>
                  {skipCount > 0 ? `${skipCount} pulada(s) - ` : ""}
                  {totalLabels ? `${Math.max(0, freeTotal)} livre(s) - ${pages} folha(s)` : `${perSheet} posicoes`}
                </span>
                {skipCount > 0 && <button className="notif-resolve" onClick={() => { setSkip([]); setPrinted(null); }}>Limpar puladas</button>}
              </div>
              <div className="muted" style={{ fontSize: 11.5, marginTop: 8, display: "flex", gap: 6, alignItems: "flex-start" }}>
                <Icon name="alertCircle" size={13} /> Folha ja usada? Clique nas posicoes para pular antes de imprimir.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AddLabelModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={addToQueue} defaultBarcodeType={defaultBarcodeType} />
      <LabelSheetModelModal
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onCreate={(newSheet) => {
          setSheets((current) => [newSheet, ...current]);
          setSheetId(newSheet.id);
          toast("Modelo de folha criado para o tenant.", "ok");
        }}
      />

      <div className="label-print-doc" aria-hidden="true">
        {totalLabels > 0 && Array.from({ length: pages }).map((_, pageIndex) => (
          <div
            key={pageIndex}
            className="label-print-page"
            style={{
              width: `${sheet.pageW}mm`,
              height: `${sheet.pageH}mm`,
              pageBreakAfter: pageIndex + 1 === pages ? "auto" : "always",
            }}
          >
            {Array.from({ length: perSheet }).map((_, cell) => {
              const global = pageIndex * perSheet + cell;
              const spec = assignment.get(global);
              if (!spec) return null;
              const row = Math.floor(cell / sheet.cols);
              const col = cell % sheet.cols;
              return (
                <div
                  key={cell}
                  className="label-print-slot"
                  style={{
                    left: `${sheet.mLeft + col * (sheet.labelW + sheet.gutX)}mm`,
                    top: `${sheet.mTop + row * (sheet.labelH + sheet.gutY)}mm`,
                    width: `${sheet.labelW}mm`,
                    height: `${sheet.labelH}mm`,
                  }}
                >
                  <PrintLabel spec={spec} sheet={sheet} />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
