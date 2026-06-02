/* ============================================================
   screen_producao.jsx — Produção: kanban + OP detail drawer
   ============================================================ */
const PROD_COL_ICONS = { aguardando_materiais: 'box', em_producao: 'producao', em_cura: 'thermometer', aguardando_revisao: 'listChecks', liberada: 'checkCircle', finalizada: 'check' };
const iconForStep = (k) => PROD_COL_ICONS[k] || 'producao';

function OPDrawer({ op, go, onClose, stepMeta }) {
  const { recipes, findItem, PROD_STATUS, num, BRL } = window.DB;
  if (!op) return null;
  const st = stepMeta || PROD_STATUS[op.status];
  const recipe = recipes.find(r => r.product === op.product);
  const reqs = recipe ? recipe.components.map(c => {
    const need = +(c.qty * op.planned * (1 + c.loss / 100)).toFixed(2);
    const it = findItem(c.sku);
    return { ...c, need, have: it ? it.available : 0, short: it ? it.available < need : false };
  }) : [];
  const anyShort = reqs.some(r => r.short);

  return (
    <React.Fragment>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer-head">
          <div className={cn('chip', 'chip--lg', `chip--${st.tone}`)}><Icon name="producao" size={20} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="drawer-h1">{op.num} · {op.productName}</div>
            <div className="row" style={{ gap: 8, marginTop: 4 }}>
              <Badge tone={st.tone} dot>{st.label}</Badge>
              <span className="code-pill">{op.code}</span>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>

        <div className="drawer-body">
          <div className="grid cols-2" style={{ gap: 12, marginBottom: 18 }}>
            <Card><CardContent style={{ padding: 14 }}><Stat label="Planejado" value={`${op.planned} un`} /></CardContent></Card>
            <Card><CardContent style={{ padding: 14 }}><Stat label="Receita" value={`${recipe ? recipe.name : '—'}`} sub={op.recipeVer} /></CardContent></Card>
          </div>

          {op.status === 'em_cura' && (
            <div style={{ background: 'hsl(var(--cure-bg))', color: 'hsl(var(--cure))', padding: '12px 14px', borderRadius: 10, marginBottom: 18 }}>
              <div className="row" style={{ gap: 8, fontWeight: 600, fontSize: 13 }}><Icon name="thermometer" size={16} /> Em cura · lote {op.lot}</div>
              <div style={{ fontSize: 12.5, marginTop: 4 }}>Liberação prevista para {op.cureUntil} · faltam {op.cureDayLeft} dias</div>
            </div>
          )}
          {op.status === 'aguardando_revisao' && (
            <div style={{ background: 'hsl(var(--warn-bg))', color: 'hsl(var(--warn))', padding: '12px 14px', borderRadius: 10, marginBottom: 18 }}>
              <div className="row" style={{ gap: 8, fontWeight: 600, fontSize: 13 }}><Icon name="listChecks" size={16} /> Cura concluída — pronta para revisão</div>
              <div style={{ fontSize: 12.5, marginTop: 4 }}>Confira aparência, aroma e acabamento, depois libere o lote {op.lot}.</div>
            </div>
          )}

          <div className="block-label">Materiais necessários {anyShort && <Badge tone="bad">faltante</Badge>}</div>
          <table className="minitable" style={{ marginBottom: 18 }}>
            <tbody>
              {reqs.map(r => (
                <tr key={r.sku}>
                  <td><div style={{ fontWeight: 550 }}>{r.name}</div><div className="cell-sub sku">{r.sku}</div></td>
                  <td className="r muted">{num(r.need, 2)} {r.unit}</td>
                  <td className="r">{r.short
                    ? <Badge tone="bad">só {num(r.have, 2)}</Badge>
                    : <Badge tone="ok" dot>ok</Badge>}</td>
                </tr>
              ))}
              {reqs.length === 0 && <tr><td className="muted">Sem receita vinculada.</td></tr>}
            </tbody>
          </table>

          <div className="field"><span className="field-k">Responsável</span><span className="field-v">{op.resp}</span></div>
          <div className="field"><span className="field-k">Data planejada</span><span className="field-v">{op.date}</span></div>
          <div className="field"><span className="field-k">Custo estimado</span><span className="field-v">{recipe ? BRL(recipe.cost * op.planned) : '—'}</span></div>
        </div>

        <div className="drawer-foot">
          {op.status === 'aguardando_materiais' && <Button variant="default" icon="scan" style={{ flex: 1 }} onClick={() => go('operacao', { mode: 'separacao' })}>Separar materiais</Button>}
          {op.status === 'em_producao' && <Button variant="default" icon="check" style={{ flex: 1 }}>Finalizar produção</Button>}
          {op.status === 'em_cura' && <Button variant="outline" icon="clock" style={{ flex: 1 }}>Estender cura</Button>}
          {op.status === 'aguardando_revisao' && <Button variant="brand" icon="unlock" style={{ flex: 1 }}>Liberar lote</Button>}
          {op.status === 'liberada' && <Button variant="outline" icon="checkCircle" style={{ flex: 1 }} disabled>Lote liberado</Button>}
          <Button variant="outline" icon="printer" onClick={() => window.AteliePrint.pickListProduction(op)}>Pick list</Button>
        </div>
      </aside>
    </React.Fragment>
  );
}

