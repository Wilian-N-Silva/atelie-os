"use client";

import * as React from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Empty,
  Field,
  Icon,
  Input,
  Modal,
  Progress,
  Select,
  Sep,
  Stat,
  toast,
} from "@/components/ui";
import {
  BRL,
  DEMO_PRODUCTION,
  DEMO_RECIPES,
  PROD_STATUS,
  findDemoItem,
  type DemoProductionOrder,
  type DemoProductionStatus,
} from "@/lib/screen-fixtures";
import type { Go, Route } from "@/lib/types";

const PRODUCTION_COLUMNS: DemoProductionStatus[] = [
  "aguardando_materiais",
  "em_producao",
  "em_cura",
  "aguardando_revisao",
  "liberada",
  "finalizada",
];

function recipeFor(order: DemoProductionOrder) {
  return DEMO_RECIPES.find((recipe) => recipe.product === order.product);
}

function materialRows(order: DemoProductionOrder) {
  const recipe = recipeFor(order);
  if (!recipe) return [];
  return recipe.components.map((component) => {
    const item = findDemoItem(component.sku);
    const need = Number((component.qty * order.planned * (1 + component.loss / 100)).toFixed(3));
    return { ...component, need, available: item?.available ?? 0, short: (item?.available ?? 0) < need };
  });
}

function estimatedCost(order: DemoProductionOrder) {
  return materialRows(order).reduce((sum, row) => sum + row.need * (findDemoItem(row.sku)?.costAvg ?? 0), 0);
}

function ProductionDrawer({ order, go, onClose }: { order: DemoProductionOrder; go: Go; onClose: () => void }) {
  const status = PROD_STATUS[order.status];
  const recipe = recipeFor(order);
  const rows = materialRows(order);
  const anyShort = rows.some((row) => row.short);

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer-head">
          <div className={`chip chip--lg chip--${status.tone}`}><Icon name={status.icon} size={20} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="drawer-h1">{order.num} - {order.productName}</div>
            <div className="row" style={{ gap: 8, marginTop: 4 }}>
              <Badge tone={status.tone} dot>{status.label}</Badge>
              <span className="code-pill">{order.code}</span>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>

        <div className="drawer-body">
          <div className="grid cols-2" style={{ gap: 12, marginBottom: 18 }}>
            <Card><CardContent style={{ padding: 14 }}><Stat label="Planejado" value={`${order.planned} un`} /></CardContent></Card>
            <Card><CardContent style={{ padding: 14 }}><Stat label="Receita" value={recipe?.name ?? "-"} sub={order.recipeVer} /></CardContent></Card>
          </div>

          {order.status === "em_cura" && (
            <div style={{ background: "hsl(var(--cure-bg))", color: "hsl(var(--cure))", padding: "12px 14px", borderRadius: 10, marginBottom: 18 }}>
              <div className="row" style={{ gap: 8, fontWeight: 600, fontSize: 13 }}><Icon name="thermometer" size={16} /> Em cura - lote {order.lot}</div>
              <div style={{ fontSize: 12.5, marginTop: 4 }}>Liberacao prevista para {order.cureUntil} - faltam {order.cureDayLeft} dias</div>
            </div>
          )}

          {order.status === "aguardando_revisao" && (
            <div style={{ background: "hsl(var(--warn-bg))", color: "hsl(var(--warn))", padding: "12px 14px", borderRadius: 10, marginBottom: 18 }}>
              <div className="row" style={{ gap: 8, fontWeight: 600, fontSize: 13 }}><Icon name="listChecks" size={16} /> Cura concluida - pronta para revisao</div>
              <div style={{ fontSize: 12.5, marginTop: 4 }}>Confira aparencia, aroma e acabamento antes de liberar o lote {order.lot}.</div>
            </div>
          )}

          <div className="block-label">Materiais necessarios {anyShort && <Badge tone="bad">faltante</Badge>}</div>
          <table className="minitable" style={{ marginBottom: 18 }}>
            <tbody>
              {rows.map((row) => (
                <tr key={row.sku}>
                  <td><div style={{ fontWeight: 550 }}>{row.name}</div><div className="cell-sub sku">{row.sku}</div></td>
                  <td className="r muted">{row.need} {row.unit}</td>
                  <td className="r">{row.short ? <Badge tone="bad">so {row.available}</Badge> : <Badge tone="ok" dot>ok</Badge>}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td className="muted">Sem receita vinculada.</td></tr>}
            </tbody>
          </table>

          <div className="field"><span className="field-k">Responsavel</span><span className="field-v">{order.resp}</span></div>
          <div className="field"><span className="field-k">Data planejada</span><span className="field-v">{order.date}</span></div>
          <div className="field"><span className="field-k">Custo estimado</span><span className="field-v">{BRL(estimatedCost(order))}</span></div>
        </div>

        <div className="drawer-foot">
          {order.status === "aguardando_materiais" && <Button variant="default" icon="scan" style={{ flex: 1 }} onClick={() => go("operacao", { mode: "separacao" })}>Separar materiais</Button>}
          {order.status === "em_producao" && <Button variant="default" icon="check" style={{ flex: 1 }}>Finalizar producao</Button>}
          {order.status === "em_cura" && <Button variant="outline" icon="clock" style={{ flex: 1 }}>Estender cura</Button>}
          {order.status === "aguardando_revisao" && <Button variant="brand" icon="unlock" style={{ flex: 1 }}>Liberar lote</Button>}
          <Button variant="outline" icon="printer" onClick={() => window.print()}>Pick list</Button>
        </div>
      </aside>
    </>
  );
}

function PlanProductionModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (order: DemoProductionOrder) => void }) {
  const idPrefix = React.useId();
  const nextId = React.useRef(0);
  const [recipeId, setRecipeId] = React.useState(DEMO_RECIPES[0]?.id ?? "");
  const [quantity, setQuantity] = React.useState("24");
  const recipe = DEMO_RECIPES.find((item) => item.id === recipeId) ?? DEMO_RECIPES[0];

  const submit = () => {
    const planned = Math.max(1, Number.parseInt(quantity, 10) || 1);
    const next = nextId.current++;
    const id = `${idPrefix}-${next}`;
    onCreate({
      id,
      code: `030100${String(900000 + next).slice(-6)}`,
      num: `OP-${209 + next}`,
      product: recipe.product,
      productName: recipe.productName,
      recipe: recipe.name,
      recipeVer: recipe.version,
      planned,
      status: "aguardando_materiais",
      date: "hoje",
      resp: "Equipe",
    });
    toast("Ordem de producao planejada nesta sessao.", "info");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} icon="producao" title="Planejar producao" subtitle="Crie uma OP local para organizar a bancada" width={520}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><div className="spacer" style={{ flex: 1 }} /><Button variant="default" icon="plus" onClick={submit}>Planejar</Button></>}>
      <Field label="Receita">
        <Select value={recipeId} onChange={setRecipeId} options={DEMO_RECIPES.map((item) => ({ value: item.id, label: `${item.name} ${item.version}` }))} />
      </Field>
      <Field label="Quantidade planejada"><Input value={quantity} inputMode="numeric" onChange={(event) => setQuantity(event.target.value)} /></Field>
    </Modal>
  );
}

