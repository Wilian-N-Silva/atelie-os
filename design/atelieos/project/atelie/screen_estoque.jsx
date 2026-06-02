/* ============================================================
   screen_estoque.jsx — Estoque: saldos, movimentos, locais
   Saldo = consequência de movimentos (nunca editado direto).
   ============================================================ */
function SaldoBar({ item }) {
  // composition: disponível / reservado / cura / bloqueado
  const segs = [
    { v: item.available, c: 'hsl(var(--ok))', k: 'disponível' },
    { v: item.reserved, c: 'hsl(var(--info))', k: 'reservado' },
    { v: item.cure, c: 'hsl(var(--cure))', k: 'em cura' },
    { v: item.blocked, c: 'hsl(var(--bad))', k: 'bloqueado' },
  ].filter(s => s.v > 0);
  const tot = item.phys || 1;
  return (
    <div className="om-tip" style={{ minWidth: 96 }}>
      <div className="qbar" style={{ display: 'flex', minWidth: 96 }}>
        {segs.map((s, i) => <div key={i} className="qbar-fill" style={{ width: `${(s.v / tot) * 100}%`, background: s.c }} />)}
      </div>
      <div className="om-tip-bubble">{segs.map(s => `${window.DB.num(s.v)} ${s.k}`).join(' · ') || 'sem saldo'}</div>
    </div>
  );
}

