"use client";

import * as React from "react";
import { Barcode } from "@/components/barcode";
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
  Select,
  Sep,
  Stat,
  Tabs,
  Textarea,
  ViewToggle,
  cn,
  toast,
  useView,
} from "@/components/ui";
import {
  BRL,
  RECIPE_TEST_CRITERIA,
  type ItemSummary,
  type Recipe,
  type RecipeTest,
  type RecipeTestCriterion,
  type RecipeTestResult,
  deriveRecipeTestResult,
  emptyRecipeTestCriteria,
} from "@/lib/domain";
import { useItemDirectory } from "@/lib/item-directory";
import { createRecipe, createRecipeVersion, loadRecipes, setRecipeStatus } from "@/lib/recipes-client";
import { createRecipeTest, loadRecipeTests, submitRecipeTest } from "@/lib/recipe-tests-client";
import { compatibleUnitCodes, convertQuantityOrSame } from "@/lib/unit-conversion";
import type { Go, Route } from "@/lib/types";

const TEST_RESULT_TONE: Record<RecipeTestResult, "ok" | "bad" | "warn" | "neutral"> = {
  aprovado: "ok",
  reprovado: "bad",
  ajustar: "warn",
  pendente: "neutral",
};

const TEST_RESULT_LABEL: Record<RecipeTestResult, string> = {
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  ajustar: "Ajustar",
  pendente: "Pendente",
};

type FindItem = (sku: string) => ItemSummary | undefined;

type RecipeComponentForm = {
  key: string;
  sku: string;
  qty: string;
  unit: string;
  loss: string;
};

function recipeCost(recipe: Recipe, find: FindItem) {
  return recipe.components.reduce((sum, component) => {
    const item = find(component.sku);
    const baseQty = convertQuantityOrSame(component.qty, component.unit, item?.unit);
    return sum + (item?.costAvg ?? 0) * baseQty * (1 + component.loss / 100);
  }, 0);
}

