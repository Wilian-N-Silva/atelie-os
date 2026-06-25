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
  Input,
  Modal,
  Select,
  Stepper,
  Textarea,
  cn,
  toast,
} from "@/components/ui";
import { LabelBarcode } from "@/components/label-barcode";
import { LabelSheetModelModal } from "@/components/label-sheet-model-modal";
import {
  CHANNELS,
  type ItemSummary,
  type Order,
  type ProductionOrder,
} from "@/lib/domain";
import { loadOrders } from "@/lib/orders-client";
import { loadProduction } from "@/lib/production-client";
import { useItemDirectory } from "@/lib/item-directory";
import { fetchInventory } from "@/lib/inventory";
import {
  BARCODE_TYPE_OPTIONS,
  type BarcodeType,
  type LabelSheet,
  useBarcodeType,
  useLabelSheets,
} from "@/lib/label-sheets";
import {
  FIELD_LABELS,
  LABEL_ICON_OPTIONS,
  LABEL_TARGET_OPTIONS,
  type LabelField,
  type LabelTarget,
  type LabelTemplate,
  type LabelTemplateElement,
  createLabelTemplate,
  useLabelTemplates,
} from "@/lib/label-templates";
import type { Go, Route } from "@/lib/types";

type LabelEntity = {
  code: string;
  name?: string;
  variant?: string;
  sku?: string;
  lot?: string;
  prodDate?: string;
  opNum?: string;
  productName?: string;
  planned?: number | string;
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
type FieldOverrides = Partial<Record<LabelField, string>>;

type LabelLayoutAdjustments = {
  textScale: number;
  barcodeScale: number;
  offsetX: number;
  offsetY: number;
  paddingMm: number;
};

const DEFAULT_LAYOUT: LabelLayoutAdjustments = {
  textScale: 1,
  barcodeScale: 1,
  offsetX: 0,
  offsetY: 0,
  paddingMm: 1.5,
};

type QueueItem = {
  id: string;
  template: LabelTemplate;
  entity: LabelEntity;
  fields: FieldState;
  overrides?: FieldOverrides;
  layout?: LabelLayoutAdjustments;
  barcodeType: BarcodeType;
  copies: number;
  title: string;
  sub: string;
};

type PrintSpec = {
  template: LabelTemplate;
  entity: LabelEntity;
  fields: FieldState;
  overrides?: FieldOverrides;
  layout?: LabelLayoutAdjustments;
  barcodeType: BarcodeType;
  qid: string;
};

const EDITOR_PX_PER_MM = 96 / 25.4;
const EDITOR_MIN_ZOOM = 0.75;
const EDITOR_MAX_ZOOM = 80;

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

function normalizeLayout(layout?: Partial<LabelLayoutAdjustments>): LabelLayoutAdjustments {
  return {
    textScale: Math.max(0.6, Math.min(1.8, Number(layout?.textScale ?? DEFAULT_LAYOUT.textScale))),
    barcodeScale: Math.max(0.5, Math.min(1.8, Number(layout?.barcodeScale ?? DEFAULT_LAYOUT.barcodeScale))),
    offsetX: Math.max(-20, Math.min(20, Number(layout?.offsetX ?? DEFAULT_LAYOUT.offsetX))),
    offsetY: Math.max(-20, Math.min(20, Number(layout?.offsetY ?? DEFAULT_LAYOUT.offsetY))),
    paddingMm: Math.max(0, Math.min(15, Number(layout?.paddingMm ?? DEFAULT_LAYOUT.paddingMm))),
  };
}

function entityWithOverrides(entity: LabelEntity, overrides?: FieldOverrides): LabelEntity {
  return { ...entity, ...Object.fromEntries(Object.entries(overrides ?? {}).filter(([, value]) => value !== undefined)) };
}

function fieldValue(entity: LabelEntity, field: LabelField) {
  const value = entity[field as keyof LabelEntity];
  return value == null ? "" : String(value);
}

function LabelElementLayer({
  elements,
  entity,
  overrides,
  barcodeType,
  layout,
  template,
  print,
  sheet,
}: {
  elements: LabelTemplateElement[];
  entity: LabelEntity;
  overrides?: FieldOverrides;
  barcodeType: BarcodeType;
  layout: LabelLayoutAdjustments;
  template: LabelTemplate;
  print?: boolean;
  sheet?: LabelSheet;
}) {
  const display = entityWithOverrides(entity, overrides);
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", transform: `translate(${print ? layout.offsetX : layout.offsetX * 0.8}${print ? "mm" : "px"}, ${print ? layout.offsetY : layout.offsetY * 0.8}${print ? "mm" : "px"})` }}>
      {elements.map((element) => {
        const common: React.CSSProperties = {
          position: "absolute",
          left: `${element.x}%`,
          top: `${element.y}%`,
          width: `${element.w}%`,
          height: `${element.h}%`,
          display: "flex",
          alignItems: "center",
          justifyContent: element.align === "center" ? "center" : element.align === "right" ? "flex-end" : "flex-start",
          overflow: "hidden",
          textAlign: element.align ?? "left",
          fontSize: print ? `${(element.fontSize * layout.textScale) / 3.8}mm` : element.fontSize * layout.textScale,
          fontWeight: element.fontWeight ?? "600",
          lineHeight: 1.1,
        };
        if (element.type === "icon") {
          return (
            <div key={element.id} style={common}>
              <Icon name={element.value} size={print ? Math.max(10, element.fontSize * layout.textScale) : element.fontSize * layout.textScale} />
            </div>
          );
        }
        if (element.type === "field" && element.value === "barcode") {
          return (
            <div key={element.id} style={{ ...common, display: "block" }}>
              <LabelBarcode
                code={display.code}
                type={barcodeType}
                height={(print && sheet ? printBarcodeHeight(barcodeType, sheet) : previewBarcodeHeight(barcodeType, template)) * layout.barcodeScale}
                scale={(print && sheet ? printBarcodeScale(barcodeType, sheet) : previewBarcodeScale(barcodeType, template)) * layout.barcodeScale}
                unit={print ? "mm" : "px"}
                maxWidth={print && sheet ? printBarcodeMaxWidth(sheet) : undefined}
              />
            </div>
          );
        }
        const text = element.type === "field"
          ? fieldValue(display, element.value as LabelField)
          : element.value;
        return <div key={element.id} style={common}>{text}</div>;
      })}
    </div>
  );
}