function Producao({ go, route, workflow }) {
  const { production, PROD_STATUS, recipes, findItem, num } = window.DB;
  const [openId, setOpenId] = React.useState(null);
  const [novo, setNovo] = React.useState(false);
  const [, bump] = React.useState(0);
  const op = production.find(p => p.id === openId);

  // columns come from the active workflow (white-label) — mapped by technical_key
  const steps = (workflow && workflow.length) ? workflow : window.DB.workflowPresets.production[0].steps;
  const PROD_COLS = steps.filter(s => !s.is_archived).map(s => ({ key: s.key, label: s.label, tone: s.color || 'neutral', icon: iconForStep(s.key) }));

  const aguard = production.filter(p => p.status === 'aguardando_materiais');

  return (
    <div className="page page--wide fade-in">
      <div className="page-head">
        <div><h1 className="page-h1">Produção</h1><p className="page-lede">{production.length} ordens · fluxo configurável em Configurações → Fluxos e Kanban</p></div>
        <div className="row-wrap">
          <Button variant="outline" icon="fileText" onClick={() => window.AteliePrint.pickListProductionBatch(production.filter(p => p.status === 'aguardando_materiais'))}>Pick list de produção</Button>
          <Button variant="default" icon="plus" onClick={() => setNovo(true)}>Planejar produção</Button>
        </div>
      </div>

      <div className="kanban">
        {PROD_COLS.map(col => {
          const cards = production.filter(p => p.status === col.key);
          return (
            <div className="kcol" key={col.key}>
              <div className="kcol-head">
                <div className={cn('chip', `chip--${col.tone}`)} style={{ width: 26, height: 26, borderRadius: 7 }}><Icon name={col.icon} size={14} /></div>
                <span className="kcol-title">{col.label}</span>
                <span className="kcol-count">{cards.length}</span>
              </div>
              <div className="kcol-body">
                {cards.map(p => {
                  const recipe = recipes.find(r => r.product === p.product);
                  const reqs = recipe ? recipe.components.map(c => {
                    const need = c.qty * p.planned * (1 + c.loss / 100);
                    const it = findItem(c.sku); return { short: it ? it.available < need : false };
                  }) : [];
                  const short = reqs.some(r => r.short);
                  return (
                    <div className="kcard" key={p.id} onClick={() => setOpenId(p.id)}>
                      <div className="kcard-top">
                        <span className="code-pill">{p.num}</span>
                        <span className="muted" style={{ fontSize: 11.5 }}>{p.date}</span>
                      </div>
                      <div className="kcard-title">{p.productName.replace(' 156ml','').replace(' 220ml','')}</div>
                      <div className="kcard-sub">{p.planned} un · {recipe ? recipe.name + ' ' + p.recipeVer : '—'}</div>
                      <Sep style={{ margin: '10px 0 9px' }} />
                      {p.status === 'aguardando_materiais' && (short
                        ? <Badge tone="bad" dot>Material faltante</Badge>
                        : <Badge tone="ok" dot>Material ok</Badge>)}
                      {p.status === 'em_producao' && <div><Progress value={p.progress} tone="info" /><div className="muted" style={{ fontSize: 11.5, marginTop: 5 }}>{p.progress}% concluído</div></div>}
                      {p.status === 'em_cura' && <div className="row between"><Badge tone="cure" dot>Cura</Badge><span className="muted" style={{ fontSize: 12 }}>faltam {p.cureDayLeft}d · {p.cureUntil}</span></div>}
                      {p.status === 'aguardando_revisao' && <Badge tone="warn" dot>Revisar agora</Badge>}
                      {p.status === 'liberada' && <div className="row between"><Badge tone="ok" dot>Liberada</Badge><span className="muted" style={{ fontSize: 12 }}>lote {p.lot.slice(-4)}</span></div>}
                    </div>
                  );
                })}
                {cards.length === 0 && <div style={{ textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 12.5, padding: '18px 0' }}>—</div>}
              </div>
            </div>
          );
        })}
      </div>

      {op && <OPDrawer op={op} go={go} stepMeta={PROD_COLS.find(c => c.key === op.status)} onClose={() => setOpenId(null)} />}
      <PlanejarProducaoModal open={novo} onClose={() => setNovo(false)} onCreate={(p) => { production.unshift(p); bump(n => n + 1); }} />
    </div>
  );
}
window.Producao = Producao;
