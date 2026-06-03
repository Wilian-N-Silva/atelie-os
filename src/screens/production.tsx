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
import { Barcode } from "@/components/barcode";
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

function materialLocation(sku: string) {
  if (sku.startsWith("CER-")) return "MP / Ceras";
  if (sku.startsWith("ESS-")) return "MP / Essencias";
  if (sku.startsWith("VID-")) return "Embalagens / Vidros";
  if (sku.startsWith("TMP-")) return "Embalagens / Tampas";
  return "Almoxarifado";
}

function estimatedCost(order: DemoProductionOrder) {
  return materialRows(order).reduce((sum, row) => sum + row.need * (findDemoItem(row.sku)?.costAvg ?? 0), 0);
}

type ProductionPickListJob = { id: string; code: string; title: string; orders: DemoProductionOrder[]; generatedAt: string };

function ProductionPickListDocument({ job }: { job: ProductionPickListJob | null }) {
  if (!job) return null;
  const totalOps = job.orders.length;
  const totalLines = job.orders.reduce((sum, order) => sum + materialRows(order).length, 0);
  const totalUnits = job.orders.reduce((sum, order) => sum + order.planned, 0);

  return (
    <div className="print-doc pickdoc" aria-hidden="true">
      <div className="pickdoc-page">
        <header className="pickdoc-head">
          <div>
            <div className="pickdoc-kicker">Atelie OS - documento de bancada</div>
            <h1 className="pickdoc-title">{job.title}</h1>
            <div className="pickdoc-meta">
              <span>Gerado: {job.generatedAt}</span>
              <span>OPs: {totalOps}</span>
              <span>Linhas: {totalLines}</span>
              <span>Unidades planejadas: {totalUnits}</span>
            </div>
          </div>
          <Barcode code={job.orders.length === 1 ? job.orders[0].code : job.code} size="lg" />
        </header>

        <section className="pickdoc-summary">
          <div><span>Documento</span><strong>{job.code}</strong></div>
          <div><span>OPs</span><strong>{totalOps}</strong></div>
          <div><span>Unidades</span><strong>{totalUnits}</strong></div>
          <div><span>Uso</span><strong>Producao</strong></div>
        </section>

        {job.orders.map((order) => {
          const rows = materialRows(order);
          const recipe = recipeFor(order);
          return (
            <article className="pickdoc-order" key={order.id}>
              <div className="pickdoc-order-head">
                <div>
                  <div className="pickdoc-order-title">{order.num} - {order.productName}</div>
                  <div className="pickdoc-order-sub">
                    Receita: {recipe?.name ?? order.recipe} {order.recipeVer} - Planejado: {order.planned} un<br />
                    OP: <span className="pickdoc-code">{order.code}</span> - Responsavel: {order.resp}
                  </div>
                </div>
                <Barcode code={order.code} size="md" />
              </div>

              <table className="pickdoc-table">
                <thead>
                  <tr>
                    <th className="pickdoc-check">Ok</th>
                    <th>Material</th>
                    <th>SKU</th>
                    <th>Codigo</th>
                    <th>Separar</th>
                    <th>Disponivel</th>
                    <th>Local</th>
                    <th>Conferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const item = findDemoItem(row.sku);
                    return (
                      <tr key={row.sku}>
                        <td className="pickdoc-check"><span className="pickdoc-box" /></td>
                        <td>
                          <div className="pickdoc-item">{row.name}</div>
                          <div>Perda tecnica: {row.loss}%</div>
                        </td>
                        <td className="pickdoc-code">{row.sku}</td>
                        <td className="pickdoc-code">{item?.code ?? "-"}</td>
                        <td className="pickdoc-qty">{row.need} {row.unit}</td>
                        <td>{row.available} {row.unit}{row.short ? " - faltante" : ""}</td>
                        <td>{materialLocation(row.sku)}</td>
                        <td><span className="pickdoc-box" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="pickdoc-sign">
                <span>Separado por / hora</span>
                <span>Conferido por / hora</span>
                <span>Producao iniciada por / hora</span>
              </div>
            </article>
          );
        })}

        <div className="pickdoc-flow">
          <strong>Fluxo recomendado</strong>
          1. No Modo Operacao, bipe o codigo de barras da OP. 2. Separe cada material da lista. 3. Finalize a separacao. 4. Avance para o checklist de producao do lote.
        </div>
      </div>
    </div>
  );
}

function ProductionDrawer({ order, go, onClose, onPrint }: { order: DemoProductionOrder; go: Go; onClose: () => void; onPrint: (orders: DemoProductionOrder[], title: string) => void }) {
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
          {order.status === "aguardando_materiais" && <Button variant="default" icon="scan" style={{ flex: 1 }} onClick={() => go("operacao", { mode: "materiais", production: order.id })}>Separar materiais</Button>}
          {order.status === "em_producao" && <Button variant="default" icon="check" style={{ flex: 1 }}>Finalizar producao</Button>}
          {order.status === "em_cura" && <Button variant="outline" icon="clock" style={{ flex: 1 }}>Estender cura</Button>}
          {order.status === "aguardando_revisao" && <Button variant="brand" icon="unlock" style={{ flex: 1 }}>Liberar lote</Button>}
          <Button variant="outline" icon="printer" onClick={() => onPrint([order], `Pick list ${order.num}`)}>Pick list</Button>
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

export function ProductionScreen({ go, route }: { go: Go; route: Route }) {
  const [orders, setOrders] = React.useState<DemoProductionOrder[]>(() => [...DEMO_PRODUCTION]);
  const [openId, setOpenId] = React.useState<string | null>(route.open ?? null);
  const [planOpen, setPlanOpen] = React.useState(false);
  const [printJob, setPrintJob] = React.useState<ProductionPickListJob | null>(null);
  const printCounter = React.useRef(1);
  const openOrder = orders.find((order) => order.id === openId);
  const printableOrders = orders.filter((order) => order.status === "aguardando_materiais");

  React.useEffect(() => {
    if (route.open) setOpenId(route.open);
  }, [route.open]);

  const printPickList = React.useCallback((selected: DemoProductionOrder[], title: string) => {
    const next = printCounter.current++;
    setPrintJob({
      id: `prod-pick-${next}`,
      code: `039900${String(100000 + next).slice(-6)}`,
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
          <h1 className="page-h1">Producao</h1>
          <p className="page-lede">{orders.length} ordens - fluxo configuravel em Configuracoes</p>
        </div>
        <div className="row-wrap">
          <Button
            variant="outline"
            icon="fileText"
            onClick={() => printPickList(printableOrders, `Pick list de producao - ${printableOrders.length} OPs`)}
            disabled={!printableOrders.length}
          >
            Pick list de producao{printableOrders.length ? ` (${printableOrders.length})` : ""}
          </Button>
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

      {openOrder && <ProductionDrawer order={openOrder} go={go} onClose={() => setOpenId(null)} onPrint={printPickList} />}
      <PlanProductionModal open={planOpen} onClose={() => setPlanOpen(false)} onCreate={(order) => setOrders((current) => [order, ...current])} />
      <ProductionPickListDocument job={printJob} />
    </div>
  );
}