function LabelEditorElement({
  element,
  draft,
  active,
  onSelect,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  element: LabelTemplateElement;
  draft: LabelTemplate;
  active: boolean;
  onSelect: () => void;
  onPointerDown: (event: React.PointerEvent) => void;
  onPointerMove: (event: React.PointerEvent) => void;
  onPointerUp: (event: React.PointerEvent) => void;
}) {
  const style: React.CSSProperties = {
    left: `${element.x}%`,
    top: `${element.y}%`,
    width: `${element.w}%`,
    height: `${element.h}%`,
    alignItems: "center",
    justifyContent: element.align === "center" ? "center" : element.align === "right" ? "flex-end" : "flex-start",
    textAlign: element.align ?? "left",
    fontSize: element.fontSize,
    fontWeight: element.fontWeight ?? "600",
  };

  const content = (() => {
    if (element.type === "icon") return <Icon name={element.value} size={Math.max(10, element.fontSize)} />;
    if (element.type === "field" && element.value === "barcode") {
      const barcodeHeight = Math.max(10, (draft.h * EDITOR_PX_PER_MM * element.h) / 100 - 4);
      return (
        <span className="label-editor-barcode-box">
          <LabelBarcode
            code={SAMPLE_ENTITY.code}
            type="code128"
            height={barcodeHeight}
            scale={1}
            className="label-editor-barcode-preview"
          />
        </span>
      );
    }
    if (element.type === "field") return fieldValue(SAMPLE_ENTITY, element.value as LabelField);
    return element.value;
  })();

  return (
    <button
      draggable={false}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={onSelect}
      className={cn("label-editor-element", active && "label-editor-element--on")}
      style={style}
      type="button"
    >
      {content}
    </button>
  );
}

type LabelLocation = { code: string; name: string; type: string };
type EntitySources = { orders: Order[]; items: ItemSummary[]; production: ProductionOrder[]; locations: LabelLocation[] };

