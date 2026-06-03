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
  toast,
} from "@/components/ui";
import {
  DEMO_ITEMS,
  DEMO_ORDERS,
  DEMO_PRODUCTION,
  LABEL_SHEETS,
  LABEL_TEMPLATES,
  type DemoLabelSheet,
} from "@/lib/screen-fixtures";
import type { Go, Route } from "@/lib/types";

type LabelTemplate = (typeof LABEL_TEMPLATES)[number];
type LabelEntity = { id: string; label: string; sub: string; code: string };
type QueueItem = {
  id: string;
  template: LabelTemplate;
  entity: LabelEntity;
  copies: number;
};

function entityOptions(target: LabelTemplate["target"]): LabelEntity[] {
  if (target === "pedido") {
    return DEMO_ORDERS.map((order) => ({ id: order.id, label: order.num, sub: order.customerName, code: order.code }));
  }
  if (target === "op") {
    return DEMO_PRODUCTION.map((order) => ({ id: order.id, label: order.num, sub: order.productName, code: order.code }));
  }
  return DEMO_ITEMS.map((item) => ({ id: item.sku, label: `${item.name} ${item.variant}`, sub: item.sku, code: item.code }));
}

function MiniBarcode({ code }: { code: string }) {
  return (
    <div className="lab-barcode-mini" aria-hidden="true">
      {code.split("").slice(0, 18).map((char, index) => (
        <span key={`${char}-${index}`} style={{ width: 1 + (Number(char) % 3 || 1) }} />
      ))}
    </div>
  );
}

function AddLabelModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (item: QueueItem) => void }) {
  const idPrefix = React.useId();
  const nextId = React.useRef(0);
  const [templateId, setTemplateId] = React.useState<LabelTemplate["id"]>("item");
  const template = LABEL_TEMPLATES.find((item) => item.id === templateId) ?? LABEL_TEMPLATES[0];
  const options = entityOptions(template.target);
  const [entityId, setEntityId] = React.useState(options[0]?.id ?? "");
  const [copies, setCopies] = React.useState(6);

  React.useEffect(() => {
    const first = entityOptions(template.target)[0];
    setEntityId(first?.id ?? "");
  }, [template.target]);

  const entity = options.find((item) => item.id === entityId) ?? options[0];
  const submit = () => {
    if (!entity) return;
    onAdd({ id: `${idPrefix}-${nextId.current++}`, template, entity, copies });
    toast(`${copies} etiqueta(s) adicionadas a fila.`, "info");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} icon="tag" title="Adicionar etiqueta" subtitle="Escolha tipo, registro e quantidade" width={680}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><div className="spacer" style={{ flex: 1 }} /><Button variant="default" icon="plus" onClick={submit}>Adicionar</Button></>}>
      <div className="grid cols-2" style={{ gap: 18 }}>
        <div>
          <Field label="Tipo">
            <Select value={templateId} onChange={(value) => setTemplateId(value as LabelTemplate["id"])} options={LABEL_TEMPLATES.map((item) => ({ value: item.id, label: `${item.name} - ${item.size}` }))} />
          </Field>
          <Field label="Registro">
            <Select value={entityId} onChange={setEntityId} options={options.map((item) => ({ value: item.id, label: `${item.label} - ${item.sub}` }))} />
          </Field>
          <Field label="Quantidade">
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <Stepper value={copies} onChange={(value) => setCopies(Math.max(1, Math.round(value)))} min={1} />
              {[6, 12, 24].map((value) => <Button key={value} variant="ghost" size="sm" onClick={() => setCopies(value)}>{value}x</Button>)}
            </div>
          </Field>
        </div>
        <div>
          <div className="block-label">Pre-visualizacao</div>
          {entity && (
            <div className="label-preview">
              <div className="label-preview-title">{entity.label}</div>
              <div className="label-preview-sub">{entity.sub}</div>
              <div style={{ flex: 1 }} />
              <MiniBarcode code={entity.code} />
              <div className="label-preview-code">{entity.code}</div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function SheetPreview({ sheet, queue }: { sheet: DemoLabelSheet; queue: QueueItem[] }) {
  const total = queue.reduce((sum, item) => sum + item.copies, 0);
  const slots = sheet.cols * sheet.rows;
  return (
    <div className="lab-fill lab-fill--big" style={{ gridTemplateColumns: `repeat(${Math.min(sheet.cols, 8)}, 1fr)` }}>
      {Array.from({ length: Math.min(slots, 48) }).map((_, index) => (
        <div key={index} className={`lab-fill-cell ${index < total ? "lab-fill-cell--on" : "lab-fill-cell--free"}`}>
          {index < total ? index + 1 : null}
        </div>
      ))}
    </div>
  );
}

export function LabelsScreen({ go }: { go: Go; route: Route }) {
  const [sheetId, setSheetId] = React.useState(LABEL_SHEETS[0].id);
  const [queue, setQueue] = React.useState<QueueItem[]>([]);
  const [addOpen, setAddOpen] = React.useState(false);
  const [lastPrinted, setLastPrinted] = React.useState<string | null>(null);
  const sheet = LABEL_SHEETS.find((item) => item.id === sheetId) ?? LABEL_SHEETS[0];
  const totalLabels = queue.reduce((sum, item) => sum + item.copies, 0);
  const perSheet = sheet.cols * sheet.rows;
  const pages = Math.max(1, Math.ceil(totalLabels / perSheet));

  const print = () => {
    if (!queue.length) return;
    setLastPrinted(`${totalLabels} etiqueta(s) em ${pages} folha(s) de ${sheet.name}`);
    window.print();
  };

  return (
    <div className="page page--wide fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-h1">Etiquetas</h1>
          <p className="page-lede">Monte a fila de impressao e mande varias etiquetas na mesma folha.</p>
        </div>
        <div className="row-wrap">
          <Button variant="ghost" icon="sliders" onClick={() => go("configuracoes", { tab: "labels" })}>Modelos de folha</Button>
          <Button variant="outline" icon="fileText" onClick={print} disabled={!queue.length}>Gerar PDF</Button>
          <Button variant="default" icon="printer" onClick={print} disabled={!queue.length}>Imprimir{totalLabels ? ` ${totalLabels}x` : ""}</Button>
        </div>
      </div>

      <div className="toolbar">
        <div style={{ minWidth: 300 }}>
          <Select value={sheetId} onChange={setSheetId} options={LABEL_SHEETS.map((item) => ({ value: item.id, label: `${item.name} - ${item.roll ? "rolo" : `${item.cols}x${item.rows}`}` }))} />
        </div>
        <div className="spacer" />
        <Button variant="default" icon="plus" onClick={() => setAddOpen(true)}>Adicionar etiqueta</Button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1.5fr) minmax(280px, 0.8fr)" }}>
        <Card style={{ overflow: "hidden" }}>
          <CardHeader>
            <CardTitle>Fila de impressao</CardTitle>
            <div className="row" style={{ gap: 10 }}>
              <span className="muted" style={{ fontSize: 12.5 }}>{queue.length} item(ns) - {totalLabels} etiqueta(s) - {pages} folha(s)</span>
              {queue.length > 0 && <button className="notif-resolve" onClick={() => setQueue([])}>Limpar</button>}
            </div>
          </CardHeader>
          {queue.length === 0 ? (
            <Empty icon="tag" title="Fila vazia" hint="Clique em Adicionar etiqueta para montar a primeira." />
          ) : (
            <table className="om-table">
              <thead><tr><th>Etiqueta</th><th>Tipo</th><th>Tamanho</th><th className="om-td-right">Qtd</th><th /></tr></thead>
              <tbody>
                {queue.map((item) => (
                  <tr key={item.id}>
                    <td><div className="item-cell"><div className="lab-q-thumb"><Icon name={item.template.icon} size={15} /></div><div><div className="cell-title">{item.entity.label}</div><div className="cell-sub">{item.entity.code}</div></div></div></td>
                    <td><Badge tone="neutral">{item.template.name}</Badge></td>
                    <td className="muted mono" style={{ fontSize: 12 }}>{item.template.size}</td>
                    <td className="om-td-right">{item.copies}</td>
                    <td className="om-td-right"><button className="wf-handle-btn" onClick={() => setQueue((current) => current.filter((row) => row.id !== item.id))}><Icon name="x" size={15} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {lastPrinted && <div style={{ margin: "0 16px 16px", background: "hsl(var(--ok-bg))", color: "hsl(var(--ok))", padding: "9px 12px", borderRadius: 8, fontSize: 12.5, display: "flex", gap: 8 }}><Icon name="check" size={15} /> {lastPrinted}</div>}
        </Card>

        <Card>
          <CardHeader><CardTitle>Folha</CardTitle><span className="muted" style={{ fontSize: 12 }}>{sheet.name}</span></CardHeader>
          <CardContent style={{ paddingTop: 8 }}>
            <SheetPreview sheet={sheet} queue={queue} />
            <div className="row between" style={{ marginTop: 12 }}>
              <span className="muted" style={{ fontSize: 12 }}>{totalLabels ? `${Math.max(0, pages * perSheet - totalLabels)} posicoes livres` : `${perSheet} posicoes`}</span>
              <Badge tone="outline">{sheet.labelW}x{sheet.labelH}mm</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <AddLabelModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={(item) => setQueue((current) => [...current, item])} />
    </div>
  );
}