function parseRecipeNumber(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function recipeComponentFromSku(sku: string, index: number): RecipeComponentForm {
  const defaults: Record<string, { qty: string; loss: string }> = {
    "CER-SOJ-01": { qty: "0.142", loss: "3" },
    "ESS-LAV-FR": { qty: "11", loss: "2" },
    "VID-NAD-156": { qty: "1", loss: "1" },
    "TMP-PIN-052": { qty: "1", loss: "0" },
  };
  const fallback = defaults[sku] ?? { qty: "1", loss: "2" };
  return { key: `${sku}-${index}-${Date.now()}`, sku, qty: fallback.qty, unit: "", loss: fallback.loss };
}

function defaultRecipeComponents(materials: ItemSummary[]): RecipeComponentForm[] {
  const preferred = ["CER-SOJ-01", "ESS-LAV-FR", "VID-NAD-156", "TMP-PIN-052"]
    .filter((sku) => materials.some((item) => item.sku === sku));
  const skus = preferred.length ? preferred : materials.slice(0, 2).map((item) => item.sku);
  return skus.map(recipeComponentFromSku);
}

function componentsFromRecipe(recipe: Recipe): RecipeComponentForm[] {
  return recipe.components.map((component, index) => ({
    key: `${component.sku}-${index}-${recipe.id}`,
    sku: component.sku,
    qty: String(component.qty),
    unit: component.unit,
    loss: String(component.loss),
  }));
}

function nextRecipeVersion(version: string) {
  const numeric = Number(version.replace(/\D/g, ""));
  return `v${Number.isFinite(numeric) && numeric > 0 ? numeric + 1 : 2}`;
}

function testCriteriaSummary(test: RecipeTest) {
  const approved = test.criteria.filter((criterion) => criterion.result === "aprovado").length;
  return `${approved}/${test.criteria.length || RECIPE_TEST_CRITERIA.length} critérios aprovados`;
}

function RecipeTestLabelDocument({ test }: { test: RecipeTest | null }) {
  if (!test) return null;
  return (
    <div className="print-doc recipe-test-print-doc" style={{ display: "none" }}>
      <div className="recipe-test-label">
        <Barcode code={test.code} size="md" />
      </div>
    </div>
  );
}

function RecipeTestModal({
  open,
  test,
  onClose,
  onSubmit,
}: {
  open: boolean;
  test: RecipeTest | null;
  onClose: () => void;
  onSubmit: (criteria: RecipeTestCriterion[], note: string) => Promise<void> | void;
}) {
  const [criteria, setCriteria] = React.useState<RecipeTestCriterion[]>(() => emptyRecipeTestCriteria());
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open || !test) return;
    setCriteria(test.criteria.length ? test.criteria.map((criterion) => ({ ...criterion })) : emptyRecipeTestCriteria());
    setNote(test.note ?? "");
    setSaving(false);
  }, [open, test]);

  const setResult = (key: string, result: RecipeTestResult) => {
    setCriteria((current) => current.map((criterion) => criterion.key === key ? { ...criterion, result } : criterion));
  };
  const setCritNote = (key: string, value: string) => {
    setCriteria((current) => current.map((criterion) => criterion.key === key ? { ...criterion, note: value } : criterion));
  };

  const derived = deriveRecipeTestResult(criteria);

  const submit = async () => {
    setSaving(true);
    try {
      await onSubmit(criteria, note.trim());
      onClose();
    } catch {
      toast("Não foi possível salvar o teste.", "bad");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon="beaker"
      title={test ? `Teste ${test.seq} - ${test.recipeName} ${test.recipeVersion}` : "Teste de receita"}
      subtitle="Protocolo de qualidade - registre cada critério"
      width={760}
      footer={(
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <div className="spacer" style={{ flex: 1 }} />
          <Badge tone={TEST_RESULT_TONE[derived]} dot>{TEST_RESULT_LABEL[derived]}</Badge>
          <Button variant="default" icon="check" onClick={submit} disabled={saving}>Salvar teste</Button>
        </>
      )}
    >
      <div className="rt-form">
        {RECIPE_TEST_CRITERIA.map((meta) => {
          const criterion = criteria.find((item) => item.key === meta.key);
          const result = criterion?.result ?? "pendente";
          return (
            <div key={meta.key} className="rt-crit">
              <div className="rt-crit-head">
                <div>
                  <div className="rt-crit-name">{meta.label}</div>
                  <div className="rt-crit-how">{meta.howTo}</div>
                  <div className="rt-crit-approve"><Icon name="check" size={13} /> {meta.approveWhen}</div>
                </div>
                <div className="rt-crit-results">
                  {(["aprovado", "ajustar", "reprovado"] as RecipeTestResult[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={cn("rt-result-btn", `rt-result-btn--${value}`, result === value && "rt-result-btn--on")}
                      onClick={() => setResult(meta.key, value)}
                    >
                      {TEST_RESULT_LABEL[value]}
                    </button>
                  ))}
                </div>
              </div>
              <Input
                value={criterion?.note ?? ""}
                onChange={(event) => setCritNote(meta.key, event.target.value)}
                placeholder="Observação da medição (opcional)"
              />
            </div>
          );
        })}
        <Field label="Observação geral do teste" style={{ marginTop: 4 }}>
          <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ajustes, lote, contexto..." />
        </Field>
      </div>
    </Modal>
  );
}

