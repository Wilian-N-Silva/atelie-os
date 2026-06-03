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
  Sep,
  Stat,
  Tabs,
  Textarea,
  ViewToggle,
  toast,
  useView,
} from "@/components/ui";
import { BRL, DEMO_RECIPES, findDemoItem, productOptions, type DemoRecipe } from "@/lib/screen-fixtures";
import type { Go, Route } from "@/lib/types";

function recipeCost(recipe: DemoRecipe) {
  return recipe.components.reduce((sum, component) => {
    const item = findDemoItem(component.sku);
    return sum + (item?.costAvg ?? 0) * component.qty * (1 + component.loss / 100);
  }, 0);
}

function RecipeDrawer({ recipe, go, onClose }: { recipe: DemoRecipe; go: Go; onClose: () => void }) {
  const components = recipe.components.map((component) => {
    const item = findDemoItem(component.sku);
    const cost = (item?.costAvg ?? 0) * component.qty * (1 + component.loss / 100);
    return { ...component, cost, available: item?.available ?? 0 };
  });
  const total = recipeCost(recipe);

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
              {components.map((component) => (
                <tr key={component.sku}>
                  <td><div className="cell-title">{component.name}</div><div className="cell-sub sku">{component.sku} - {component.available} disp.</div></td>
                  <td className="om-td-right">{component.qty} {component.unit}</td>
                  <td className="om-td-right muted">{component.loss}%</td>
                  <td className="om-td-right" style={{ fontWeight: 550 }}>{BRL(component.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="block-label" style={{ marginTop: 20 }}>Testes de receita</div>
          {recipe.tests.length === 0 && <Empty icon="beaker" title="Sem testes ainda" hint="Registre aroma, queima e acabamento a cada teste." />}
          {recipe.tests.map((test) => (
            <div key={`${test.date}-${test.note}`} style={{ border: "1px solid hsl(var(--border))", borderRadius: 10, padding: 13, marginBottom: 10 }}>
              <div className="row between" style={{ marginBottom: 8 }}>
                <Badge tone={test.result === "aprovado" ? "ok" : test.result === "reprovado" ? "bad" : "warn"} dot>{test.result}</Badge>
                <span className="muted" style={{ fontSize: 12.5 }}>{test.date} - {test.qty} un</span>
              </div>
              <div style={{ fontSize: 12.5, color: "hsl(var(--muted-foreground))", lineHeight: 1.5 }}>{test.note}</div>
            </div>
          ))}
        </div>

        <div className="drawer-foot">
          <Button variant="default" icon="producao" style={{ flex: 1 }} onClick={() => go("producao")}>Produzir com esta receita</Button>
          <Button variant="outline" icon="copy" onClick={() => toast("Nova versao criada como rascunho.", "info")}>Nova versao</Button>
        </div>
      </aside>
    </>
  );
}

function NewRecipeModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (recipe: DemoRecipe) => void }) {
  const idPrefix = React.useId();
  const nextId = React.useRef(0);
  const products = productOptions();
  const [name, setName] = React.useState("Nova receita");
  const [productSku, setProductSku] = React.useState(products[0]?.sku ?? "");
  const [note, setNote] = React.useState("");

  const submit = () => {
    const product = products.find((item) => item.sku === productSku) ?? products[0];
    const next = nextId.current++;
    onCreate({
      id: `${idPrefix}-${next}`,
      name: name.trim() || "Nova receita",
      product: product.sku,
      productName: `${product.name} ${product.variant}`,
      version: "v1",
      status: "rascunho",
      yield: 1,
      yieldUnit: "unidade",
      cureDays: 14,
      components: [
        { sku: "CER-SOJ-01", name: "Cera de Soja Ecosoya", qty: 0.142, unit: "kg", loss: 3 },
        { sku: "VID-NAD-156", name: "Vidro Nadir 156ml", qty: 1, unit: "un", loss: 1 },
      ],
      tests: note.trim() ? [{ date: "hoje", qty: 1, result: "ajustar", note: note.trim() }] : [],
    });
    toast("Receita criada como rascunho nesta sessao.", "info");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} icon="receitas" title="Nova receita" subtitle="Rascunho local para planejar a formula" width={540}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><div className="spacer" style={{ flex: 1 }} /><Button variant="default" icon="plus" onClick={submit}>Criar receita</Button></>}>
      <Field label="Nome"><Input value={name} onChange={(event) => setName(event.target.value)} /></Field>
      <Field label="Produto"><Select value={productSku} onChange={setProductSku} options={products.map((item) => ({ value: item.sku, label: `${item.name} ${item.variant}` }))} /></Field>
      <Field label="Nota de teste inicial"><Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="O que precisa testar ou ajustar?" /></Field>
    </Modal>
  );
}

export function RecipesScreen({ go, route }: { go: Go; route: Route }) {
  const [recipes, setRecipes] = React.useState<DemoRecipe[]>(() => [...DEMO_RECIPES]);
  const [openId, setOpenId] = React.useState<string | null>(route.open ?? null);
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<"todas" | "ativa" | "rascunho">("todas");
  const [view, setView] = useView("receitas", "grid");
  const [newOpen, setNewOpen] = React.useState(false);

  React.useEffect(() => { if (route.open) setOpenId(route.open); }, [route.open]);

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
        <Button variant="default" icon="plus" onClick={() => setNewOpen(true)}>Nova receita</Button>
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
                  <td className="om-td-right" style={{ fontWeight: 600 }}>{BRL(recipeCost(recipe))}</td>
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
                <div><div className="om-stat-label">Custo/un</div><div style={{ fontWeight: 700, fontSize: 17 }}>{BRL(recipeCost(recipe))}</div></div>
                <div style={{ textAlign: "right" }}><div className="om-stat-label">Componentes</div><div style={{ fontWeight: 600, fontSize: 14 }}>{recipe.components.length} - cura {recipe.cureDays}d</div></div>
              </div>
            </Card>
          ))}
          {rows.length === 0 && <div style={{ gridColumn: "1 / -1" }}><Empty icon="search" title="Nada encontrado" /></div>}
        </div>
      )}

      {openRecipe && <RecipeDrawer recipe={openRecipe} go={go} onClose={() => setOpenId(null)} />}
      <NewRecipeModal open={newOpen} onClose={() => setNewOpen(false)} onCreate={(recipe) => setRecipes((current) => [recipe, ...current])} />
    </div>
  );
}
