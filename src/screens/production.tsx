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
  type ItemSummary,
  type ProductionOrder,
  type Recipe,
} from "@/lib/domain";
import { useItemDirectory } from "@/lib/item-directory";
import { createProduction, loadProduction, updateProduction } from "@/lib/production-client";
import { loadRecipes } from "@/lib/recipes-client";
import { type WorkflowStep, useWorkflows } from "@/lib/workflows";
import { buildStatusMap, statusIcon, statusInfo, type StatusInfo } from "@/lib/workflow-status";
import type { Go, Route } from "@/lib/types";

type FindItem = (sku: string) => ItemSummary | undefined;
type StatusMap = Map<string, StatusInfo>;

function productionColumnIcon(step: WorkflowStep) {
  return statusIcon(step.key);
}

function productionColumnsFromWorkflow(steps: WorkflowStep[], orders: ProductionOrder[]) {
  const seen = new Set(steps.map((step) => step.key));
  const orphans = Array.from(new Set(orders.map((order) => order.status)))
    .filter((status) => !seen.has(status))
    .map<WorkflowStep>((status) => ({ key: status, label: status, color: "neutral", automation: "none" }));
  return [...steps, ...orphans];
}

function recipeFor(order: ProductionOrder, recipes: Recipe[]) {
  return recipes.find((recipe) => recipe.product === order.product);
}

function formatPlannedDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value || "a definir";
  return `${match[3]}/${match[2]}`;
}

