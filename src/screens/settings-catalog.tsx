"use client";

import * as React from "react";
import { Badge, Button, Card, CardContent, Field, Icon, Input, Select, toast } from "@/components/ui";
import {
  createCatalogEntry,
  deleteCatalogEntry,
  loadCatalogSettings,
  renameCatalogEntry,
  type CatalogSettings,
} from "@/lib/catalog-settings-client";

const ERROR_LABELS: Record<string, string> = {
  unit_in_use: "Unidade em uso por itens — não pode ser excluída.",
  unit_protected: "Unidade padrão protegida (conversões) — não pode ser excluída.",
  category_in_use: "Categoria em uso por itens — não pode ser excluída.",
  duplicate: "Já existe um registro com esse código/nome.",
  invalid_code: "Informe o código da unidade.",
  invalid_name: "Informe o nome.",
};

const UNIT_KINDS = [
  { value: "mass", label: "Massa" },
  { value: "volume", label: "Volume" },
  { value: "unit", label: "Unidade" },
  { value: "length", label: "Comprimento" },
];

const CATEGORY_KINDS = [
  { value: "product", label: "Produto" },
  { value: "material", label: "Material" },
  { value: "packaging", label: "Embalagem" },
  { value: "other", label: "Outro" },
];

function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  toast(ERROR_LABELS[code] ?? "Não foi possível concluir a ação.", "bad");
}

export function CatalogTab() {
  const [data, setData] = React.useState<CatalogSettings>({ units: [], categories: [] });
  const [names, setNames] = React.useState<Record<string, string>>({});
  const [unitForm, setUnitForm] = React.useState({ code: "", name: "", kind: "mass" });
  const [catForm, setCatForm] = React.useState({ name: "", kind: "product" });

  const hydrate = React.useCallback((next: CatalogSettings) => {
    setData(next);
    setNames(Object.fromEntries([...next.units, ...next.categories].map((e) => [e.id, e.name])));
  }, []);

  React.useEffect(() => {
    let alive = true;
    loadCatalogSettings().then((next) => { if (alive) hydrate(next); }).catch(() => null);
    return () => { alive = false; };
  }, [hydrate]);

  const rename = async (resource: "unit" | "category", id: string) => {
    const name = (names[id] ?? "").trim();
    if (!name) return;
    try { hydrate(await renameCatalogEntry({ resource, id, name })); toast("Nome atualizado.", "ok"); } catch (e) { failure(e); }
  };
  const remove = async (resource: "unit" | "category", id: string) => {
    try { hydrate(await deleteCatalogEntry(resource, id)); toast("Removido.", "ok"); } catch (e) { failure(e); }
  };
  const addUnit = async () => {
    try { hydrate(await createCatalogEntry({ resource: "unit", code: unitForm.code, name: unitForm.name, kind: unitForm.kind })); setUnitForm({ code: "", name: "", kind: "mass" }); toast("Unidade criada.", "ok"); } catch (e) { failure(e); }
  };
  const addCategory = async () => {
    try { hydrate(await createCatalogEntry({ resource: "category", name: catForm.name, kind: catForm.kind })); setCatForm({ name: "", kind: "product" }); toast("Categoria criada.", "ok"); } catch (e) { failure(e); }
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <Card>
        <CardContent>
          <div className="block-label">Unidades de medida</div>
          <p className="muted" style={{ fontSize: 12.5, marginBottom: 12 }}>O código é a chave técnica (estável); só o nome é editável. Unidades padrão (g, kg, ml, l, un) são protegidas para não quebrar conversões.</p>
          <table className="om-table">
            <thead><tr><th>Código</th><th>Nome</th><th>Tipo</th><th /></tr></thead>
            <tbody>
              {data.units.map((u) => (
                <tr key={u.id}>
                  <td><span className="code-pill">{u.code}</span> {u.protected && <Badge tone="neutral">padrão</Badge>}</td>
                  <td><Input value={names[u.id] ?? ""} onChange={(e) => setNames((n) => ({ ...n, [u.id]: e.target.value }))} onBlur={() => names[u.id] !== u.name && rename("unit", u.id)} style={{ maxWidth: 220 }} /></td>
                  <td className="muted">{u.kind}{u.inUse ? " · em uso" : ""}</td>
                  <td className="om-td-right"><button className="wf-handle-btn" disabled={u.inUse || u.protected} title={u.protected ? "Protegida" : u.inUse ? "Em uso" : "Excluir"} onClick={() => remove("unit", u.id)}><Icon name="x" size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row" style={{ gap: 8, marginTop: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <Field label="Código" style={{ width: 110 }}><Input value={unitForm.code} onChange={(e) => setUnitForm((f) => ({ ...f, code: e.target.value }))} placeholder="kg" /></Field>
            <Field label="Nome" style={{ width: 200 }}><Input value={unitForm.name} onChange={(e) => setUnitForm((f) => ({ ...f, name: e.target.value }))} placeholder="Quilograma" /></Field>
            <Field label="Tipo" style={{ width: 150 }}><Select value={unitForm.kind} onChange={(v) => setUnitForm((f) => ({ ...f, kind: v }))} options={UNIT_KINDS} /></Field>
            <Button icon="plus" onClick={addUnit} disabled={!unitForm.code.trim() || !unitForm.name.trim()}>Adicionar</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="block-label">Categorias</div>
          <p className="muted" style={{ fontSize: 12.5, marginBottom: 12 }}>Agrupe itens por categoria. Categorias em uso por itens não podem ser excluídas.</p>
          <table className="om-table">
            <thead><tr><th>Nome</th><th>Tipo</th><th /></tr></thead>
            <tbody>
              {data.categories.map((c) => (
                <tr key={c.id}>
                  <td><Input value={names[c.id] ?? ""} onChange={(e) => setNames((n) => ({ ...n, [c.id]: e.target.value }))} onBlur={() => names[c.id] !== c.name && rename("category", c.id)} style={{ maxWidth: 260 }} /></td>
                  <td className="muted">{c.kind}{c.inUse ? " · em uso" : ""}</td>
                  <td className="om-td-right"><button className="wf-handle-btn" disabled={c.inUse} title={c.inUse ? "Em uso" : "Excluir"} onClick={() => remove("category", c.id)}><Icon name="x" size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row" style={{ gap: 8, marginTop: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <Field label="Nome" style={{ width: 240 }}><Input value={catForm.name} onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))} placeholder="Velas aromáticas" /></Field>
            <Field label="Tipo" style={{ width: 160 }}><Select value={catForm.kind} onChange={(v) => setCatForm((f) => ({ ...f, kind: v }))} options={CATEGORY_KINDS} /></Field>
            <Button icon="plus" onClick={addCategory} disabled={!catForm.name.trim()}>Adicionar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
