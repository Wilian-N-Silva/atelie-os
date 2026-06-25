"use client";

import * as React from "react";
import { Badge, Button, Card, Empty, Field, Icon, Input, Modal, Textarea, cn, toast } from "@/components/ui";
import { QC_CHECKLIST, emptyQcChecklist, qualityRequiresNote, type QcChecklistItem, type QualityDecision } from "@/lib/quality";
import { loadQualityLots, submitQualityReview, type QualityLot } from "@/lib/quality-client";
import type { Route } from "@/lib/types";

const DECISION_LABEL: Record<QualityDecision, string> = {
  approve: "Aprovar e liberar",
  approve_note: "Aprovar com observacao",
  partial: "Aprovar parcial",
  block: "Bloquear lote",
  loss: "Registrar perda",
};

function QualityModal({ lot, onClose, onReviewed }: {
  lot: QualityLot;
  onClose: () => void;
  onReviewed: (lots: QualityLot[]) => void;
}) {
  const [checklist, setChecklist] = React.useState<QcChecklistItem[]>(() => emptyQcChecklist());
  const [note, setNote] = React.useState("");
  const [lossQty, setLossQty] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const toggle = (key: string) => setChecklist((current) => current.map((item) => item.key === key ? { ...item, checked: !item.checked } : item));
  const allChecked = checklist.every((item) => item.checked);

  const submit = async (decision: QualityDecision) => {
    const parsedLossQty = Number(lossQty.replace(",", ".")) || 0;
    if (qualityRequiresNote(decision) && !note.trim()) {
      toast("Informe o motivo da revisao.", "bad");
      return;
    }
    if (decision === "partial" && (parsedLossQty <= 0 || parsedLossQty >= lot.planned)) {
      toast("Informe uma perda parcial maior que zero e menor que o lote.", "bad");
      return;
    }

    setSaving(true);
    try {
      const lots = await submitQualityReview({
        productionId: lot.id,
        decision,
        checklist,
        note: note.trim(),
        lossQty: decision === "loss" || decision === "partial" ? parsedLossQty : undefined,
      });
      onReviewed(lots);
      toast(
        decision === "approve" || decision === "approve_note"
          ? "Lote liberado para venda."
          : decision === "partial"
            ? "Lote liberado parcialmente."
            : decision === "block"
              ? "Lote bloqueado."
              : "Perda registrada.",
        "ok",
      );
      onClose();
    } catch {
      toast("Nao foi possivel concluir a revisao.", "bad");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      icon="listChecks"
      title={`Revisao de qualidade - ${lot.num}`}
      subtitle={`${lot.productName}${lot.lot ? ` - lote ${lot.lot}` : ""} - ${lot.planned} un`}
      width={720}
      footer={(
        <>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <div className="spacer" style={{ flex: 1 }} />
          <Button variant="outline" icon="x" disabled={saving} onClick={() => submit("block")}>Bloquear</Button>
          <Button variant="outline" icon="alert" disabled={saving} onClick={() => submit("loss")}>Perda total</Button>
          <Button variant="outline" icon="listChecks" disabled={saving} onClick={() => submit("partial")}>Aprovar parcial</Button>
          <Button variant="default" icon="check" disabled={saving} onClick={() => submit(note.trim() ? "approve_note" : "approve")}>Aprovar e liberar</Button>
        </>
      )}
    >
      <div className="block-label">Checklist de qualidade</div>
      <div style={{ marginBottom: 14 }}>
        {QC_CHECKLIST.map((meta) => {
          const item = checklist.find((current) => current.key === meta.key);
          const checked = item?.checked ?? false;
          return (
            <button key={meta.key} type="button" className={cn("op-item", checked && "op-item--done")} onClick={() => toggle(meta.key)} style={{ cursor: "pointer", width: "100%", color: "inherit", textAlign: "left", marginBottom: 6 }}>
              <div className="op-item-check">{checked && <Icon name="check" size={16} strokeWidth={3} />}</div>
              <div className="op-item-body"><div className="op-item-name" style={{ fontSize: 14 }}>{meta.label}</div></div>
            </button>
          );
        })}
      </div>
      {!allChecked && (
        <div className="rt-hint" style={{ marginBottom: 12 }}>
          <Icon name="alertCircle" size={15} /> Itens nao marcados pedem observacao, bloqueio, perda ou aprovacao parcial.
        </div>
      )}

      <Field label="Quantidade de perda (un) - perda total ou aprovacao parcial">
        <Input inputMode="decimal" value={lossQty} onChange={(event) => setLossQty(event.target.value)} placeholder={`ate ${lot.planned}`} />
      </Field>
      <Field label="Observacao" style={{ marginTop: 10 }}>
        <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Obrigatoria para aprovar com observacao, parcial, bloqueio ou perda..." />
      </Field>
    </Modal>
  );
}

export function QualityScreen(_props: { route: Route }) {
  const [lots, setLots] = React.useState<QualityLot[]>([]);
  const [openId, setOpenId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    loadQualityLots().then((next) => { if (alive) setLots(next); }).catch(() => null);
    return () => { alive = false; };
  }, []);

  const open = lots.find((lot) => lot.id === openId) ?? null;

  return (
    <div className="page page--wide fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-h1">Qualidade</h1>
          <p className="page-lede">{lots.length} lote(s) em cura ou aguardando revisao</p>
        </div>
      </div>

      <Card style={{ overflow: "hidden" }}>
        <table className="om-table">
          <thead>
            <tr><th>Lote / OP</th><th>Produto</th><th className="om-td-right">Qtd</th><th>Cura</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {lots.map((lot) => (
              <tr key={lot.id} className="om-row-click" onClick={() => setOpenId(lot.id)}>
                <td><div className="cell-title">{lot.lot ?? lot.num}</div><div className="cell-sub">{lot.num}</div></td>
                <td className="muted">{lot.productName}</td>
                <td className="om-td-right">{lot.planned}</td>
                <td>{lot.cureUntil ? <span className="muted">ate {lot.cureUntil}{lot.cureDayLeft != null ? ` - ${lot.cureDayLeft}d` : ""}</span> : <span className="muted">-</span>}</td>
                <td><Badge tone={lot.status === "aguardando_revisao" ? "warn" : "cure"} dot>{lot.status === "aguardando_revisao" ? "Revisar" : "Em cura"}</Badge></td>
                <td className="om-td-right"><Icon name="chevronRight" size={16} className="muted" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {lots.length === 0 && <Empty icon="listChecks" title="Nenhum lote para revisar" hint="Lotes aparecem aqui quando a producao entra em cura." />}
      </Card>

      {open && <QualityModal lot={open} onClose={() => setOpenId(null)} onReviewed={setLots} />}
    </div>
  );
}
