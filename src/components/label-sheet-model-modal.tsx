"use client";

import * as React from "react";
import { Button, Field, Input, Modal } from "@/components/ui";
import { createLabelSheet, type LabelSheet, type LabelSheetInput } from "@/lib/label-sheets";

type FormState = Record<keyof LabelSheetInput, string> & { roll: string };

function defaultForm(): FormState {
  return {
    name: "Folha A4 personalizada",
    brand: "Personalizado",
    code: "A4-CUSTOM",
    pageW: "210",
    pageH: "297",
    cols: "3",
    rows: "8",
    labelW: "63.5",
    labelH: "33.9",
    mTop: "9",
    mLeft: "7",
    gutX: "2.5",
    gutY: "0",
    roll: "",
    shape: "rect",
  };
}

function formFromSheet(sheet: LabelSheet): FormState {
  return {
    name: sheet.name,
    brand: sheet.brand ?? "Personalizado",
    code: sheet.code,
    pageW: String(sheet.pageW),
    pageH: String(sheet.pageH),
    cols: String(sheet.cols),
    rows: String(sheet.rows),
    labelW: String(sheet.labelW),
    labelH: String(sheet.labelH),
    mTop: String(sheet.mTop),
    mLeft: String(sheet.mLeft),
    gutX: String(sheet.gutX),
    gutY: String(sheet.gutY),
    roll: sheet.roll ? "true" : "",
    shape: sheet.shape === "circle" ? "circle" : "rect",
  };
}

function circleRollForm(): FormState {
  return {
    name: "Rolo circular 60x60",
    brand: "Termica",
    code: "ROLO-CIRC-60",
    pageW: "60",
    pageH: "60",
    cols: "1",
    rows: "1",
    labelW: "60",
    labelH: "60",
    mTop: "0",
    mLeft: "0",
    gutX: "0",
    gutY: "0",
    roll: "true",
    shape: "circle",
  };
}

function parsePositive(value: string, fallback = 0) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegative(value: string, fallback = 0) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function formToInput(form: FormState): LabelSheetInput {
  return {
    name: form.name,
    brand: form.brand,
    code: form.code,
    pageW: parsePositive(form.pageW, 210),
    pageH: parsePositive(form.pageH, 297),
    cols: Math.max(1, Math.round(parsePositive(form.cols, 1))),
    rows: Math.max(1, Math.round(parsePositive(form.rows, 1))),
    labelW: parsePositive(form.labelW, 50),
    labelH: parsePositive(form.labelH, 30),
    mTop: parseNonNegative(form.mTop, 0),
    mLeft: parseNonNegative(form.mLeft, 0),
    gutX: parseNonNegative(form.gutX, 0),
    gutY: parseNonNegative(form.gutY, 0),
    roll: form.roll === "true",
    shape: form.shape === "circle" ? "circle" : "rect",
  };
}