function Estoque({ go, route }) {
  const { items, movements, locations, MOVE_TYPES, num, findItem } = window.DB;
  const [tab, setTab] = React.useState('saldos');
  const [type, setType] = React.useState('todos');
  const [q, setQ] = React.useState('');
  const [dialog, setDialog] = React.useState(null); // contagem | transferir | ajuste
  const [, bump] = React.useState(0);

  const applyMove = (m) => {
    const it = items.find(i => i.sku === m.sku);
    if (it && typeof m.qty === 'number' && m.qty !== 0) {
      it.phys = +(it.phys + m.qty).toFixed(2);
      it.available = Math.max(0, it.phys - it.reserved - it.cure - it.blocked);
    }
    movements.unshift({ id: 'm' + Date.now(), when: 'agora', sku: m.sku, type: m.type, qty: m.qty || 0,
      lot: '—', loc: m.loc || (it ? '—' : ''), who: 'Camila', origin: 'manual', ref: m.ref || '' });
    bump(n => n + 1);
  };

  const typeFilters = [
    { value: 'todos', label: 'Todos' },
    { value: 'pa', label: 'Produtos' },
    { value: 'mp', label: 'Matéria-prima' },
    { value: 'emb', label: 'Embalagem' },
  ];
  const baseRows = items.filter(i => (type === 'todos' || i.type === type || (type === 'pa' && i.type === 'kit')) &&
    (!q || (i.name + i.sku + i.code + i.variant).toLowerCase().includes(q.toLowerCase())));
  const sort = useSort(baseRows, {
    name: i => i.name, available: i => i.available, phys: i => i.phys, min: i => i.min,
    state: i => (i.available < i.min ? 0 : i.blocked > 0 ? 1 : i.cure > 0 ? 2 : 3),
  }, 'name', 'asc');
  const rows = sort.sorted;
  const lowCount = items.filter(i => i.available < i.min).length;
  const curaCount = items.filter(i => i.cure > 0).length;
  const blockCount = items.filter(i => i.blocked > 0).length;

  return (
    <div className="page page--wide fade-in">
      <div className="page-head">
        <div><h1 className="page-h1">Estoque</h1><p className="page-lede">Saldos derivados de movimentos · {lowCount} abaixo do mínimo · {curaCount} em cura</p></div>
        <div className="row-wrap">
          <Button variant="outline" icon="refresh" onClick={() => setDialog('contagem')}>Contagem</Button>
          <Button variant="outline" icon="layers" onClick={() => setDialog('transferir')}>Transferir</Button>
          <Button variant="default" icon="plus" onClick={() => setDialog('ajuste')}>Ajustar estoque</Button>
        </div>
      </div>

      {/* state summary */}
      <div className="grid cols-4" style={{ marginBottom: 'var(--gap)' }}>
        {[
          { label: 'Abaixo do mínimo', value: lowCount, tone: 'bad', icon: 'alert' },
          { label: 'Em cura', value: curaCount, tone: 'cure', icon: 'thermometer' },
          { label: 'Bloqueados', value: blockCount, tone: 'warn', icon: 'lock' },
          { label: 'Locais ativos', value: locations.length, tone: 'neutral', icon: 'mapPin' },
        ].map((s, i) => (
          <Card key={i}><CardContent style={{ padding: 16 }}>
            <div className="row" style={{ gap: 11 }}>
              <div className={cn('chip', `chip--${s.tone}`)}><Icon name={s.icon} size={17} /></div>
              <div><div className="om-stat-value" style={{ fontSize: 24 }}>{s.value}</div><div className="om-stat-label">{s.label}</div></div>
            </div>
          </CardContent></Card>
        ))}
      </div>

      <div className="toolbar">
        <Tabs tabs={[
          { value: 'saldos', label: 'Saldos', icon: 'estoque' },
          { value: 'movimentos', label: 'Movimentos', icon: 'layers', count: movements.length },
          { value: 'locais', label: 'Locais', icon: 'mapPin' },
        ]} value={tab} onChange={setTab} />
        <div className="spacer" />
        {tab === 'saldos' && <div style={{ width: 220 }}><Input icon="search" placeholder="Item, SKU, código…" value={q} onChange={e => setQ(e.target.value)} /></div>}
        {tab === 'saldos' && <div className="seg">{typeFilters.map(f => (
          <button key={f.value} className={cn('om-tab', type === f.value && 'om-tab--active')} onClick={() => setType(f.value)}>{f.label}</button>
        ))}</div>}
      </div>

      <Card style={{ overflow: 'hidden' }}>
        {tab === 'saldos' && (
          <table className="om-table">
            <thead><tr>
              <SortTh label="Item" k="name" sort={sort} />
              <th>Composição do saldo</th>
              <SortTh label="Disponível" k="available" sort={sort} align="right" />
              <SortTh label="Físico" k="phys" sort={sort} align="right" />
              <SortTh label="Mínimo" k="min" sort={sort} align="right" />
              <SortTh label="Estado" k="state" sort={sort} />
            </tr></thead>
            <tbody>
              {rows.map(i => {
                const low = i.available < i.min;
                const sw = i.type === 'pa' || i.type === 'kit' ? '' : i.type === 'mp' ? 'swatch--mp' : 'swatch--emb';
                return (
                  <tr key={i.code} className="om-row-click" onClick={() => go('itens', { open: i.code })}>
                    <td><div className="item-cell">
                      <div className={cn('swatch', sw)}><Icon name={i.type === 'mp' ? 'droplet' : i.type === 'emb' ? 'box' : 'flame'} size={15} /></div>
                      <div style={{ minWidth: 0 }}><div className="cell-title">{i.name} <span className="muted">{i.variant}</span></div><div className="cell-sub sku">{i.sku}</div></div>
                    </div></td>
                    <td><SaldoBar item={i} /></td>
                    <td className="om-td-right" style={{ fontWeight: 650 }}><span className={low ? 'om-text--bad' : ''}>{num(i.available)}</span> <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>{i.unit}</span></td>
                    <td className="om-td-right muted">{num(i.phys)}</td>
                    <td className="om-td-right muted">{i.min}</td>
                    <td>
                      {low ? <Badge tone="bad" dot>Abaixo do mín.</Badge>
                        : i.cure > 0 ? <Badge tone="cure" dot>{i.cure} em cura</Badge>
                        : i.blocked > 0 ? <Badge tone="warn" dot>{i.blocked} bloq.</Badge>
                        : <Badge tone="ok" dot>Saudável</Badge>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {tab === 'saldos' && rows.length === 0 && <Empty icon="search" title="Nada encontrado" hint="Ajuste a busca ou o filtro de tipo." />}

        {tab === 'movimentos' && (
          <table className="om-table">
            <thead><tr><th>Quando</th><th>Item</th><th>Movimento</th><th className="om-td-right">Qtd</th><th>Lote</th><th>Local</th><th>Origem</th><th>Ref.</th></tr></thead>
            <tbody>
              {movements.map(m => {
                const it = findItem(m.sku); const mt = MOVE_TYPES[m.type];
                return (
                  <tr key={m.id}>
                    <td className="muted" style={{ whiteSpace: 'nowrap' }}>{m.when}</td>
                    <td><div className="cell-title">{it ? it.name : m.sku}</div><div className="cell-sub sku">{m.sku}</div></td>
                    <td><Badge tone={mt.tone}>{mt.label}</Badge></td>
                    <td className="om-td-right" style={{ fontWeight: 650 }}><span className={m.qty < 0 ? 'om-text--bad' : 'om-text--ok'}>{m.qty > 0 ? '+' : ''}{num(m.qty, m.qty % 1 ? 1 : 0)}</span></td>
                    <td><span className="code-pill">{m.lot}</span></td>
                    <td className="muted">{m.loc}</td>
                    <td>{m.origin === 'scanner' ? <Badge tone="info">scanner</Badge> : <span className="muted">{m.origin}</span>}</td>
                    <td className="muted">{m.ref}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {tab === 'locais' && (
          <div style={{ padding: 16 }} className="grid cols-3">
            {locations.map(l => (
              <div key={l.code} className="task" style={{ cursor: 'default' }}>
                <div className="task-top">
                  <div className="chip chip--neutral"><Icon name="mapPin" size={17} /></div>
                  <div style={{ flex: 1 }}><div className="task-label">{l.name}</div><div className="task-sub">{l.type}</div></div>
                </div>
                <div className="row between">
                  <span className="code-pill">{l.code}</span>
                  <span className="muted" style={{ fontSize: 12.5 }}>{l.items} itens</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ContagemModal open={dialog === 'contagem'} onClose={() => setDialog(null)} onMove={applyMove} />
      <TransferirModal open={dialog === 'transferir'} onClose={() => setDialog(null)} onMove={applyMove} />
      <AjusteModal open={dialog === 'ajuste'} onClose={() => setDialog(null)} onMove={applyMove} />
    </div>
  );
}
window.Estoque = Estoque;