function entityOptionsFor(target: LabelTarget, sources: EntitySources): EntityOption[] {
  const { orders, items, production, locations } = sources;
  switch (target) {
    case "item":
      return items.map((item) => ({
        id: item.code,
        label: `${item.name} ${item.variant}`,
        sub: item.sku,
        entity: { name: item.name, variant: item.variant, sku: item.sku, code: item.code },
      }));
    case "lote":
      return production
        .filter((order) => order.lot)
        .map((order) => ({
          id: order.lot ?? order.code,
          label: `Lote ${order.lot}`,
          sub: order.productName,
          entity: { name: order.productName, lot: order.lot, prodDate: order.date, code: order.lot ?? order.code },
        }));
    case "op":
      return production.map((order) => ({
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
      return orders.map((order) => ({
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
      return locations.map((location) => ({
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
  overrides,
  layout,
  barcodeType,
  mm = 3,
}: {
  template: LabelTemplate;
  entity: LabelEntity;
  fields: FieldState;
  overrides?: FieldOverrides;
  layout?: LabelLayoutAdjustments;
  barcodeType: BarcodeType;
  mm?: number;
}) {
  const display = entityWithOverrides(entity, overrides);
  const adjust = normalizeLayout(layout);
  const width = template.w * mm;
  const height = template.h * mm;
  const big = template.w >= 80;
  const nameSize = (big ? 17 : template.w >= 60 ? 14 : 12) * adjust.textScale;

  return (
    <div className="lab-paper" style={{ width, height }}>
      {template.elements?.length ? (
        <div className="lab-paper-pad" style={{ padding: `${Math.max(4, adjust.paddingMm * 2)}%` }}>
          <LabelElementLayer elements={template.elements} entity={entity} overrides={overrides} barcodeType={barcodeType} layout={adjust} template={template} />
        </div>
      ) : (
      <div className="lab-paper-pad" style={{ gap: big ? 8 : 5, padding: `${Math.max(4, adjust.paddingMm * 2)}%`, transform: `translate(${adjust.offsetX * mm * 0.18}px, ${adjust.offsetY * mm * 0.18}px)` }}>
        {fields.name && <div className="lab-name" style={{ fontSize: nameSize }}>{display.name}{fields.variant && display.variant ? <span className="lab-variant"> - {display.variant}</span> : null}</div>}
        {fields.opNum && <div className="lab-name" style={{ fontSize: 20 * adjust.textScale }}>{display.opNum}</div>}
        {fields.productName && <div style={{ fontSize: 13 * adjust.textScale, color: "#333" }}>{display.productName}</div>}
        {fields.orderNum && <div className="lab-name" style={{ fontSize: 22 * adjust.textScale }}>{display.orderNum}</div>}
        {fields.customer && <div style={{ fontSize: 13 * adjust.textScale, color: "#333" }}>{display.customer}{fields.city && display.city ? ` - ${display.city}` : ""}</div>}
        {fields.channel && display.channel && <div className="lab-meta" style={{ fontSize: 12 * adjust.textScale }}>Canal {display.channel}</div>}
        {fields.locName && <div className="lab-name" style={{ fontSize: 18 * adjust.textScale }}>{display.locName}</div>}
        {fields.locType && <div style={{ fontSize: 12 * adjust.textScale, color: "#555" }}>{display.locType}</div>}
        {fields.sku && <div className="lab-sku" style={{ fontSize: (big ? 14 : 12) * adjust.textScale }}>{display.sku}</div>}
        {fields.lot && <div className="lab-meta" style={{ fontSize: 12 * adjust.textScale }}>Lote {display.lot}</div>}
        {fields.prodDate && <div className="lab-meta" style={{ fontSize: 11 * adjust.textScale }}>Producao {display.prodDate}</div>}
        {fields.planned && <div className="lab-meta" style={{ fontSize: 12 * adjust.textScale }}>{display.planned} un - {display.recipe}</div>}
        {fields.code && !fields.barcode && <div className="lab-meta" style={{ fontSize: 11 * adjust.textScale }}>{display.code}</div>}
        <div style={{ flex: 1 }} />
        {fields.barcode && (
          <div>
            <LabelBarcode code={display.code} type={barcodeType} height={previewBarcodeHeight(barcodeType, template) * adjust.barcodeScale} scale={previewBarcodeScale(barcodeType, template) * adjust.barcodeScale} />
            <div className="lab-code-h" style={{ fontSize: (big ? 13 : 10.5) * adjust.textScale, marginTop: 3 }}>{display.code}</div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}

function PrintLabel({ spec, sheet }: { spec: PrintSpec; sheet: LabelSheet }) {
  const { fields, barcodeType } = spec;
  const entity = entityWithOverrides(spec.entity, spec.overrides);
  const layout = normalizeLayout({
    ...DEFAULT_LAYOUT,
    paddingMm: sheet.shape === "circle" ? 5 : DEFAULT_LAYOUT.paddingMm,
    ...spec.layout,
  });
  const textScale = layout.textScale;
  return (
    <div
      className="label-print-label"
      style={{
        padding: `${layout.paddingMm}mm`,
        borderRadius: sheet.shape === "circle" ? "999px" : undefined,
      }}
    >
      {spec.template.elements?.length ? (
        <LabelElementLayer elements={spec.template.elements} entity={spec.entity} overrides={spec.overrides} barcodeType={barcodeType} layout={layout} template={spec.template} print sheet={sheet} />
      ) : (
      <div style={{ transform: `translate(${layout.offsetX}mm, ${layout.offsetY}mm)` }}>
      <div>
        {fields.name && <div style={{ fontWeight: 700, fontSize: `${2.6 * textScale}mm`, lineHeight: 1.1 }}>{entity.name}{fields.variant && entity.variant ? ` - ${entity.variant}` : ""}</div>}
        {fields.opNum && <div style={{ fontWeight: 700, fontSize: `${3.4 * textScale}mm` }}>{entity.opNum}</div>}
        {fields.orderNum && <div style={{ fontWeight: 700, fontSize: `${3.6 * textScale}mm` }}>{entity.orderNum}</div>}
        {fields.customer && <div style={{ fontSize: `${2.2 * textScale}mm`, color: "#333" }}>{entity.customer}{fields.city && entity.city ? ` - ${entity.city}` : ""}</div>}
        {fields.channel && entity.channel && <div style={{ fontSize: `${2.1 * textScale}mm`, color: "#333" }}>Canal {entity.channel}</div>}
        {fields.locName && <div style={{ fontWeight: 700, fontSize: `${3 * textScale}mm` }}>{entity.locName}</div>}
        {fields.locType && <div style={{ fontSize: `${2.2 * textScale}mm`, color: "#333" }}>{entity.locType}</div>}
        {fields.productName && <div style={{ fontSize: `${2.2 * textScale}mm`, color: "#333" }}>{entity.productName}</div>}
        {fields.sku && <div style={{ fontFamily: "Geist Mono, monospace", fontSize: `${2.2 * textScale}mm` }}>{entity.sku}</div>}
        {fields.lot && <div style={{ fontFamily: "Geist Mono, monospace", fontSize: `${2.2 * textScale}mm`, color: "#333" }}>Lote {entity.lot}</div>}
        {fields.prodDate && <div style={{ fontFamily: "Geist Mono, monospace", fontSize: `${2 * textScale}mm`, color: "#333" }}>Producao {entity.prodDate}</div>}
        {fields.planned && <div style={{ fontFamily: "Geist Mono, monospace", fontSize: `${2.1 * textScale}mm`, color: "#333" }}>{entity.planned} un - {entity.recipe}</div>}
        {fields.code && !fields.barcode && <div style={{ fontFamily: "Geist Mono, monospace", fontSize: `${2 * textScale}mm` }}>{entity.code}</div>}
      </div>
      {fields.barcode && (
        <div>
          <LabelBarcode
            code={entity.code}
            type={barcodeType}
            height={printBarcodeHeight(barcodeType, sheet) * layout.barcodeScale}
            scale={printBarcodeScale(barcodeType, sheet) * layout.barcodeScale}
            unit="mm"
            maxWidth={printBarcodeMaxWidth(sheet)}
          />
          <div className="label-print-code">{entity.code}</div>
        </div>
      )}
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
  sources,
  templates,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (item: QueueItem) => void;
  defaultBarcodeType: BarcodeType;
  sources: EntitySources;
  templates: LabelTemplate[];
}) {
  const idPrefix = React.useId();
  const nextId = React.useRef(0);
  const [templateId, setTemplateId] = React.useState(templates[0]?.id ?? "");
  const template = templates.find((item) => item.id === templateId) ?? templates[0];
  const entityOptions = React.useMemo(() => template ? entityOptionsFor(template.target, sources) : [], [sources, template]);
  const [entityId, setEntityId] = React.useState(entityOptions[0]?.id ?? "");
  const [fields, setFields] = React.useState<FieldState>(() => template ? defaultFields(template) : {});
  const [advanced, setAdvanced] = React.useState(false);
  const [overrides, setOverrides] = React.useState<FieldOverrides>({});
  const [layout, setLayoutState] = React.useState<LabelLayoutAdjustments>(() => normalizeLayout());
  const [barcodeType, setBarcodeType] = React.useState<BarcodeType>(defaultBarcodeType);
  const [copies, setCopies] = React.useState(1);

  React.useEffect(() => {
    if (!open) return;
    const firstTemplate = templates[0];
    if (!firstTemplate) return;
    setTemplateId(firstTemplate.id);
    setFields(defaultFields(firstTemplate));
    setEntityId(entityOptionsFor(firstTemplate.target, sources)[0]?.id ?? "");
    setAdvanced(false);
    setOverrides({});
    setLayoutState(normalizeLayout());
    setBarcodeType(defaultBarcodeType);
    setCopies(1);
  }, [defaultBarcodeType, open, sources, templates]);

  React.useEffect(() => {
    if (!template) return;
    const nextOptions = entityOptionsFor(template.target, sources);
    setFields(defaultFields(template));
    setOverrides({});
    setLayoutState(normalizeLayout({ paddingMm: template.w >= 60 && template.h >= 60 ? 5 : DEFAULT_LAYOUT.paddingMm }));
    setEntityId(nextOptions[0]?.id ?? "");
  }, [sources, template]);

  const selected = entityOptions.find((option) => option.id === entityId) ?? entityOptions[0];
  const entity = selected?.entity ?? {};
  const activeTextFields = template?.fields.filter((field) => field !== "barcode" && (fields[field] || field === "code")) ?? [];

  const toggleField = (field: LabelField) => {
    setFields((current) => ({ ...current, [field]: !current[field] }));
  };

  const setOverride = (field: LabelField, value: string) => {
    setOverrides((current) => ({ ...current, [field]: value }));
  };

  const setLayout = (patch: Partial<LabelLayoutAdjustments>) => {
    setLayoutState((current) => normalizeLayout({ ...current, ...patch }));
  };

  const add = (keepOpen: boolean) => {
    if (!selected) return;
    const id = `${idPrefix}-${nextId.current++}`;
    onAdd({
      id,
      template,
      entity: selected.entity,
      fields: { ...fields },
      overrides: { ...overrides },
      layout,
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
      {!template ? <Empty icon="tag" title="Nenhum tipo de etiqueta" hint="Crie um tipo de etiqueta antes de adicionar a fila." /> : (
      <div className="addlab">
        <div className="addlab-form">
          <div className="block-label" style={{ marginBottom: 8 }}>Tipo de etiqueta</div>
          <div className="lab-tpl-grid" style={{ marginBottom: 16 }}>
            {templates.map((item) => (
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
          <div className="row between" style={{ marginBottom: 8 }}>
            <div className="block-label">Pre-visualizacao</div>
            <Button variant={advanced ? "default" : "ghost"} size="sm" icon="sliders" onClick={() => setAdvanced((current) => !current)}>Avancado</Button>
          </div>
          <div className="lab-stage lab-stage--mini" style={{ marginBottom: 14 }}>
            <div className="lab-stage-grid" />
            {selected ? <LabelPreview template={template} entity={entity} fields={fields} overrides={overrides} layout={layout} barcodeType={barcodeType} mm={template.w >= 80 ? 2 : 3} /> : <Empty title="Sem registro" />}
          </div>
          {advanced && (
            <div className="grid" style={{ gap: 10, marginBottom: 14 }}>
              <div className="block-label">Texto desta etiqueta</div>
              {activeTextFields.map((field) => (
                <Field key={field} label={FIELD_LABELS[field]}>
                  <Input value={overrides[field] ?? fieldValue(entity, field)} onChange={(event) => setOverride(field, event.target.value)} />
                </Field>
              ))}
              {fields.barcode && (
                <Field label="Codigo do barcode">
                  <Input value={overrides.code ?? fieldValue(entity, "code")} onChange={(event) => setOverride("code", event.target.value)} />
                </Field>
              )}
              <div className="ff-grid">
                <Field label="Texto %"><Stepper value={Math.round(layout.textScale * 100)} min={60} max={180} onChange={(value) => setLayout({ textScale: value / 100 })} /></Field>
                <Field label="Codigo %"><Stepper value={Math.round(layout.barcodeScale * 100)} min={50} max={180} onChange={(value) => setLayout({ barcodeScale: value / 100 })} /></Field>
              </div>
              <div className="ff-grid">
                <Field label="X mm"><Input inputMode="decimal" value={String(layout.offsetX)} onChange={(event) => setLayout({ offsetX: Number(event.target.value.replace(",", ".")) || 0 })} /></Field>
                <Field label="Y mm"><Input inputMode="decimal" value={String(layout.offsetY)} onChange={(event) => setLayout({ offsetY: Number(event.target.value.replace(",", ".")) || 0 })} /></Field>
              </div>
              <Field label="Margem interna mm"><Input inputMode="decimal" value={String(layout.paddingMm)} onChange={(event) => setLayout({ paddingMm: Number(event.target.value.replace(",", ".")) || 0 })} /></Field>
            </div>
          )}
          <Field label="Quantidade">
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <Stepper value={copies} onChange={(value) => setCopies(Math.max(1, Math.round(value)))} min={1} />
              {[6, 12, 24].map((value) => <Button key={value} variant="ghost" size="sm" onClick={() => setCopies(value)}>{value}x</Button>)}
            </div>
          </Field>
        </div>
      </div>
      )}
    </Modal>
  );
}

function AdvancedLabelPanel({
  item,
  sheet,
  onChange,
}: {
  item: QueueItem | null;
  sheet: LabelSheet;
  onChange: (patch: Partial<QueueItem>) => void;
}) {
  if (!item) {
    return (
      <Card>
        <CardContent style={{ paddingTop: 16 }}>
          <Empty icon="sliders" title="Selecione uma etiqueta" hint="Clique em uma linha da fila para ajustar texto, escala e posicao." />
        </CardContent>
      </Card>
    );
  }

  const layout = normalizeLayout({
    ...DEFAULT_LAYOUT,
    paddingMm: sheet.shape === "circle" ? 5 : DEFAULT_LAYOUT.paddingMm,
    ...item.layout,
  });
  const fieldsForText = item.template.fields
    .filter((field) => field !== "barcode" && (item.fields[field] || field === "code"));
  const editableFields: LabelField[] = fieldsForText.includes("code") || !item.fields.barcode ? fieldsForText : [...fieldsForText, "code"];

  const setFieldEnabled = (field: LabelField) => {
    onChange({ fields: { ...item.fields, [field]: !item.fields[field] } });
  };

  const setOverride = (field: LabelField, value: string) => {
    onChange({ overrides: { ...item.overrides, [field]: value } });
  };

  const setLayout = (patch: Partial<LabelLayoutAdjustments>) => {
    onChange({ layout: normalizeLayout({ ...layout, ...patch }) });
  };

  const reset = () => {
    onChange({
      overrides: {},
      layout: normalizeLayout({ paddingMm: sheet.shape === "circle" ? 5 : DEFAULT_LAYOUT.paddingMm }),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajuste avancado</CardTitle>
        <Button variant="ghost" size="sm" icon="refresh" onClick={reset}>Resetar</Button>
      </CardHeader>
      <CardContent style={{ paddingTop: 8 }}>
        <div className="lab-stage lab-stage--mini" style={{ minHeight: 190, marginBottom: 14 }}>
          <div className="lab-stage-grid" />
          <LabelPreview
            template={item.template}
            entity={item.entity}
            fields={item.fields}
            overrides={item.overrides}
            layout={layout}
            barcodeType={item.barcodeType}
            mm={item.template.w >= 80 ? 1.8 : item.template.w >= 60 ? 2.4 : 3}
          />
        </div>

        <div className="block-label" style={{ marginBottom: 8 }}>Campos</div>
        <div className="lab-field-grid" style={{ marginBottom: 14 }}>
          {item.template.fields.map((field) => (
            <button
              key={field}
              type="button"
              className={cn("lab-field-toggle", item.fields[field] && "lab-field-toggle--on")}
              onClick={() => setFieldEnabled(field)}
            >
              <span>{FIELD_LABELS[field]}</span>
              <span className={cn("lab-sw", item.fields[field] && "lab-sw--on")} />
            </button>
          ))}
        </div>

        <div className="block-label" style={{ marginBottom: 8 }}>Texto por etiqueta</div>
        <div className="grid" style={{ gap: 8, marginBottom: 14 }}>
          {editableFields.map((field) => (
            <Field key={field} label={FIELD_LABELS[field]}>
              <Input
                value={item.overrides?.[field] ?? fieldValue(item.entity, field)}
                onChange={(event) => setOverride(field, event.target.value)}
              />
            </Field>
          ))}
        </div>

        <div className="block-label" style={{ marginBottom: 8 }}>Layout fino</div>
        <div className="ff-grid">
          <Field label="Texto">
            <Stepper value={Math.round(layout.textScale * 100)} min={60} max={180} onChange={(value) => setLayout({ textScale: value / 100 })} />
          </Field>
          <Field label="Codigo">
            <Stepper value={Math.round(layout.barcodeScale * 100)} min={50} max={180} onChange={(value) => setLayout({ barcodeScale: value / 100 })} />
          </Field>
        </div>
        <div className="ff-grid">
          <Field label="Mover X mm">
            <Input inputMode="decimal" value={String(layout.offsetX)} onChange={(event) => setLayout({ offsetX: Number(event.target.value.replace(",", ".")) || 0 })} />
          </Field>
          <Field label="Mover Y mm">
            <Input inputMode="decimal" value={String(layout.offsetY)} onChange={(event) => setLayout({ offsetY: Number(event.target.value.replace(",", ".")) || 0 })} />
          </Field>
        </div>
        <Field label="Margem interna mm">
          <Input inputMode="decimal" value={String(layout.paddingMm)} onChange={(event) => setLayout({ paddingMm: Number(event.target.value.replace(",", ".")) || 0 })} />
        </Field>
      </CardContent>
    </Card>
  );
}

const SAMPLE_ENTITY: LabelEntity = {
  code: "010300001287",
  name: "Vela Lavanda Francesa",
  variant: "156ml",
  sku: "VEL-LAV-156",
  lot: "L-000128",
  prodDate: "23/06/2026",
  opNum: "OP-000208",
  productName: "Vela Lavanda Francesa",
  planned: 24,
  recipe: "Receita padrao v1",
  orderNum: "PED-000931",
  customer: "Cliente",
  city: "Sao Paulo",
  channel: "Manual",
  locName: "Area de Cura",
  locType: "Prateleira",
};

function blankTemplate(): LabelTemplate {
  return createLabelTemplate({
    name: "Etiqueta personalizada",
    target: "item",
    icon: "tag",
    w: 60,
    h: 60,
    desc: "Layout editavel",
    fields: ["name", "barcode"],
    elements: [],
  });
}

export function LabelTemplateEditorWorkspace({
  templates,
  onSave,
  onBack,
  fullscreen = false,
}: {
  templates: LabelTemplate[];
  onSave: React.Dispatch<React.SetStateAction<LabelTemplate[]>>;
  onBack?: () => void;
  fullscreen?: boolean;
}) {
  const [selectedId, setSelectedId] = React.useState<string>("new");
  const [draft, setDraft] = React.useState<LabelTemplate>(() => blankTemplate());
  const [activeElementId, setActiveElementId] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState(2.5);
  const [detailsOpen, setDetailsOpen] = React.useState(true);
  const [elementOpen, setElementOpen] = React.useState(true);
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  React.useEffect(() => {
    const first = templates[0];
    setSelectedId(first?.id ?? "new");
    setDraft(first ?? blankTemplate());
    setActiveElementId(null);
  }, [templates]);

  const setDraftField = <K extends keyof LabelTemplate>(key: K, value: LabelTemplate[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const setElement = (id: string, patch: Partial<LabelTemplateElement>) => {
    setDraft((current) => ({
      ...current,
      elements: (current.elements ?? []).map((element) => element.id === id ? { ...element, ...patch } : element),
    }));
  };

  const deleteElement = (id: string) => {
    setDraft((current) => ({ ...current, elements: (current.elements ?? []).filter((element) => element.id !== id) }));
    setActiveElementId(null);
  };

  const nudgeElement = React.useCallback((id: string, dx: number, dy: number) => {
    setDraft((current) => {
      const element = (current.elements ?? []).find((item) => item.id === id);
      if (!element) return current;
      return {
        ...current,
        elements: (current.elements ?? []).map((item) => item.id === id ? {
          ...item,
          x: Math.max(0, Math.min(100 - item.w, +(item.x + dx).toFixed(2))),
          y: Math.max(0, Math.min(100 - item.h, +(item.y + dy).toFixed(2))),
        } : item),
      };
    });
  }, []);

  const deleteTemplate = () => {
    if (selectedId === "new") {
      setDraft(blankTemplate());
      setActiveElementId(null);
      return;
    }
    onSave((current) => current.filter((item) => item.id !== selectedId));
    const remaining = templates.filter((item) => item.id !== selectedId);
    const next = remaining[0];
    setSelectedId(next?.id ?? "new");
    setDraft(next ?? blankTemplate());
    setActiveElementId(null);
    toast("Tipo de etiqueta removido do tenant.", "ok");
  };

  const deleteTemplateById = (id: string) => {
    onSave((current) => current.filter((item) => item.id !== id));
    if (selectedId !== id) return;
    const remaining = templates.filter((item) => item.id !== id);
    const next = remaining[0];
    setSelectedId(next?.id ?? "new");
    setDraft(next ?? blankTemplate());
    setActiveElementId(null);
    toast("Tipo de etiqueta removido do tenant.", "ok");
  };

  const addElement = (type: LabelTemplateElement["type"], value: string, x = 12, y = 12) => {
    const element: LabelTemplateElement = {
      id: `el-${Date.now()}`,
      type,
      value,
      x,
      y,
      w: type === "field" && value === "barcode" ? 64 : type === "icon" ? 14 : 54,
      h: type === "icon" ? 14 : 12,
      fontSize: type === "icon" ? 18 : 12,
      fontWeight: "600",
      align: type === "icon" ? "center" : "left",
    };
    if (type === "field" && value === "barcode") {
      element.w = 68;
      element.h = 18;
    }
    setDraft((current) => ({ ...current, elements: [...(current.elements ?? []), element] }));
    setActiveElementId(element.id);
  };

  const dragPayload = (payload: unknown) => (event: React.DragEvent) => {
    event.dataTransfer.setData("application/json", JSON.stringify(payload));
  };

  const dropOnCanvas = (event: React.DragEvent) => {
    event.preventDefault();
    const raw = event.dataTransfer.getData("application/json");
    if (!raw || !canvasRef.current) return;
    const payload = JSON.parse(raw) as { action: "add" | "move"; type?: LabelTemplateElement["type"]; value?: string; id?: string };
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(95, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(95, ((event.clientY - rect.top) / rect.height) * 100));
    if (payload.action === "move" && payload.id) {
      setElement(payload.id, { x, y });
      setActiveElementId(payload.id);
      return;
    }
    if (payload.action === "add" && payload.type && payload.value) addElement(payload.type, payload.value, x, y);
  };

  const startElementDrag = (event: React.PointerEvent, element: LabelTemplateElement) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const pointerX = ((event.clientX - rect.left) / rect.width) * 100;
    const pointerY = ((event.clientY - rect.top) / rect.height) * 100;
    dragRef.current = {
      id: element.id,
      offsetX: pointerX - element.x,
      offsetY: pointerY - element.y,
    };
    setActiveElementId(element.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const moveElementDrag = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const element = (draft.elements ?? []).find((item) => item.id === drag.id);
    if (!element) return;
    const x = ((event.clientX - rect.left) / rect.width) * 100 - drag.offsetX;
    const y = ((event.clientY - rect.top) / rect.height) * 100 - drag.offsetY;
    setElement(drag.id, {
      x: Math.max(0, Math.min(100 - element.w, +x.toFixed(2))),
      y: Math.max(0, Math.min(100 - element.h, +y.toFixed(2))),
    });
  };

  const endElementDrag = (event: React.PointerEvent) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  };

  const zoomWithWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    const direction = event.deltaY > 0 ? -1 : 1;
    const step = event.ctrlKey || event.metaKey ? 1.5 : event.shiftKey ? 0.75 : 0.35;
    setZoom((current) => Math.max(EDITOR_MIN_ZOOM, Math.min(EDITOR_MAX_ZOOM, +(current + direction * step).toFixed(2))));
  };

  const active = (draft.elements ?? []).find((element) => element.id === activeElementId) ?? null;
  const paperWidth = Math.max(40, draft.w * EDITOR_PX_PER_MM);
  const paperHeight = Math.max(40, draft.h * EDITOR_PX_PER_MM);

  React.useEffect(() => {
    if (!activeElementId) return;
    const handler = (event: KeyboardEvent) => {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Delete", "Backspace"].includes(event.key)) return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      event.preventDefault();
      const step = event.shiftKey ? 2 : 0.5;
      if (event.key === "ArrowUp") nudgeElement(activeElementId, 0, -step);
      if (event.key === "ArrowDown") nudgeElement(activeElementId, 0, step);
      if (event.key === "ArrowLeft") nudgeElement(activeElementId, -step, 0);
      if (event.key === "ArrowRight") nudgeElement(activeElementId, step, 0);
      if (event.key === "Delete" || event.key === "Backspace") deleteElement(activeElementId);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeElementId, draft.elements, nudgeElement]);

  const save = () => {
    const fields = Array.from(new Set((draft.elements ?? [])
      .filter((element) => element.type === "field")
      .map((element) => element.value as LabelField)));
    const next = createLabelTemplate({ ...draft, fields });
    onSave((current) => current.some((item) => item.id === next.id)
      ? current.map((item) => item.id === next.id ? next : item)
      : [next, ...current]);
    setSelectedId(next.id);
    setDraft(next);
    toast("Tipo de etiqueta salvo no tenant.", "ok");
  };

  const selectTemplate = (id: string) => {
    if (id === "new") {
      setSelectedId("new");
      setDraft(blankTemplate());
      setActiveElementId(null);
      return;
    }
    const template = templates.find((item) => item.id === id);
    if (template) {
      setSelectedId(template.id);
      setDraft(template);
      setActiveElementId(null);
    }
  };

  return (
    <div className={cn("label-editor-wrap", fullscreen && "label-editor-wrap--fullscreen")}>
      <div className="label-editor-topbar">
        <div>
          <h1 className="page-h1">Editor de tipos de etiqueta</h1>
          <p className="page-lede">Crie layouts por tenant com canvas, variaveis, texto e icones.</p>
        </div>
        <div className="row-wrap">
          {onBack && <Button variant="outline" icon="arrowLeft" onClick={onBack}>Voltar</Button>}
          <Button variant="default" icon="check" onClick={save}>Salvar tipo</Button>
        </div>
      </div>

      <div className="label-editor-shell">
        <aside className="label-editor-sidebar">
          <Button variant="outline" icon="plus" style={{ width: "100%", marginBottom: 10 }} onClick={() => selectTemplate("new")}>Novo tipo</Button>
          <div className="block-label" style={{ marginBottom: 8 }}>Tipos do tenant</div>
          <div className="grid" style={{ gap: 6 }}>
            {templates.map((template) => (
              <div key={template.id} className={cn("lab-tpl label-type-row", selectedId === template.id && "lab-tpl--on")}>
                <button type="button" className="label-type-main" onClick={() => selectTemplate(template.id)}>
                  <div className="chip chip--neutral"><Icon name={template.icon} size={15} /></div>
                  <div style={{ minWidth: 0, textAlign: "left" }}>
                    <div style={{ fontWeight: 650, fontSize: 13 }}>{template.name}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{template.w}x{template.h}mm</div>
                  </div>
                </button>
                <button type="button" className="wf-handle-btn" title="Excluir tipo" onClick={() => deleteTemplateById(template.id)}>
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="block-label" style={{ margin: "18px 0 8px" }}>Arrastar para o canvas</div>
          <div className="label-editor-palette">
            <button className="lab-field-toggle" draggable onDragStart={dragPayload({ action: "add", type: "text", value: "Texto livre" })}>Texto livre</button>
            <button className="lab-field-toggle" draggable onDragStart={dragPayload({ action: "add", type: "field", value: "barcode" })}>Codigo de barras</button>
            <div className="label-editor-palette-title">Variaveis</div>
            {(Object.keys(FIELD_LABELS) as LabelField[]).map((field) => (
              <button key={field} className="lab-field-toggle" draggable onDragStart={dragPayload({ action: "add", type: "field", value: field })}>{FIELD_LABELS[field]}</button>
            ))}
            <div className="label-editor-palette-title">Icones</div>
            <div className="label-editor-icons">
              {LABEL_ICON_OPTIONS.map((icon) => (
                <button key={icon} className="wf-handle-btn" draggable title={icon} onDragStart={dragPayload({ action: "add", type: "icon", value: icon })}><Icon name={icon} size={15} /></button>
              ))}
            </div>
          </div>
        </aside>

        <main className="label-editor-main">
          <div className="label-editor-canvasbar">
            <div className="block-label">Canvas</div>
            <div className="row" style={{ gap: 8 }}>
              <Button variant="ghost" size="sm" icon="minus" onClick={() => setZoom((current) => Math.max(EDITOR_MIN_ZOOM, +(current - 1).toFixed(1)))}>Zoom</Button>
              <span className="badge badge--outline">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="sm" icon="plus" onClick={() => setZoom((current) => Math.min(EDITOR_MAX_ZOOM, +(current + 1).toFixed(1)))}>Zoom</Button>
            </div>
          </div>

          <div className="lab-stage label-editor-stage" onWheel={zoomWithWheel}>
            <div className="lab-stage-grid" />
            <div className="label-editor-stage-center">
              <div className="label-editor-paper-frame" style={{ width: paperWidth * zoom, height: paperHeight * zoom }}>
                <div className="label-editor-paper-zoom" style={{ width: paperWidth, height: paperHeight, transform: `scale(${zoom})` }}>
                  <div
                    ref={canvasRef}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={dropOnCanvas}
                    className="lab-paper"
                    style={{ width: paperWidth, height: paperHeight }}
                  >
                    <div className="lab-paper-pad label-editor-paper-pad" style={{ padding: "6%" }}>
                      {(draft.elements ?? []).map((element) => (
                        <LabelEditorElement
                          key={element.id}
                          element={element}
                          draft={draft}
                          active={activeElementId === element.id}
                          onSelect={() => setActiveElementId(element.id)}
                          onPointerDown={(event) => startElementDrag(event, element)}
                          onPointerMove={moveElementDrag}
                          onPointerUp={endElementDrag}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <aside className="label-editor-inspector">
          <Card>
            <button type="button" className="label-editor-section-head" onClick={() => setDetailsOpen((current) => !current)}>
              <CardTitle>Detalhes da etiqueta</CardTitle>
              <Icon name={detailsOpen ? "chevronUp" : "chevronDown"} size={16} />
            </button>
            {detailsOpen && (
              <CardContent style={{ paddingTop: 8 }}>
                <Field label="Nome"><Input value={draft.name} onChange={(event) => setDraftField("name", event.target.value)} /></Field>
                <Field label="Entidade">
                  <Select value={draft.target} onChange={(value) => setDraftField("target", value as LabelTarget)} options={LABEL_TARGET_OPTIONS} />
                </Field>
                <div className="ff-grid">
                  <Field label="Largura mm"><Input inputMode="decimal" value={String(draft.w)} onChange={(event) => setDraftField("w", Number(event.target.value.replace(",", ".")) || 60)} /></Field>
                  <Field label="Altura mm"><Input inputMode="decimal" value={String(draft.h)} onChange={(event) => setDraftField("h", Number(event.target.value.replace(",", ".")) || 60)} /></Field>
                </div>
                <Field label="Icone"><Input value={draft.icon} onChange={(event) => setDraftField("icon", event.target.value)} /></Field>
                <Field label="Descricao"><Input value={draft.desc} onChange={(event) => setDraftField("desc", event.target.value)} /></Field>
                <Button variant="outline" icon="trash" style={{ width: "100%" }} onClick={deleteTemplate}>Excluir tipo</Button>
              </CardContent>
            )}
          </Card>

          <Card>
            <button type="button" className="label-editor-section-head" onClick={() => setElementOpen((current) => !current)}>
              <CardTitle>Elemento</CardTitle>
              <Icon name={elementOpen ? "chevronUp" : "chevronDown"} size={16} />
            </button>
            {elementOpen && (
              <CardContent style={{ paddingTop: 8 }}>
                {!active ? <Empty icon="mousePointer" title="Selecione um bloco" hint="Clique em um elemento no canvas." /> : (
                  <div className="grid" style={{ gap: 8 }}>
                    {active.type === "text" ? (
                      <Field label="Texto livre">
                        <Textarea rows={5} value={active.value} onChange={(event) => setElement(active.id, { value: event.target.value })} />
                      </Field>
                    ) : active.type === "field" ? (
                      <Field label="Variavel">
                        <Select value={active.value} onChange={(value) => setElement(active.id, { value })} options={(Object.keys(FIELD_LABELS) as LabelField[]).map((field) => ({ value: field, label: FIELD_LABELS[field] }))} />
                      </Field>
                    ) : (
                      <Field label="Icone">
                        <Select value={active.value} onChange={(value) => setElement(active.id, { value })} options={LABEL_ICON_OPTIONS.map((icon) => ({ value: icon, label: icon }))} />
                      </Field>
                    )}

                    <div className="label-nudge">
                      <Button variant="ghost" size="icon" icon="chevronUp" onClick={() => nudgeElement(active.id, 0, -0.5)} />
                      <div className="row" style={{ gap: 6, justifyContent: "center" }}>
                        <Button variant="ghost" size="icon" icon="chevronLeft" onClick={() => nudgeElement(active.id, -0.5, 0)} />
                        <Button variant="ghost" size="icon" icon="chevronRight" onClick={() => nudgeElement(active.id, 0.5, 0)} />
                      </div>
                      <Button variant="ghost" size="icon" icon="chevronDown" onClick={() => nudgeElement(active.id, 0, 0.5)} />
                    </div>

                    <div className="ff-grid">
                      <Field label="X %"><Input value={String(active.x)} onChange={(event) => setElement(active.id, { x: Number(event.target.value.replace(",", ".")) || 0 })} /></Field>
                      <Field label="Y %"><Input value={String(active.y)} onChange={(event) => setElement(active.id, { y: Number(event.target.value.replace(",", ".")) || 0 })} /></Field>
                    </div>
                    <div className="ff-grid">
                      <Field label="L %"><Input value={String(active.w)} onChange={(event) => setElement(active.id, { w: Number(event.target.value.replace(",", ".")) || 10 })} /></Field>
                      <Field label="A %"><Input value={String(active.h)} onChange={(event) => setElement(active.id, { h: Number(event.target.value.replace(",", ".")) || 10 })} /></Field>
                    </div>
                    <Field label="Fonte"><Stepper value={active.fontSize} min={6} max={48} onChange={(value) => setElement(active.id, { fontSize: value })} /></Field>
                    <Field label="Alinhamento">
                      <Select value={active.align ?? "left"} onChange={(value) => setElement(active.id, { align: value as LabelTemplateElement["align"] })} options={[{ value: "left", label: "Esquerda" }, { value: "center", label: "Centro" }, { value: "right", label: "Direita" }]} />
                    </Field>
                    <Button variant="outline" icon="trash" onClick={() => deleteElement(active.id)}>Excluir elemento</Button>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

export function LabelTemplateEditorModal({
  open,
  onClose,
  templates,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  templates: LabelTemplate[];
  onSave: React.Dispatch<React.SetStateAction<LabelTemplate[]>>;
}) {
  return (
    <Modal open={open} onClose={onClose} icon="palette" title="Tipos de etiqueta" subtitle="Layouts por tenant com texto, variaveis e icones" width={1280}>
      <LabelTemplateEditorWorkspace templates={templates} onSave={onSave} />
    </Modal>
  );
}

export function LabelTemplateEditorScreen({ go }: { go: Go; route: Route }) {
  const [templates, setTemplates] = useLabelTemplates();
  return (
    <LabelTemplateEditorWorkspace
      templates={templates}
      onSave={setTemplates}
      onBack={() => go("configuracoes", { tab: "labels" })}
      fullscreen
    />
  );
}

function assignmentFor(queue: QueueItem[], skip: number[], perSheet: number) {
  const flat: PrintSpec[] = [];
  queue.forEach((item) => {
    for (let index = 0; index < item.copies; index += 1) {
      flat.push({
        template: item.template,
        entity: item.entity,
        fields: item.fields,
        overrides: item.overrides,
        layout: item.layout,
        barcodeType: item.barcodeType,
        qid: item.id,
      });
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
  const [templates, setTemplates] = useLabelTemplates();
  const [defaultBarcodeType] = useBarcodeType();
  const dir = useItemDirectory();
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [production, setProduction] = React.useState<ProductionOrder[]>([]);
  const [locations, setLocations] = React.useState<LabelLocation[]>([]);
  const sources = React.useMemo<EntitySources>(
    () => ({ orders, items: dir.items, production, locations }),
    [orders, dir.items, production, locations],
  );
  const [sheetId, setSheetId] = React.useState(sheets[0]?.id ?? "");
  const [queue, setQueue] = React.useState<QueueItem[]>([]);
  const [skip, setSkip] = React.useState<number[]>([]);
  const [printed, setPrinted] = React.useState<{ count: number; pages: number; sheet: string } | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingSheet, setEditingSheet] = React.useState<LabelSheet | null>(null);
  const [adjustOpen, setAdjustOpen] = React.useState(false);
  const [previewId, setPreviewId] = React.useState<string | null>(null);

  const sheet = sheets.find((item) => item.id === sheetId) ?? sheets[0];
  const perSheet = Math.max(1, (sheet?.cols ?? 1) * (sheet?.rows ?? 1));
  const skipCount = skip.filter((index) => index < perSheet).length;
  const { totalLabels, pages, assignment, cellQid, cellNum } = React.useMemo(
    () => assignmentFor(queue, skip, perSheet),
    [queue, skip, perSheet],
  );
  const freeTotal = pages * perSheet - skipCount - totalLabels;
  const selectedQueueItem = queue.find((item) => item.id === previewId) ?? null;

  React.useEffect(() => {
    if (!sheet && sheets[0]) setSheetId(sheets[0].id);
  }, [sheet, sheets]);

  React.useEffect(() => {
    let alive = true;
    loadOrders().then((next) => { if (alive) setOrders(next); }).catch(() => null);
    loadProduction().then((next) => { if (alive) setProduction(next); }).catch(() => null);
    fetchInventory()
      .then((res) => {
        if (alive) setLocations(res.locations.map((loc) => ({ code: loc.code, name: loc.name, type: loc.type })));
      })
      .catch(() => null);
    return () => { alive = false; };
  }, []);

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

  const updateQueueItem = (id: string, patch: Partial<QueueItem>) => {
    setQueue((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
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

  const openNewSheet = () => {
    setEditingSheet(null);
    setSheetOpen(true);
  };

  const openEditSheet = () => {
    setEditingSheet(sheet);
    setSheetOpen(true);
  };

  const saveSheet = (nextSheet: LabelSheet) => {
    setSheets((current) => {
      const exists = current.some((item) => item.id === nextSheet.id);
      return exists
        ? current.map((item) => item.id === nextSheet.id ? nextSheet : item)
        : [nextSheet, ...current];
    });
    setSheetId(nextSheet.id);
    toast(editingSheet ? "Modelo de etiqueta atualizado." : "Modelo de etiqueta criado para o tenant.", "ok");
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

  const printPageSizeCss = `
    @page { size: ${sheet.pageW}mm ${sheet.pageH}mm; margin: 0; }
    @media print {
      body[data-print-mode="labels"] .label-print-doc {
        width: ${sheet.pageW}mm;
      }
    }
  `;

  return (
    <div className="page page--wide lab-page fade-in">
      <style media="print">{printPageSizeCss}</style>
      <div className="page-head">
        <div>
          <h1 className="page-h1">Etiquetas</h1>
          <p className="page-lede">Monte a fila e imprima apenas as etiquetas no modelo de folha escolhido.</p>
        </div>
        <div className="row-wrap">
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
        <Button variant="ghost" icon="plus" onClick={openNewSheet}>Novo modelo</Button>
        <Button variant="ghost" icon="settings" onClick={openEditSheet}>Editar modelo</Button>
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
                        <button className="wf-handle-btn" title="Ajustar etiqueta" onClick={() => { setPreviewId(item.id); setAdjustOpen(true); }}><Icon name="sliders" size={15} /></button>
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
            <CardHeader><CardTitle>Modelo</CardTitle><span className="muted" style={{ fontSize: 12 }}>{sheet.name} - {sheet.roll ? "rolo" : `${sheet.cols}x${sheet.rows}`}{sheet.shape === "circle" ? " - circular" : ""}</span></CardHeader>
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
                      style={{ borderRadius: sheet.shape === "circle" ? "999px" : undefined }}
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

      <AddLabelModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={addToQueue} defaultBarcodeType={defaultBarcodeType} sources={sources} templates={templates} />
      <Modal
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        icon="sliders"
        title="Ajustar etiqueta"
        subtitle="Ajustes valem somente para esta linha da fila"
        width={760}
      >
        <AdvancedLabelPanel
          item={selectedQueueItem}
          sheet={sheet}
          onChange={(patch) => selectedQueueItem && updateQueueItem(selectedQueueItem.id, patch)}
        />
      </Modal>
      <LabelSheetModelModal
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        initialSheet={editingSheet}
        onSave={saveSheet}
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
                    borderRadius: sheet.shape === "circle" ? "999px" : undefined,
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