export function LabelSheetModelModal({
  open,
  onClose,
  onSave,
  initialSheet,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (sheet: LabelSheet) => void;
  initialSheet?: LabelSheet | null;
}) {
  const [form, setForm] = React.useState<FormState>(() => defaultForm());
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setForm(initialSheet ? formFromSheet(initialSheet) : defaultForm());
    setError(null);
  }, [initialSheet, open]);

  const setField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
  };

  const submit = () => {
    const input = formToInput(form);
    if (!input.name.trim()) {
      setError("Informe o nome do modelo.");
      return;
    }
    if (!input.code.trim()) {
      setError("Informe o codigo do modelo.");
      return;
    }
    if (input.cols * input.rows > 200) {
      setError("O modelo tem posicoes demais para uma folha.");
      return;
    }

    onSave(initialSheet ? { ...createLabelSheet(input), id: initialSheet.id } : createLabelSheet(input));
    onClose();
  };

  const input = formToInput(form);
  const previewCount = Math.min(input.cols * input.rows, 40);

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon="tag"
      title={initialSheet ? "Editar modelo de etiqueta" : "Novo modelo de etiqueta"}
      subtitle="Defina as medidas em milimetros"
      width={760}
      footer={(
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <div className="spacer" style={{ flex: 1 }} />
          <Button variant="default" icon="check" onClick={submit}>Salvar modelo</Button>
        </>
      )}
    >
      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) 220px", gap: 18, alignItems: "start" }}>
        <div>
          {!initialSheet && (
            <div style={{ marginBottom: 12 }}>
              <Button variant="outline" size="sm" icon="tag" onClick={() => setForm(circleRollForm())}>Usar preset rolo circular 60x60</Button>
            </div>
          )}
          <div className="ff-grid">
            <Field label="Nome" required><Input value={form.name} onChange={(event) => setField("name", event.target.value)} /></Field>
            <Field label="Marca"><Input value={form.brand} onChange={(event) => setField("brand", event.target.value)} /></Field>
          </div>
          <div className="ff-grid">
            <Field label="Codigo" required><Input value={form.code} onChange={(event) => setField("code", event.target.value.toUpperCase())} /></Field>
            <Field label="Rolo continuo">
              <label className="row" style={{ gap: 8, height: 36 }}>
                <input type="checkbox" checked={form.roll === "true"} onChange={(event) => setField("roll", event.target.checked ? "true" : "")} />
                <span className="muted" style={{ fontSize: 12.5 }}>Usar como rolo</span>
              </label>
            </Field>
          </div>
          <div className="ff-grid">
            <Field label="Formato">
              <label className="row" style={{ gap: 8, height: 36 }}>
                <input type="checkbox" checked={form.shape === "circle"} onChange={(event) => setField("shape", event.target.checked ? "circle" : "rect")} />
                <span className="muted" style={{ fontSize: 12.5 }}>Etiqueta circular</span>
              </label>
            </Field>
            <div />
          </div>
          <div className="ff-grid-3">
            <Field label="Largura folha"><Input inputMode="decimal" value={form.pageW} onChange={(event) => setField("pageW", event.target.value)} /></Field>
            <Field label="Altura folha"><Input inputMode="decimal" value={form.pageH} onChange={(event) => setField("pageH", event.target.value)} /></Field>
            <Field label="Colunas"><Input inputMode="numeric" value={form.cols} onChange={(event) => setField("cols", event.target.value.replace(/\D/g, ""))} /></Field>
          </div>
          <div className="ff-grid-3">
            <Field label="Linhas"><Input inputMode="numeric" value={form.rows} onChange={(event) => setField("rows", event.target.value.replace(/\D/g, ""))} /></Field>
            <Field label="Etiqueta L"><Input inputMode="decimal" value={form.labelW} onChange={(event) => setField("labelW", event.target.value)} /></Field>
            <Field label="Etiqueta A"><Input inputMode="decimal" value={form.labelH} onChange={(event) => setField("labelH", event.target.value)} /></Field>
          </div>
          <div className="ff-grid">
            <Field label="Margem superior"><Input inputMode="decimal" value={form.mTop} onChange={(event) => setField("mTop", event.target.value)} /></Field>
            <Field label="Margem esquerda"><Input inputMode="decimal" value={form.mLeft} onChange={(event) => setField("mLeft", event.target.value)} /></Field>
          </div>
          <div className="ff-grid">
            <Field label="Espaco horizontal"><Input inputMode="decimal" value={form.gutX} onChange={(event) => setField("gutX", event.target.value)} /></Field>
            <Field label="Espaco vertical"><Input inputMode="decimal" value={form.gutY} onChange={(event) => setField("gutY", event.target.value)} /></Field>
          </div>
          {error && <div className="ff-error">{error}</div>}
        </div>

        <div>
          <div className="block-label">Previa</div>
          <div className="sheet-mini" style={{ gridTemplateColumns: `repeat(${Math.min(input.cols, 6)}, 1fr)`, width: 170, height: 230 }}>
            {Array.from({ length: previewCount }).map((_, index) => <span key={index} className="sheet-mini-cell" style={{ borderRadius: input.shape === "circle" ? "999px" : undefined }} />)}
          </div>
          <div className="section-hint">
            {input.cols}x{input.rows} - {input.labelW}x{input.labelH}mm {input.shape === "circle" ? "- circular" : ""}
          </div>
        </div>
      </div>
    </Modal>
  );
}
