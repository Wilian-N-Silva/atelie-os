/* ============================================================
   screen_receitas.jsx — Receitas / Fórmulas: list + detail
   ============================================================ */
function ReceitaDetail({ recipe, go, onClose }) {
  const { findItem, BRL, num } = window.DB;
  if (!recipe) return null;
  const comps = recipe.components.map(c => {
    const it = findItem(c.sku);
    const lineCost = it ? it.costAvg * c.qty * (1 + c.loss / 100) : 0;
    return { ...c, cost: lineCost, available: it ? it.available : 0 };
  });
  const total = comps.reduce((s, c) => s + c.cost, 0);

  return (
    <React.Fragment>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" style={{ width: 560 }}>
        <div className="drawer-head">
          <div className="chip chip--brand chip--lg"><Icon name="receitas" size={20} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="drawer-h1">{recipe.name}</div>
            <div className="row" style={{ gap: 8, marginTop: 4 }}>
              <Badge tone={recipe.status === 'ativa' ? 'ok' : 'neutral'} dot>{recipe.status}</Badge>
              <Badge tone="outline">{recipe.version}</Badge>
              <span className="muted" style={{ fontSize: 13 }}>{recipe.productName}</span>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>

        <div className="drawer-body">
          <div className="grid cols-3" style={{ gap: 10, marginBottom: 18 }}>
            <Card><CardContent style={{ padding: 13, textAlign: 'center' }}><Stat label="Rende" value={`${recipe.yield}`} sub={recipe.yieldUnit} /></CardContent></Card>
            <Card><CardContent style={{ padding: 13, textAlign: 'center' }}><Stat label="Cura" value={`${recipe.cureDays}d`} /></CardContent></Card>
            <Card><CardContent style={{ padding: 13, textAlign: 'center' }}><Stat label="Custo/un" value={BRL(total)} tone="info" /></CardContent></Card>
          </div>

          <div className="block-label">Componentes</div>
          <table className="om-table" style={{ marginBottom: 18 }}>
            <thead><tr><th>Item</th><th className="om-td-right">Qtd</th><th className="om-td-right">Perda</th><th className="om-td-right">Custo</th></tr></thead>
            <tbody>
              {comps.map(c => (
                <tr key={c.sku}>
                  <td><div className="cell-title">{c.name}</div><div className="cell-sub sku">{c.sku} · {num(c.available, c.available % 1 ? 1 : 0)} disp.</div></td>
                  <td className="om-td-right">{num(c.qty, c.qty % 1 ? (c.qty < 1 ? 3 : 2) : 0)} {c.unit}</td>
                  <td className="om-td-right muted">{c.loss}%</td>
                  <td className="om-td-right" style={{ fontWeight: 550 }}>{BRL(c.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="field" style={{ fontSize: 15 }}><span style={{ fontWeight: 600 }}>Custo estimado por unidade</span><span style={{ fontWeight: 700 }}>{BRL(total)}</span></div>

          {/* tests */}
          <div className="block-label" style={{ marginTop: 20 }}>Testes de receita</div>
          {recipe.tests.length === 0 && <Empty icon="beaker" title="Sem testes ainda" hint="Registre aroma, queima e acabamento a cada teste." />}
          {recipe.tests.map((t, i) => {
            const tone = t.result === 'aprovado' ? 'ok' : t.result === 'reprovado' ? 'bad' : 'warn';
            return (
              <div key={i} style={{ border: '1px solid hsl(var(--border))', borderRadius: 10, padding: 13, marginBottom: 10 }}>
                <div className="row between" style={{ marginBottom: 8 }}>
                  <span className="row" style={{ gap: 8 }}><Badge tone={tone} dot>{t.result}</Badge><span className="muted" style={{ fontSize: 12.5 }}>{t.date} · {t.qty} un</span></span>
                </div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12.5 }}>
                  <div><span className="muted">Aroma:</span> {t.scent}</div>
                  <div><span className="muted">Queima:</span> {t.burn}</div>
                  <div><span className="muted">Acabamento:</span> {t.finish}</div>
                  <div><span className="muted">Próximo:</span> {t.next}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="drawer-foot">
          <Button variant="default" icon="producao" style={{ flex: 1 }} onClick={() => go('producao')}>Produzir com esta receita</Button>
          <Button variant="outline" icon="copy">Nova versão</Button>
        </div>
      </aside>
    </React.Fragment>
  );
}

function Receitas({ go, route }) {
  const { recipes, findItem, BRL } = window.DB;
  const [openId, setOpenId] = React.useState(route.open || null);
  const [q, setQ] = React.useState('');
  const [view, setView] = useView('receitas', 'grid');
  const [novo, setNovo] = React.useState(false);
  const [, bump] = React.useState(0);
  React.useEffect(() => { if (route.open) setOpenId(route.open); }, [route]);
  const open = recipes.find(r => r.id === openId);
  const costOf = (r) => r.components.reduce((s, c) => { const it = findItem(c.sku); return s + (it ? it.costAvg * c.qty * (1 + c.loss / 100) : 0); }, 0);
  const rows = recipes.filter(r => !q || (r.name + r.productName).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="page page--wide fade-in">
      <div className="page-head">
        <div><h1 className="page-h1">Receitas</h1><p className="page-lede">{recipes.length} fórmulas · custo calculado a partir dos componentes</p></div>
        <Button variant="default" icon="plus" onClick={() => setNovo(true)}>Nova receita</Button>
      </div>

      <div className="toolbar">
        <div style={{ width: 280 }}><Input icon="search" placeholder="Buscar receita ou produto…" value={q} onChange={e => setQ(e.target.value)} /></div>
        <div className="spacer" />
        <ViewToggle value={view} onChange={setView} />
      </div>

      {view === 'list' ? (
        <Card style={{ overflow: 'hidden' }}>
          <table className="om-table">
            <thead><tr><th>Receita</th><th>Produto</th><th>Versão</th><th>Status</th><th className="om-td-right">Componentes</th><th className="om-td-right">Cura</th><th className="om-td-right">Custo / un</th><th></th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="om-row-click" onClick={() => setOpenId(r.id)}>
                  <td><div className="item-cell"><div className="swatch swatch--kit" style={{ background: 'hsl(var(--secondary))', color: 'hsl(var(--foreground))' }}><Icon name="receitas" size={15} /></div><div className="cell-title">{r.name}</div></div></td>
                  <td className="muted">{r.productName}</td>
                  <td><Badge tone="outline">{r.version}</Badge></td>
                  <td><Badge tone={r.status === 'ativa' ? 'ok' : 'neutral'} dot>{r.status}</Badge></td>
                  <td className="om-td-right">{r.components.length}</td>
                  <td className="om-td-right muted">{r.cureDays}d</td>
                  <td className="om-td-right" style={{ fontWeight: 600 }}>{BRL(costOf(r))}</td>
                  <td className="om-td-right"><Icon name="chevronRight" size={16} className="muted" /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <Empty icon="search" title="Nada encontrado" />}
        </Card>
      ) : (
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {rows.map(r => {
          const total = costOf(r);
          return (
            <Card key={r.id} className="task" style={{ display: 'block', cursor: 'pointer' }} onClick={() => setOpenId(r.id)}>
              <div className="row between" style={{ marginBottom: 12 }}>
                <div className="chip chip--brand chip--lg"><Icon name="receitas" size={19} /></div>
                <div className="row" style={{ gap: 6 }}>
                  <Badge tone={r.status === 'ativa' ? 'ok' : 'neutral'} dot>{r.status}</Badge>
                  <Badge tone="outline">{r.version}</Badge>
                </div>
              </div>
              <div style={{ fontWeight: 650, fontSize: 15.5, letterSpacing: '-0.01em' }}>{r.name}</div>
              <div className="muted" style={{ fontSize: 12.5, marginBottom: 12 }}>{r.productName}</div>
              <Sep />
              <div className="row between" style={{ marginTop: 12 }}>
                <div><div className="om-stat-label">Custo / un</div><div style={{ fontWeight: 700, fontSize: 17, whiteSpace: 'nowrap' }}>{BRL(total)}</div></div>
                <div style={{ textAlign: 'right' }}><div className="om-stat-label">Componentes</div><div style={{ fontWeight: 600, fontSize: 14 }}>{r.components.length} · cura {r.cureDays}d</div></div>
              </div>
            </Card>
          );
        })}
        {rows.length === 0 && <div style={{ gridColumn: '1 / -1' }}><Empty icon="search" title="Nada encontrado" /></div>}
      </div>
      )}

      {open && <ReceitaDetail recipe={open} go={go} onClose={() => setOpenId(null)} />}
      <NovaReceitaModal open={novo} onClose={() => setNovo(false)} onCreate={(r) => { recipes.unshift(r); bump(n => n + 1); }} />
    </div>
  );
}
window.Receitas = Receitas;