function materialRows(order: ProductionOrder, recipes: Recipe[], find: FindItem) {
  const recipe = recipeFor(order, recipes);
  if (!recipe) return [];
  return recipe.components.map((component) => {
    const item = find(component.sku);
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

function estimatedCost(order: ProductionOrder, recipes: Recipe[], find: FindItem) {
  return materialRows(order, recipes, find).reduce((sum, row) => sum + row.need * (find(row.sku)?.costAvg ?? 0), 0);
}

function plannedMaterialRows(recipeId: string, quantity: string, recipes: Recipe[], find: FindItem) {
  const recipe = recipes.find((item) => item.id === recipeId);
  const planned = Math.max(1, Number.parseInt(quantity, 10) || 1);
  if (!recipe) return [];
  return recipe.components.map((component) => {
    const item = find(component.sku);
    const need = Number((component.qty * planned * (1 + component.loss / 100)).toFixed(3));
    return {
      ...component,
      item,
      need,
      available: item?.available ?? 0,
      short: (item?.available ?? 0) < need,
      cost: need * (item?.costAvg ?? 0),
    };
  });
}

type ProductionPickListJob = { id: string; code: string; title: string; orders: ProductionOrder[]; generatedAt: string };

function ProductionPickListDocument({ job, recipes, find }: { job: ProductionPickListJob | null; recipes: Recipe[]; find: FindItem }) {
  if (!job) return null;
  const totalOps = job.orders.length;
  const totalLines = job.orders.reduce((sum, order) => sum + materialRows(order, recipes, find).length, 0);
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
          const rows = materialRows(order, recipes, find);
          const recipe = recipeFor(order, recipes);
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
                    const item = find(row.sku);
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

function productionCurePatch(order: ProductionOrder, recipe: Recipe | undefined) {
  const cureDays = Math.max(1, recipe?.cureDays ?? order.cureDayLeft ?? 7);
  const cureUntil = new Date();
  cureUntil.setDate(cureUntil.getDate() + cureDays);
  return {
    status: "em_cura" as const,
    progress: 100,
    lot: order.lot ?? `LOTE-${order.num.replace(/\D/g, "") || order.id.slice(0, 6)}`,
    cureUntil: cureUntil.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    cureDayLeft: cureDays,
  };
}

function nextProductionStatus(steps: WorkflowStep[], current: string) {
  const index = steps.findIndex((step) => step.key === current);
  return index >= 0 ? steps[index + 1]?.key ?? null : null;
}

function ProductionDrawer({ order, recipes, find, statusMap, go, onClose, onPrint, onUpdate }: { order: ProductionOrder; recipes: Recipe[]; find: FindItem; statusMap: StatusMap; go: Go; onClose: () => void; onPrint: (orders: ProductionOrder[], title: string) => void; onUpdate: (productionId: string, patch: Partial<Pick<ProductionOrder, "status" | "progress" | "lot" | "cureUntil" | "cureDayLeft">>) => Promise<void> }) {
  const status = statusInfo(statusMap, order.status);
  const recipe = recipeFor(order, recipes);
  const rows = materialRows(order, recipes, find);
  const anyShort = rows.some((row) => row.short);
  const [saving, setSaving] = React.useState(false);

  const runUpdate = async (patch: Partial<Pick<ProductionOrder, "status" | "progress" | "lot" | "cureUntil" | "cureDayLeft">>, message: string) => {
    setSaving(true);
    try {
      await onUpdate(order.id, patch);
      toast(message, "ok");
    } catch {
      toast("Nao foi possivel atualizar a OP.", "bad");
    } finally {
      setSaving(false);
    }
  };

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
          <div className="field"><span className="field-k">Data planejada</span><span className="field-v">{formatPlannedDate(order.date)}</span></div>
          <div className="field"><span className="field-k">Custo estimado</span><span className="field-v">{BRL(estimatedCost(order, recipes, find))}</span></div>
        </div>

        <div className="drawer-foot">
          {order.status === "aguardando_materiais" && <Button variant="default" icon="scan" style={{ flex: 1 }} onClick={() => go("operacao", { mode: "materiais", production: order.id })}>Separar materiais</Button>}
          {order.status === "em_producao" && <Button variant="default" icon="check" style={{ flex: 1 }} disabled={saving} onClick={() => runUpdate(productionCurePatch(order, recipe), "Producao finalizada e lote enviado para cura.")}>Finalizar producao</Button>}
          {order.status === "em_cura" && <Button variant="outline" icon="clock" style={{ flex: 1 }} disabled={saving} onClick={() => runUpdate({ cureDayLeft: (order.cureDayLeft ?? 0) + 1 }, "Cura estendida em 1 dia.")}>Estender cura</Button>}
          {order.status === "aguardando_revisao" && <Button variant="brand" icon="unlock" style={{ flex: 1 }} disabled={saving} onClick={() => runUpdate({ status: "liberada", cureDayLeft: 0 }, "Lote liberado para venda.")}>Liberar lote</Button>}
          <Button variant="outline" icon="printer" onClick={() => onPrint([order], `Pick list ${order.num}`)}>Pick list</Button>
        </div>
      </aside>
    </>
  );
}

function PlanProductionModal({ open, recipes, find, onClose, onCreate }: { open: boolean; recipes: Recipe[]; find: FindItem; onClose: () => void; onCreate: (input: { recipeVersionId: string; planned: number; plannedDateLabel: string; responsible: string }, anyShort: boolean) => Promise<void> | void }) {
  const [recipeId, setRecipeId] = React.useState("");
  const [quantity, setQuantity] = React.useState("24");
  const [date, setDate] = React.useState("");
  const [responsible, setResponsible] = React.useState("Camila");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open && !recipeId && recipes.length) setRecipeId(recipes[0].id);
  }, [open, recipeId, recipes]);

  const recipe = recipes.find((item) => item.id === recipeId) ?? recipes[0];
  const rows = plannedMaterialRows(recipeId, quantity, recipes, find);
  const anyShort = rows.some((row) => row.short);
  const estimated = rows.reduce((sum, row) => sum + row.cost, 0);
  const planned = Math.max(1, Number.parseInt(quantity, 10) || 1);
  const responsibleOptions = ["Camila", "Equipe", "Operacao", "Ana", "Bruna"].map((name) => ({ value: name, label: name }));

  const submit = async () => {
    if (!recipe) {
      toast("Cadastre uma receita antes de planejar.", "bad");
      return;
    }
    setSaving(true);
    try {
      await onCreate({
        recipeVersionId: recipe.id,
        planned,
        plannedDateLabel: date ? formatPlannedDate(date) : "a definir",
        responsible,
      }, anyShort);
      toast(anyShort ? "OP planejada com material faltante." : "Ordem de producao planejada.", "info");
      onClose();
    } catch {
      toast("Nao foi possivel planejar a producao.", "bad");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} icon="producao" title="Planejar producao" subtitle="Crie uma OP para organizar a bancada" width={820}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><div className="spacer" style={{ flex: 1 }} /><Button variant="default" icon="plus" onClick={submit} disabled={saving || !recipe}>Planejar</Button></>}>
      <div className="prod-plan-layout">
        <div className="prod-plan-main">
          <section className="order-form-section">
            <div className="block-label">Plano</div>
            <div className="ff-grid">
              <Field label="Receita">
                <Select value={recipeId} onChange={setRecipeId} options={recipes.map((item) => ({ value: item.id, label: `${item.name} ${item.version}` }))} />
              </Field>
              <Field label="Quantidade planejada"><Input value={quantity} inputMode="numeric" onChange={(event) => setQuantity(event.target.value)} /></Field>
            </div>
            <div className="ff-grid">
              <Field label="Data planejada"><Input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Field>
              <Field label="Responsavel"><Select value={responsible} onChange={setResponsible} options={responsibleOptions} /></Field>
            </div>
          </section>

          <section className="order-form-section">
            <div className="row between" style={{ marginBottom: 10 }}>
              <div>
                <div className="block-label" style={{ marginBottom: 2 }}>Materiais disponiveis</div>
                <div className="section-title">{recipe?.productName ?? "Produto"}</div>
              </div>
              {anyShort ? <Badge tone="bad" dot>Material faltante</Badge> : <Badge tone="ok" dot>Material ok</Badge>}
            </div>
            <table className="minitable prod-plan-materials">
              <tbody>
                {rows.map((row) => (
                  <tr key={row.sku}>
                    <td>
                      <div className="item-cell">
                        <div className={row.item?.type === "emb" ? "swatch swatch--emb" : "swatch swatch--mp"}><Icon name={row.item?.type === "emb" ? "package2" : "droplet"} size={15} /></div>
                        <div style={{ minWidth: 0 }}>
                          <div className="cell-title">{row.name}</div>
                          <div className="cell-sub sku">{row.sku} - perda {row.loss}%</div>
                        </div>
                      </div>
                    </td>
                    <td className="r muted">{row.need} {row.unit}</td>
                    <td className="r muted">{row.available} {row.unit}</td>
                    <td className="r">{row.short ? <Badge tone="bad">faltam {Number((row.need - row.available).toFixed(3))}</Badge> : <Badge tone="ok" dot>ok</Badge>}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td className="muted">Selecione uma receita para ver materiais.</td></tr>}
              </tbody>
            </table>
          </section>
        </div>

        <aside className="prod-plan-side">
          <div className="block-label">Resumo</div>
          <div className="order-summary-box">
            <div className="field"><span className="field-k">Produto</span><span className="field-v">{recipe?.productName ?? "-"}</span></div>
            <div className="field"><span className="field-k">Planejado</span><span className="field-v">{planned} un</span></div>
            <div className="field"><span className="field-k">Data</span><span className="field-v">{formatPlannedDate(date)}</span></div>
            <div className="field"><span className="field-k">Responsavel</span><span className="field-v">{responsible}</span></div>
            <div className="field"><span className="field-k">Custo estimado</span><span className="field-v">{BRL(estimated)}</span></div>
          </div>

          <div className={anyShort ? "prod-plan-callout prod-plan-callout--warn" : "prod-plan-callout prod-plan-callout--ok"}>
            <Icon name={anyShort ? "alertCircle" : "checkCircle"} size={17} />
            <div>
              <strong>{anyShort ? "Pode planejar com pendencia" : "Materiais suficientes"}</strong>
              <span>{anyShort ? "A OP entra como aguardando materiais e a separacao vai sinalizar o faltante." : "A pick list ja pode seguir para separacao no modo operacao."}</span>
            </div>
          </div>
        </aside>
      </div>
    </Modal>
  );
}

export function ProductionScreen({ go, route }: { go: Go; route: Route }) {
  const [workflows] = useWorkflows();
  const dir = useItemDirectory();
  const [recipes, setRecipes] = React.useState<Recipe[]>([]);
  const [orders, setOrders] = React.useState<ProductionOrder[]>([]);
  const [openId, setOpenId] = React.useState<string | null>(route.open ?? null);
  const [planOpen, setPlanOpen] = React.useState(false);
  const [printJob, setPrintJob] = React.useState<ProductionPickListJob | null>(null);
  const printCounter = React.useRef(1);
  const openOrder = orders.find((order) => order.id === openId);
  const printableOrders = orders.filter((order) => order.status === "aguardando_materiais");
  const statusMap = React.useMemo(() => buildStatusMap(workflows.production), [workflows.production]);
  const columns = React.useMemo(() => productionColumnsFromWorkflow(workflows.production, orders), [workflows.production, orders]);
  const updateOrder = React.useCallback(async (productionId: string, patch: Partial<Pick<ProductionOrder, "status" | "progress" | "lot" | "cureUntil" | "cureDayLeft">>) => {
    const next = await updateProduction(productionId, patch);
    setOrders(next);
  }, []);

  React.useEffect(() => {
    let alive = true;
    loadProduction().then((next) => { if (alive) setOrders(next); }).catch(() => null);
    loadRecipes().then((next) => { if (alive) setRecipes(next); }).catch(() => null);
    return () => { alive = false; };
  }, []);

  React.useEffect(() => {
    if (route.open) setOpenId(route.open);
  }, [route.open]);

  const printPickList = React.useCallback((selected: ProductionOrder[], title: string) => {
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
        {columns.map((column) => {
          const cards = orders.filter((order) => order.status === column.key);
          return (
            <div className="kcol" key={column.key}>
              <div className="kcol-head">
                <div className={`chip chip--${column.color}`} style={{ width: 26, height: 26, borderRadius: 7 }}><Icon name={productionColumnIcon(column)} size={14} /></div>
                <span className="kcol-title">{column.label}</span>
                <span className="kcol-count">{cards.length}</span>
              </div>
              <div className="kcol-body">
                {cards.map((order) => {
                  const rows = materialRows(order, recipes, dir.find);
                  const short = rows.some((row) => row.short);
                  const nextStatus = nextProductionStatus(workflows.production, order.status);
                  return (
                    <div className="kcard" key={order.id} onClick={() => setOpenId(order.id)}>
                      <div className="kcard-top">
                        <span className="code-pill">{order.num}</span>
                        <span className="muted" style={{ fontSize: 11.5 }}>{formatPlannedDate(order.date)}</span>
                      </div>
                      <div className="kcard-title">{order.productName}</div>
                      <div className="kcard-sub">{order.planned} un - {order.recipe} {order.recipeVer}</div>
                      <Sep style={{ margin: "10px 0 9px" }} />
                      {order.status === "aguardando_materiais" && (short ? <Badge tone="bad" dot>Material faltante</Badge> : <Badge tone="ok" dot>Material ok</Badge>)}
                      {order.status === "em_producao" && <><Progress value={order.progress ?? 0} tone="info" /><div className="muted" style={{ fontSize: 11.5, marginTop: 5 }}>{order.progress ?? 0}% concluido</div></>}
                      {order.status === "em_cura" && <div className="row between"><Badge tone="cure" dot>Cura</Badge><span className="muted" style={{ fontSize: 12 }}>faltam {order.cureDayLeft}d</span></div>}
                      {order.status === "aguardando_revisao" && <Badge tone="warn" dot>Revisar agora</Badge>}
                      {order.status === "liberada" && <Badge tone="ok" dot>Lote liberado</Badge>}
                      {nextStatus && (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon="arrowRight"
                          style={{ marginTop: 10, width: "100%" }}
                          onClick={(event) => {
                            event.stopPropagation();
                            const patch = nextStatus === "em_cura" ? productionCurePatch(order, recipeFor(order, recipes)) : { status: nextStatus };
                            updateOrder(order.id, patch).catch(() => toast("Nao foi possivel avancar a OP.", "bad"));
                          }}
                        >
                          Avancar
                        </Button>
                      )}
                    </div>
                  );
                })}
                {cards.length === 0 && <Empty icon={productionColumnIcon(column)} title="Sem ordens" />}
              </div>
            </div>
          );
        })}
      </div>

      {openOrder && <ProductionDrawer order={openOrder} recipes={recipes} find={dir.find} statusMap={statusMap} go={go} onClose={() => setOpenId(null)} onPrint={printPickList} onUpdate={updateOrder} />}
      <PlanProductionModal
        open={planOpen}
        recipes={recipes}
        find={dir.find}
        onClose={() => setPlanOpen(false)}
        onCreate={async (input) => {
          const next = await createProduction(input);
          setOrders(next);
        }}
      />
      <ProductionPickListDocument job={printJob} recipes={recipes} find={dir.find} />
    </div>
  );
}
