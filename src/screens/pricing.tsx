"use client";

import * as React from "react";
import {
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Icon,
  Input,
  Select,
  Stat,
  toast,
} from "@/components/ui";
import { BRL } from "@/lib/domain";
import { computePricing } from "@/lib/pricing";
import { loadPricing, loadPriceHistory, savePricing, savePricingSettings, type PriceHistoryEntry, type PricingProduct } from "@/lib/pricing-client";
import type { Go, Route } from "@/lib/types";

function parseMoney(value: string) {
  const parsed = Number(value.replace(/\s/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function pct(fraction: number | null) {
  if (fraction == null) return "-";
  return `${Math.round(fraction * 100)}%`;
}

function PricingDrawer({ product, go, onClose, onSaved }: {
  product: PricingProduct;
  go: Go;
  onClose: () => void;
  onSaved: (next: PricingProduct[]) => void;
}) {
  const [minMargin, setMinMargin] = React.useState(String(Math.round(product.config.minMargin * 100)));
  const [labor, setLabor] = React.useState(product.config.laborCost ? String(product.config.laborCost) : "");
  const [laborMinutes, setLaborMinutes] = React.useState(product.config.laborMinutes ? String(product.config.laborMinutes) : "");
  const [laborHourlyRate, setLaborHourlyRate] = React.useState(product.config.laborHourlyRate != null ? String(product.config.laborHourlyRate) : "");
  const [extra, setExtra] = React.useState(product.config.extraCost ? String(product.config.extraCost) : "");
  const [practiced, setPracticed] = React.useState(product.currentPrice ? String(product.currentPrice).replace(".", ",") : "");
  const [channelKey, setChannelKey] = React.useState(product.config.channelKey);
  const [history, setHistory] = React.useState<PriceHistoryEntry[]>([]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    loadPriceHistory(product.itemId).then((rows) => { if (alive) setHistory(rows); }).catch(() => null);
    return () => { alive = false; };
  }, [product.itemId]);

  const effectiveHourlyRate = laborHourlyRate.trim() ? parseMoney(laborHourlyRate) : product.settings.laborDefaults.hourlyRate;
  const timeLaborCost = parseMoney(laborMinutes) > 0 && effectiveHourlyRate > 0 ? (parseMoney(laborMinutes) / 60) * effectiveHourlyRate : 0;
  const totalLaborCost = Math.round((parseMoney(labor) + timeLaborCost) * 100) / 100;
  const channelFee = product.settings.channelFeeRules.find((rule) => rule.key === channelKey)?.feePct ?? 0;

  const sim = computePricing({
    recipeCost: product.recipeCost,
    averageCost: product.averageCost,
    estimatedCost: product.estimatedCost,
    laborCost: totalLaborCost,
    extraCost: parseMoney(extra),
    minMargin: (Number(minMargin) || 0) / 100,
    channelFee,
    practicedPrice: parseMoney(practiced),
  });

  const save = async () => {
    setSaving(true);
    try {
      const next = await savePricing({
        itemId: product.itemId,
        practicedPrice: parseMoney(practiced),
        minMargin: (Number(minMargin) || 0) / 100,
        laborCost: parseMoney(labor),
        laborMinutes: parseMoney(laborMinutes),
        laborHourlyRate: laborHourlyRate.trim() ? parseMoney(laborHourlyRate) : null,
        extraCost: parseMoney(extra),
        channelKey,
      });
      onSaved(next);
      setHistory(await loadPriceHistory(product.itemId));
      toast("Preço salvo.", "ok");
    } catch {
      toast("Não foi possível salvar o preço.", "bad");
    } finally {
      setSaving(false);
    }
  };

  const costSource = product.averageCost != null ? "custo médio real" : product.recipeCost != null ? "receita ativa" : product.estimatedCost != null ? "custo estimado" : "sem custo";

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" style={{ width: 560 }}>
        <div className="drawer-head">
          <div className="chip chip--brand chip--lg"><Icon name="tag" size={20} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="drawer-h1">{product.name} {product.variant ?? ""}</div>
            <div className="muted" style={{ fontSize: 13 }}>{product.sku} · base por {costSource}</div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>

        <div className="drawer-body">
          <div className="grid cols-3" style={{ gap: 10, marginBottom: 16 }}>
            <Card><div style={{ padding: 13, textAlign: "center" }}><Stat label="Custo total" value={BRL(sim.totalCost)} /></div></Card>
            <Card><div style={{ padding: 13, textAlign: "center" }}><Stat label="Preço sugerido" value={sim.suggestedPrice == null ? "-" : BRL(sim.suggestedPrice)} tone="info" /></div></Card>
            <Card><div style={{ padding: 13, textAlign: "center" }}><Stat label="Margem atual" value={pct(sim.currentMargin)} tone={sim.belowMin ? "bad" : "ok"} /></div></Card>
          </div>

          {sim.belowMin && (
            <div className="rt-hint" style={{ marginBottom: 14 }}>
              <Icon name="alertCircle" size={15} /> Preço praticado abaixo da margem mínima ({minMargin}%). Sugerido: {sim.suggestedPrice == null ? "-" : BRL(sim.suggestedPrice)}.
            </div>
          )}

          <div className="block-label">Composição do custo</div>
          <table className="om-table" style={{ marginBottom: 18 }}>
            <tbody>
              <tr><td>Receita ativa (materiais + embalagem)</td><td className="om-td-right">{product.recipeCost == null ? "-" : BRL(product.recipeCost)}</td></tr>
              <tr><td>Custo médio real</td><td className="om-td-right">{product.averageCost == null ? "-" : BRL(product.averageCost)}</td></tr>
              <tr><td>Mão de obra fixa</td><td className="om-td-right">{BRL(parseMoney(labor))}</td></tr>
              <tr><td>Mão de obra por tempo</td><td className="om-td-right">{BRL(timeLaborCost)}</td></tr>
              <tr><td>Taxa de canal</td><td className="om-td-right">{Math.round(channelFee * 100)}%</td></tr>
              <tr><td>Outros custos</td><td className="om-td-right">{BRL(parseMoney(extra))}</td></tr>
              <tr style={{ fontWeight: 700 }}><td>Custo total</td><td className="om-td-right">{BRL(sim.totalCost)}</td></tr>
            </tbody>
          </table>

          <div className="ff-grid">
            <Field label="Margem mínima (%)"><Input inputMode="numeric" value={minMargin} onChange={(e) => setMinMargin(e.target.value.replace(/\D/g, ""))} /></Field>
            <Field label="Canal"><Select value={channelKey} onChange={setChannelKey} options={product.settings.channelFeeRules.map((rule) => ({ value: rule.key, label: `${rule.label} (${Math.round(rule.feePct * 100)}%)` }))} /></Field>
            <Field label="Mão de obra fixa (R$)"><Input inputMode="decimal" value={labor} onChange={(e) => setLabor(e.target.value)} placeholder="0,00" /></Field>
            <Field label="Tempo de mão de obra (min)"><Input inputMode="decimal" value={laborMinutes} onChange={(e) => setLaborMinutes(e.target.value)} placeholder="0" /></Field>
            <Field label="Valor/hora customizado"><Input inputMode="decimal" value={laborHourlyRate} onChange={(e) => setLaborHourlyRate(e.target.value)} placeholder={product.settings.laborDefaults.hourlyRate ? String(product.settings.laborDefaults.hourlyRate) : "0,00"} /></Field>
            <Field label="Outros custos (R$)"><Input inputMode="decimal" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="0,00" /></Field>
          </div>

          <Field label="Preço praticado (R$)" style={{ marginTop: 6 }}>
            <Input inputMode="decimal" value={practiced} onChange={(e) => setPracticed(e.target.value)} placeholder="0,00" />
          </Field>
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <Button variant="outline" size="sm" icon="check" disabled={sim.suggestedPrice == null} onClick={() => sim.suggestedPrice != null && setPracticed(String(sim.suggestedPrice).replace(".", ","))}>Usar sugerido</Button>
          </div>

          <div className="block-label" style={{ marginTop: 20 }}>Histórico de preço</div>
          {history.length === 0 && <Empty icon="fileText" title="Sem alterações" hint="As mudanças de preço aparecem aqui." />}
          {history.slice().reverse().map((entry, index) => (
            <div key={index} className="row between" style={{ fontSize: 13, padding: "7px 0", borderBottom: "1px solid hsl(var(--border))" }}>
              <span>{entry.at ? new Date(entry.at).toLocaleDateString("pt-BR") : "-"}</span>
              <span>{entry.previousPrice != null ? `${BRL(entry.previousPrice)} → ` : ""}<strong>{BRL(entry.price)}</strong>{entry.marginPct != null ? ` · ${Math.round(entry.marginPct)}%` : ""}</span>
            </div>
          ))}
        </div>

        <div className="drawer-foot">
          <Button variant="default" icon="check" style={{ flex: 1 }} disabled={saving} onClick={save}>Salvar preço</Button>
          <Button variant="outline" icon="receitas" onClick={() => go("receitas")}>Ver receita</Button>
        </div>
      </aside>
    </>
  );
}

export function PricingScreen({ go }: { go: Go; route: Route }) {
  const [products, setProducts] = React.useState<PricingProduct[]>([]);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [savingSettings, setSavingSettings] = React.useState(false);
  const settings = products[0]?.settings;

  React.useEffect(() => {
    let alive = true;
    loadPricing().then((next) => { if (alive) setProducts(next); }).catch(() => null);
    return () => { alive = false; };
  }, []);

  const rows = products.filter((p) => !query.trim() || `${p.name} ${p.variant ?? ""} ${p.sku}`.toLowerCase().includes(query.trim().toLowerCase()));
  const open = products.find((p) => p.itemId === openId) ?? null;

  const updateChannelRule = (key: string, patch: Partial<{ label: string; feePct: number }>) => {
    if (!settings) return;
    setProducts((current) => current.map((product) => ({
      ...product,
      settings: {
        ...product.settings,
        channelFeeRules: product.settings.channelFeeRules.map((rule) => rule.key === key ? { ...rule, ...patch } : rule),
      },
    })));
  };
  const addChannelRule = () => {
    const key = `canal-${Date.now()}`;
    setProducts((current) => current.map((product) => ({
      ...product,
      settings: {
        ...product.settings,
        channelFeeRules: [...product.settings.channelFeeRules, { key, label: "Novo canal", feePct: 0 }],
      },
    })));
  };
  const updateDefaultHourlyRate = (value: string) => {
    setProducts((current) => current.map((product) => ({
      ...product,
      settings: {
        ...product.settings,
        laborDefaults: { hourlyRate: parseMoney(value) },
      },
    })));
  };
  const persistSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    try {
      const next = await savePricingSettings(settings);
      setProducts(next);
      toast("Regras de precificação salvas.", "ok");
    } catch {
      toast("Não foi possível salvar as regras de precificação.", "bad");
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="page page--wide fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-h1">Precificação</h1>
          <p className="page-lede">{products.length} produtos vendáveis · custo, margem e preço sugerido</p>
        </div>
      </div>

      <div className="toolbar">
        <div style={{ width: 280 }}><Input icon="search" placeholder="Buscar produto..." value={query} onChange={(e) => setQuery(e.target.value)} /></div>
      </div>

      {settings && (
        <Card style={{ marginBottom: 14 }}>
          <div style={{ padding: 14 }}>
            <div className="row between" style={{ marginBottom: 12, gap: 12 }}>
              <div>
                <div className="block-label" style={{ margin: 0 }}>Regras de margem por canal</div>
                <div className="section-hint" style={{ marginTop: 2 }}>Taxas salvas entram no preço sugerido e no histórico.</div>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <Button variant="outline" icon="plus" onClick={addChannelRule}>Canal</Button>
                <Button variant="default" icon="check" disabled={savingSettings} onClick={persistSettings}>Salvar regras</Button>
              </div>
            </div>
            <div className="grid cols-4" style={{ gap: 10, alignItems: "end" }}>
              <Field label="Valor/hora padrão">
                <Input
                  inputMode="decimal"
                  value={settings.laborDefaults.hourlyRate ? String(settings.laborDefaults.hourlyRate).replace(".", ",") : ""}
                  onChange={(event) => updateDefaultHourlyRate(event.target.value)}
                  placeholder="0,00"
                />
              </Field>
              {settings.channelFeeRules.map((rule) => (
                <React.Fragment key={rule.key}>
                  <Field label="Canal">
                    <Input value={rule.label} onChange={(event) => updateChannelRule(rule.key, { label: event.target.value })} />
                  </Field>
                  <Field label="Taxa (%)">
                    <Input inputMode="decimal" value={String(Math.round(rule.feePct * 100))} onChange={(event) => updateChannelRule(rule.key, { feePct: (Number(event.target.value.replace(/\D/g, "")) || 0) / 100 })} />
                  </Field>
                </React.Fragment>
              ))}
            </div>
          </div>
        </Card>
      )}

      <Card style={{ overflow: "hidden" }}>
        <table className="om-table">
          <thead>
            <tr>
              <th>Produto</th>
              <th className="om-td-right">Custo total</th>
              <th className="om-td-right">Sugerido</th>
              <th className="om-td-right">Praticado</th>
              <th className="om-td-right">Margem</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.itemId} className="om-row-click" onClick={() => setOpenId(p.itemId)}>
                <td><div className="cell-title">{p.name} {p.variant ?? ""}</div><div className="cell-sub sku">{p.sku}</div></td>
                <td className="om-td-right">{BRL(p.totalCost)}</td>
                <td className="om-td-right">{p.suggestedPrice == null ? "-" : BRL(p.suggestedPrice)}</td>
                <td className="om-td-right" style={{ fontWeight: 600 }}>{p.practicedPrice == null ? "-" : BRL(p.practicedPrice)}</td>
                <td className="om-td-right">
                  {p.currentMargin == null ? <span className="muted">-</span> : <Badge tone={p.belowMin ? "bad" : "ok"}>{pct(p.currentMargin)}</Badge>}
                </td>
                <td className="om-td-right"><Icon name="chevronRight" size={16} className="muted" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <Empty icon="tag" title="Nenhum produto vendável" hint="Marque itens como vendáveis e crie receitas para calcular custo." />}
      </Card>

      {open && (
        <PricingDrawer
          product={open}
          go={go}
          onClose={() => setOpenId(null)}
          onSaved={setProducts}
        />
      )}
    </div>
  );
}