function RecipeDrawer({
  recipe,
  tests,
  find,
  go,
  onClose,
  onVersion,
  onNewTest,
  onFillTest,
  onPrintTest,
  onApprove,
  onUnapprove,
}: {
  recipe: Recipe;
  tests: RecipeTest[];
  find: FindItem;
  go: Go;
  onClose: () => void;
  onVersion: (recipe: Recipe) => void;
  onNewTest: (recipe: Recipe) => void;
  onFillTest: (test: RecipeTest) => void;
  onPrintTest: (test: RecipeTest) => void;
  onApprove: (recipe: Recipe) => void;
  onUnapprove: (recipe: Recipe) => void;
}) {
  const components = recipe.components.map((component) => {
    const item = find(component.sku);
    const baseQty = convertQuantityOrSame(component.qty, component.unit, item?.unit);
    const cost = (item?.costAvg ?? 0) * baseQty * (1 + component.loss / 100);
    return { ...component, baseQty, cost, available: item?.available ?? 0, stockUnit: item?.unit ?? component.unit };
  });
  const total = recipeCost(recipe, find);
  const approvedTest = tests.some((test) => test.status === "aprovado");

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" style={{ width: 600 }}>
        <div className="drawer-head">
          <div className="chip chip--brand chip--lg"><Icon name="receitas" size={20} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="drawer-h1">{recipe.name}</div>
            <div className="row" style={{ gap: 8, marginTop: 4 }}>
              <Badge tone={recipe.status === "ativa" ? "ok" : "neutral"} dot>{recipe.status}</Badge>
              <Badge tone="outline">{recipe.version}</Badge>
              <span className="muted" style={{ fontSize: 13 }}>{recipe.productName}</span>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>

        <div className="drawer-body">
          <div className="grid cols-3" style={{ gap: 10, marginBottom: 18 }}>
            <Card><CardContent style={{ padding: 13, textAlign: "center" }}><Stat label="Rende" value={recipe.yield} sub={recipe.yieldUnit} /></CardContent></Card>
            <Card><CardContent style={{ padding: 13, textAlign: "center" }}><Stat label="Cura" value={`${recipe.cureDays}d`} /></CardContent></Card>
            <Card><CardContent style={{ padding: 13, textAlign: "center" }}><Stat label="Custo/un" value={BRL(total)} tone="info" /></CardContent></Card>
          </div>

          <div className="block-label">Componentes</div>
          <table className="om-table" style={{ marginBottom: 18 }}>
            <thead><tr><th>Item</th><th className="om-td-right">Qtd</th><th className="om-td-right">Perda</th><th className="om-td-right">Custo</th></tr></thead>
            <tbody>
              {components.map((component, index) => (
                <tr key={`${component.sku}-${index}`}>
                  <td><div className="cell-title">{component.name}</div><div className="cell-sub sku">{component.sku} - {component.available} {component.stockUnit} disp.</div></td>
                  <td className="om-td-right">{component.qty} {component.unit}</td>
                  <td className="om-td-right muted">{component.loss}%</td>
                  <td className="om-td-right" style={{ fontWeight: 550 }}>{BRL(component.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="row between" style={{ marginTop: 20, marginBottom: 8 }}>
            <div className="block-label" style={{ margin: 0 }}>Testes de receita ({tests.length})</div>
            <Button variant="outline" size="sm" icon="plus" onClick={() => onNewTest(recipe)}>Novo teste</Button>
          </div>
          {!approvedTest && (
            <div className="rt-hint"><Icon name="alertCircle" size={15} /> Aprove pelo menos um teste no protocolo para liberar a ativação desta versão.</div>
          )}
          {tests.length === 0 && <Empty icon="beaker" title="Sem testes ainda" hint="Crie um teste, imprima a etiqueta e preencha o protocolo no Modo Operação." />}
          {tests.map((test) => (
            <div key={test.id} className="rt-card">
              <div className="row between" style={{ marginBottom: 8 }}>
                <div className="row" style={{ gap: 8 }}>
                  <Badge tone={TEST_RESULT_TONE[test.status]} dot>{TEST_RESULT_LABEL[test.status]}</Badge>
                  <span className="cell-title">Teste {test.seq}</span>
                </div>
                <span className="muted" style={{ fontSize: 12.5 }}>{test.testedAt ? new Date(test.testedAt).toLocaleDateString("pt-BR") : "aguardando"} - {test.batchQty} un</span>
              </div>
              <div className="row between" style={{ gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div className="cell-sub">{testCriteriaSummary(test)}</div>
                  <div className="cell-sub sku">{test.code}</div>
                  {test.note && <div className="cell-sub" style={{ marginTop: 4 }}>{test.note}</div>}
                </div>
                <Barcode code={test.code} size="sm" />
              </div>
              <div className="row" style={{ gap: 8, marginTop: 10 }}>
                <Button variant="default" size="sm" icon="listChecks" onClick={() => onFillTest(test)}>Preencher</Button>
                <Button variant="outline" size="sm" icon="printer" onClick={() => onPrintTest(test)}>Etiqueta</Button>
                <Button variant="ghost" size="sm" icon="scan" onClick={() => go("operacao", { test: test.id })}>Abrir na operação</Button>
              </div>
            </div>
          ))}
        </div>

        <div className="drawer-foot">
          {recipe.status === "ativa" ? (
            <Button variant="outline" icon="undo" style={{ flex: 1 }} onClick={() => onUnapprove(recipe)}>Voltar para rascunho</Button>
          ) : (
            <Button variant="default" icon="check" style={{ flex: 1 }} disabled={!approvedTest} onClick={() => onApprove(recipe)}>Aprovar versão</Button>
          )}
          <Button variant="outline" icon="copy" onClick={() => onVersion(recipe)}>Nova versão</Button>
        </div>
      </aside>
    </>
  );
}

function RecipeFormModal({
  open,
  mode,
  baseRecipe,
  materials,
  products,
  find,
  onClose,
  onSave,
}: {
  open: boolean;
  mode: "create" | "version";
  baseRecipe?: Recipe | null;
  materials: ItemSummary[];
  products: ItemSummary[];
  find: FindItem;
  onClose: () => void;
  onSave: (recipe: Recipe) => Promise<void> | void;
}) {
  const idPrefix = React.useId();
  const [name, setName] = React.useState("");
  const [productSku, setProductSku] = React.useState("");
  const [yieldQty, setYieldQty] = React.useState("1");
  const [yieldUnit, setYieldUnit] = React.useState("vela 156ml");
  const [cureDays, setCureDays] = React.useState("14");
  const [components, setComponents] = React.useState<RecipeComponentForm[]>([]);
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;

    if (mode === "version" && baseRecipe) {
      setName(baseRecipe.name);
      setProductSku(baseRecipe.product);
      setYieldQty(String(baseRecipe.yield));
      setYieldUnit(baseRecipe.yieldUnit);
      setCureDays(String(baseRecipe.cureDays));
      setComponents(componentsFromRecipe(baseRecipe));
      setNote("");
      setError(null);
      return;
    }

    const firstProduct = products[0];
    setName("");
    setProductSku(firstProduct?.sku ?? "");
    setYieldQty("1");
    setYieldUnit(firstProduct?.variant ? `vela ${firstProduct.variant}` : "unidade");
    setCureDays("14");
    setComponents(defaultRecipeComponents(materials));
    setNote("");
    setError(null);
  }, [open, mode, baseRecipe, products, materials]);

  const product = products.find((item) => item.sku === productSku) ?? products[0];
  // A kit is assembled from finished products (e.g. 3 velas) plus packaging, so
  // its recipe components may be finished products too - not only raw materials.
  const isKit = product?.type === "kit";
  const componentOptions = isKit
    ? [...materials, ...products.filter((item) => item.type !== "kit" && item.sku !== product?.sku)]
    : materials;

  const resolvedComponents = components.map((component) => {
    const item = find(component.sku);
    const qty = parseRecipeNumber(component.qty);
    const loss = parseRecipeNumber(component.loss);
    const unit = component.unit || item?.unit || "un";
    const stockUnit = item?.unit ?? unit;
    const baseQty = convertQuantityOrSame(qty, unit, stockUnit);
    const cost = (item?.costAvg ?? 0) * baseQty * (1 + loss / 100);
    return {
      ...component,
      item,
      qtyNumber: qty,
      baseQty,
      lossNumber: loss,
      cost,
      available: item?.available ?? 0,
      unit,
      stockUnit,
      compatibleUnits: compatibleUnitCodes(stockUnit),
      name: item?.name ?? component.sku,
    };
  });
  const total = resolvedComponents.reduce((sum, component) => sum + component.cost, 0);

  const setComponent = (key: string, patch: Partial<RecipeComponentForm>) => {
    setComponents((current) => current.map((component) => component.key === key ? { ...component, ...patch } : component));
    setError(null);
  };

  const addComponent = () => {
    const nextSku = componentOptions.find((item) => !components.some((component) => component.sku === item.sku))?.sku
      ?? componentOptions[0]?.sku
      ?? "";
    if (!nextSku) return;
    setComponents((current) => [...current, recipeComponentFromSku(nextSku, current.length)]);
  };

  const removeComponent = (key: string) => {
    setComponents((current) => current.length <= 1 ? current : current.filter((component) => component.key !== key));
  };

  const submit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Informe o nome da receita.");
      return;
    }
    if (!product) {
      setError("Selecione o produto gerado.");
      return;
    }
    if (resolvedComponents.some((component) => component.qtyNumber <= 0 || component.lossNumber < 0)) {
      setError("Cada componente precisa ter quantidade maior que zero e perda zero ou maior.");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        id: idPrefix,
        name: trimmedName,
        product: product.sku,
        productName: `${product.name} ${product.variant}`.trim(),
        version: mode === "version" && baseRecipe ? nextRecipeVersion(baseRecipe.version) : "v1",
        status: "rascunho",
        yield: Math.max(1, Math.round(parseRecipeNumber(yieldQty))),
        yieldUnit: yieldUnit.trim() || "unidade",
        cureDays: Math.max(0, Math.round(parseRecipeNumber(cureDays))),
        components: resolvedComponents.map((component) => ({
          sku: component.sku,
          name: component.name,
          qty: component.qtyNumber,
          unit: component.unit,
          loss: component.lossNumber,
        })),
        tests: note.trim() ? [{ date: "hoje", qty: 1, result: "ajustar", note: note.trim() }] : [],
      });
      toast(mode === "version" ? "Nova versao criada como rascunho." : "Receita criada como rascunho.", "info");
      onClose();
    } catch {
      toast("Nao foi possivel salvar a receita.", "bad");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon="receitas"
      title={mode === "version" ? "Nova versao da receita" : "Nova receita"}
      subtitle={mode === "version" && baseRecipe ? `${baseRecipe.name} ${baseRecipe.version} -> ${nextRecipeVersion(baseRecipe.version)}` : "Formula com componentes, rendimento e custo calculado"}
      width={900}
      footer={(
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <div className="spacer" style={{ flex: 1 }} />
          <span className="muted" style={{ fontSize: 13, marginRight: 8 }}>Custo/un {BRL(total)}</span>
          <Button variant="default" icon="check" onClick={submit} disabled={saving}>{mode === "version" ? "Criar versao" : "Criar receita"}</Button>
        </>
      )}
    >
      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1.7fr) minmax(260px, 0.8fr)", gap: 20 }}>
        <div>
          <div className="ff-grid">
            <Field label="Nome da receita" required>
              <Input value={name} onChange={(event) => { setName(event.target.value); setError(null); }} placeholder="Ex.: Lavanda Francesa" />
            </Field>
            <Field label="Produto gerado" required>
              <Select value={productSku} onChange={setProductSku} options={products.map((item) => ({ value: item.sku, label: `${item.name} ${item.variant}` }))} />
            </Field>
          </div>

          <div className="ff-grid-3">
            <Field label="Rendimento" required>
              <Input inputMode="numeric" value={yieldQty} onChange={(event) => setYieldQty(event.target.value.replace(/\D/g, ""))} />
            </Field>
            <Field label="Unidade de rendimento">
              <Input value={yieldUnit} onChange={(event) => setYieldUnit(event.target.value)} placeholder="vela 156ml" />
            </Field>
            <Field label="Cura (dias)">
              <Input inputMode="numeric" value={cureDays} onChange={(event) => setCureDays(event.target.value.replace(/\D/g, ""))} />
            </Field>
          </div>

          <div className="row between" style={{ margin: "6px 0 8px" }}>
            <div className="block-label">Componentes da formula</div>
            <Button variant="outline" size="sm" icon="plus" onClick={addComponent}>Adicionar item</Button>
          </div>

          <div style={{ border: "1px solid hsl(var(--border))", borderRadius: 10, overflowX: "auto" }}>
            <table className="om-table" style={{ minWidth: 720 }}>
              <thead>
                <tr>
                  <th>Item</th>
                  <th style={{ width: 112 }}>Qtd</th>
                  <th style={{ width: 88 }}>Perda</th>
                  <th className="om-td-right" style={{ width: 116 }}>Disponivel</th>
                  <th className="om-td-right" style={{ width: 112 }}>Custo</th>
                  <th style={{ width: 44 }} />
                </tr>
              </thead>
              <tbody>
                {resolvedComponents.map((component) => (
                  <tr key={component.key}>
                    <td style={{ minWidth: 260 }}>
                      <Select
                        value={component.sku}
                        onChange={(value) => {
                          const item = find(value);
                          setComponent(component.key, { sku: value, unit: item?.unit ?? "" });
                        }}
                        options={componentOptions.map((item) => ({ value: item.sku, label: `${item.name} ${item.variant}` }))}
                      />
                      <div className="cell-sub" style={{ marginTop: 4 }}>
                        <span className="sku">{component.sku}</span> - {BRL(component.item?.costAvg ?? 0)}/{component.stockUnit}
                      </div>
                    </td>
                    <td>
                      <div className="row" style={{ gap: 6 }}>
                        <Input
                          inputMode="decimal"
                          value={component.qty}
                          onChange={(event) => setComponent(component.key, { qty: event.target.value })}
                          style={{ width: 78 }}
                        />
                        <Select
                          value={component.unit}
                          onChange={(value) => setComponent(component.key, { unit: value })}
                          options={component.compatibleUnits.map((unit) => ({ value: unit, label: unit }))}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="row" style={{ gap: 6 }}>
                        <Input
                          inputMode="decimal"
                          value={component.loss}
                          onChange={(event) => setComponent(component.key, { loss: event.target.value })}
                          style={{ width: 58 }}
                        />
                        <span className="muted" style={{ fontSize: 12.5 }}>%</span>
                      </div>
                    </td>
                    <td className="om-td-right">
                      <Badge tone={component.available >= component.baseQty ? "ok" : "warn"}>
                        {component.available} {component.stockUnit}
                      </Badge>
                    </td>
                    <td className="om-td-right" style={{ fontWeight: 650 }}>{BRL(component.cost)}</td>
                    <td className="om-td-right">
                      <button className="wf-handle-btn" onClick={() => removeComponent(component.key)} disabled={components.length === 1}>
                        <Icon name="x" size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Field label={mode === "version" ? "Observacao da nova versao" : "Nota de teste inicial"} style={{ marginTop: 14 }}>
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="O que mudou, precisa testar ou validar?" />
          </Field>

          {error && <div className="ff-error" style={{ marginTop: 10 }}>{error}</div>}
        </div>

        <div>
          <div style={{ border: "1px solid hsl(var(--border))", borderRadius: 10, padding: 14, position: "sticky", top: 0 }}>
            <div className="block-label">Resumo</div>
            <div className="grid cols-2" style={{ gap: 10, marginBottom: 14 }}>
              <Stat label="Componentes" value={resolvedComponents.length} />
              <Stat label="Cura" value={`${Math.max(0, Math.round(parseRecipeNumber(cureDays)))}d`} />
              <Stat label="Rende" value={Math.max(1, Math.round(parseRecipeNumber(yieldQty)))} sub={yieldUnit || "unidade"} />
              <Stat label="Custo/un" value={BRL(total)} tone="info" />
            </div>
            <Sep />
            <div style={{ marginTop: 12 }}>
              <div className="cell-title">{product ? `${product.name} ${product.variant}` : "Produto nao selecionado"}</div>
              <div className="cell-sub">{mode === "version" && baseRecipe ? `Base: ${baseRecipe.version}` : "Rascunho inicial"}</div>
            </div>
            <div className="block-label" style={{ marginTop: 16 }}>Disponibilidade</div>
            {resolvedComponents.map((component) => (
              <div className="row between" key={`${component.key}-availability`} style={{ fontSize: 12.5, marginTop: 7, gap: 10 }}>
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{component.name}</span>
                <Badge tone={component.available >= component.baseQty ? "ok" : "warn"}>{component.available} {component.stockUnit}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function RecipesScreen({ go, route }: { go: Go; route: Route }) {
  const dir = useItemDirectory();
  const [recipes, setRecipes] = React.useState<Recipe[]>([]);
  const [openId, setOpenId] = React.useState<string | null>(route.open ?? null);
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<"todas" | "ativa" | "rascunho">("todas");
  const [view, setView] = useView("receitas", "grid");
  const [recipeForm, setRecipeForm] = React.useState<{
    open: boolean;
    mode: "create" | "version";
    baseRecipe: Recipe | null;
  }>({ open: false, mode: "create", baseRecipe: null });
  const [tests, setTests] = React.useState<RecipeTest[]>([]);
  const [fillTest, setFillTest] = React.useState<RecipeTest | null>(null);
  const [printTest, setPrintTest] = React.useState<RecipeTest | null>(null);

  React.useEffect(() => {
    let alive = true;
    loadRecipes().then((next) => { if (alive) setRecipes(next); }).catch(() => null);
    loadRecipeTests().then((next) => { if (alive) setTests(next); }).catch(() => null);
    return () => { alive = false; };
  }, []);

  React.useEffect(() => { if (route.open) setOpenId(route.open); }, [route.open]);

  React.useEffect(() => {
    if (!printTest) return;
    document.body.dataset.printMode = "recipe-test";
    const clear = () => { delete document.body.dataset.printMode; setPrintTest(null); };
    window.addEventListener("afterprint", clear, { once: true });
    const timer = window.setTimeout(() => window.print(), 80);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", clear);
      delete document.body.dataset.printMode;
    };
  }, [printTest]);

  const saveRecipe = async (recipe: Recipe) => {
    const prevIds = new Set(recipes.map((item) => item.id));
    const next = recipeForm.mode === "version" && recipeForm.baseRecipe
      ? await createRecipeVersion(recipeForm.baseRecipe.id, recipe)
      : await createRecipe(recipe);
    setRecipes(next);
    const created = next.find((item) => !prevIds.has(item.id));
    if (created) setOpenId(created.id);
  };

  const newTest = async (recipe: Recipe) => {
    try {
      setTests(await createRecipeTest(recipe.id));
      toast("Teste criado. Imprima a etiqueta e preencha o protocolo.", "info");
    } catch {
      toast("Não foi possível criar o teste.", "bad");
    }
  };

  const fillTestSubmit = async (criteria: RecipeTestCriterion[], note: string) => {
    if (!fillTest) return;
    setTests(await submitRecipeTest(fillTest.id, criteria, note));
  };

  const approveRecipe = async (recipe: Recipe) => {
    try {
      setRecipes(await setRecipeStatus(recipe.id, "ativa"));
      toast("Versão aprovada e ativada.", "ok");
    } catch {
      toast("Não foi possível aprovar a versão.", "bad");
    }
  };

  const unapproveRecipe = async (recipe: Recipe) => {
    try {
      setRecipes(await setRecipeStatus(recipe.id, "rascunho"));
      toast("Versão voltou para rascunho.", "info");
    } catch {
      toast("Não foi possível alterar a versão.", "bad");
    }
  };

  const testsForOpen = tests.filter((test) => test.recipeVersionId === openId);

  const rows = recipes
    .filter((recipe) => status === "todas" || recipe.status === status)
    .filter((recipe) => !query.trim() || `${recipe.name} ${recipe.productName}`.toLowerCase().includes(query.trim().toLowerCase()));
  const openRecipe = recipes.find((recipe) => recipe.id === openId);

  return (
    <div className="page page--wide fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-h1">Receitas</h1>
          <p className="page-lede">{recipes.length} formulas - custo calculado pelos componentes</p>
        </div>
        <Button variant="default" icon="plus" onClick={() => setRecipeForm({ open: true, mode: "create", baseRecipe: null })}>Nova receita</Button>
      </div>

      <div className="toolbar">
        <Tabs tabs={[
          { value: "todas", label: "Todas", count: recipes.length },
          { value: "ativa", label: "Ativas", count: recipes.filter((recipe) => recipe.status === "ativa").length },
          { value: "rascunho", label: "Rascunhos", count: recipes.filter((recipe) => recipe.status === "rascunho").length },
        ]} value={status} onChange={(value) => setStatus(value as typeof status)} />
        <div style={{ width: 280 }}><Input icon="search" placeholder="Buscar receita ou produto..." value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        <div className="spacer" />
        <ViewToggle value={view} onChange={setView} />
      </div>

      {view === "list" ? (
        <Card style={{ overflow: "hidden" }}>
          <table className="om-table">
            <thead><tr><th>Receita</th><th>Produto</th><th>Versao</th><th>Status</th><th className="om-td-right">Componentes</th><th className="om-td-right">Cura</th><th className="om-td-right">Custo/un</th><th /></tr></thead>
            <tbody>
              {rows.map((recipe) => (
                <tr key={recipe.id} className="om-row-click" onClick={() => setOpenId(recipe.id)}>
                  <td><div className="item-cell"><div className="swatch swatch--kit"><Icon name="receitas" size={15} /></div><div className="cell-title">{recipe.name}</div></div></td>
                  <td className="muted">{recipe.productName}</td>
                  <td><Badge tone="outline">{recipe.version}</Badge></td>
                  <td><Badge tone={recipe.status === "ativa" ? "ok" : "neutral"} dot>{recipe.status}</Badge></td>
                  <td className="om-td-right">{recipe.components.length}</td>
                  <td className="om-td-right muted">{recipe.cureDays}d</td>
                  <td className="om-td-right" style={{ fontWeight: 600 }}>{BRL(recipeCost(recipe, dir.find))}</td>
                  <td className="om-td-right"><Icon name="chevronRight" size={16} className="muted" /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <Empty icon="search" title="Nada encontrado" />}
        </Card>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {rows.map((recipe) => (
            <Card key={recipe.id} className="task" style={{ display: "block", cursor: "pointer" }} onClick={() => setOpenId(recipe.id)}>
              <div className="row between" style={{ marginBottom: 12 }}>
                <div className="chip chip--brand chip--lg"><Icon name="receitas" size={19} /></div>
                <div className="row" style={{ gap: 6 }}><Badge tone={recipe.status === "ativa" ? "ok" : "neutral"} dot>{recipe.status}</Badge><Badge tone="outline">{recipe.version}</Badge></div>
              </div>
              <div style={{ fontWeight: 650, fontSize: 15.5 }}>{recipe.name}</div>
              <div className="muted" style={{ fontSize: 12.5, marginBottom: 12 }}>{recipe.productName}</div>
              <Sep />
              <div className="row between" style={{ marginTop: 12 }}>
                <div><div className="om-stat-label">Custo/un</div><div style={{ fontWeight: 700, fontSize: 17 }}>{BRL(recipeCost(recipe, dir.find))}</div></div>
                <div style={{ textAlign: "right" }}><div className="om-stat-label">Componentes</div><div style={{ fontWeight: 600, fontSize: 14 }}>{recipe.components.length} - cura {recipe.cureDays}d</div></div>
              </div>
            </Card>
          ))}
          {rows.length === 0 && <div style={{ gridColumn: "1 / -1" }}><Empty icon="search" title="Nada encontrado" /></div>}
        </div>
      )}

      {openRecipe && (
        <RecipeDrawer
          recipe={openRecipe}
          tests={testsForOpen}
          find={dir.find}
          go={go}
          onClose={() => setOpenId(null)}
          onVersion={(recipe) => setRecipeForm({ open: true, mode: "version", baseRecipe: recipe })}
          onNewTest={newTest}
          onFillTest={setFillTest}
          onPrintTest={setPrintTest}
          onApprove={approveRecipe}
          onUnapprove={unapproveRecipe}
        />
      )}
      <RecipeTestModal
        open={Boolean(fillTest)}
        test={fillTest}
        onClose={() => setFillTest(null)}
        onSubmit={fillTestSubmit}
      />
      <RecipeFormModal
        open={recipeForm.open}
        mode={recipeForm.mode}
        baseRecipe={recipeForm.baseRecipe}
        materials={dir.materials}
        products={dir.products}
        find={dir.find}
        onClose={() => setRecipeForm((current) => ({ ...current, open: false }))}
        onSave={saveRecipe}
      />
      <RecipeTestLabelDocument test={printTest} />
    </div>
  );
}