export function ProductionScreen({ go }: { go: Go; route: Route }) {
  const [orders, setOrders] = React.useState<DemoProductionOrder[]>(() => [...DEMO_PRODUCTION]);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [planOpen, setPlanOpen] = React.useState(false);
  const openOrder = orders.find((order) => order.id === openId);

  return (
    <div className="page page--wide fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-h1">Producao</h1>
          <p className="page-lede">{orders.length} ordens - fluxo configuravel em Configuracoes</p>
        </div>
        <div className="row-wrap">
          <Button variant="outline" icon="fileText" onClick={() => window.print()}>Pick list de producao</Button>
          <Button variant="default" icon="plus" onClick={() => setPlanOpen(true)}>Planejar producao</Button>
        </div>
      </div>

      <div className="kanban">
        {PRODUCTION_COLUMNS.map((column) => {
          const meta = PROD_STATUS[column];
          const cards = orders.filter((order) => order.status === column);
          return (
            <div className="kcol" key={column}>
              <div className="kcol-head">
                <div className={`chip chip--${meta.tone}`} style={{ width: 26, height: 26, borderRadius: 7 }}><Icon name={meta.icon} size={14} /></div>
                <span className="kcol-title">{meta.label}</span>
                <span className="kcol-count">{cards.length}</span>
              </div>
              <div className="kcol-body">
                {cards.map((order) => {
                  const rows = materialRows(order);
                  const short = rows.some((row) => row.short);
                  return (
                    <div className="kcard" key={order.id} onClick={() => setOpenId(order.id)}>
                      <div className="kcard-top">
                        <span className="code-pill">{order.num}</span>
                        <span className="muted" style={{ fontSize: 11.5 }}>{order.date}</span>
                      </div>
                      <div className="kcard-title">{order.productName}</div>
                      <div className="kcard-sub">{order.planned} un - {order.recipe} {order.recipeVer}</div>
                      <Sep style={{ margin: "10px 0 9px" }} />
                      {order.status === "aguardando_materiais" && (short ? <Badge tone="bad" dot>Material faltante</Badge> : <Badge tone="ok" dot>Material ok</Badge>)}
                      {order.status === "em_producao" && <><Progress value={order.progress ?? 0} tone="info" /><div className="muted" style={{ fontSize: 11.5, marginTop: 5 }}>{order.progress ?? 0}% concluido</div></>}
                      {order.status === "em_cura" && <div className="row between"><Badge tone="cure" dot>Cura</Badge><span className="muted" style={{ fontSize: 12 }}>faltam {order.cureDayLeft}d</span></div>}
                      {order.status === "aguardando_revisao" && <Badge tone="warn" dot>Revisar agora</Badge>}
                      {order.status === "liberada" && <Badge tone="ok" dot>Lote liberado</Badge>}
                    </div>
                  );
                })}
                {cards.length === 0 && <Empty icon={meta.icon} title="Sem ordens" />}
              </div>
            </div>
          );
        })}
      </div>

      {openOrder && <ProductionDrawer order={openOrder} go={go} onClose={() => setOpenId(null)} />}
      <PlanProductionModal open={planOpen} onClose={() => setPlanOpen(false)} onCreate={(order) => setOrders((current) => [order, ...current])} />
    </div>
  );
}
