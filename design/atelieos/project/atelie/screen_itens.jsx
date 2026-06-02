/* ============================================================
   screen_itens.jsx — Itens / SKUs: catalog + item detail
   ============================================================ */
const TYPE_META = {
  pa:  { label: 'Produto acabado', sw: '', icon: 'flame' },
  kit: { label: 'Kit', sw: 'swatch--kit', icon: 'layers' },
  mp:  { label: 'Matéria-prima', sw: 'swatch--mp', icon: 'droplet' },
  emb: { label: 'Embalagem', sw: 'swatch--emb', icon: 'box' },
};

function ItemDrawer({ item, go, onClose }) {
  const { BRL, num, recipes } = window.DB;
  if (!item) return null;
  const tm = TYPE_META[item.type];
  const low = item.available < item.min;
  const usedIn = recipes.filter(r => r.components.some(c => c.sku === item.sku));
  const isProduct = item.type === 'pa' || item.type === 'kit';

  return (
    <React.Fragment>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer-head">
          <div className={cn('swatch', tm.sw)} style={{ width: 44, height: 44, borderRadius: 11 }}><Icon name={tm.icon} size={20} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="drawer-h1">{item.name}</div>
            <div className="row" style={{ gap: 8, marginTop: 4 }}>
              <Badge tone="neutral">{tm.label}</Badge>
              <span className="muted" style={{ fontSize: 13 }}>{item.variant}</span>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>

        <div className="drawer-body">
          {/* codes */}
          <div className="grid cols-2" style={{ gap: 10, marginBottom: 18 }}>
            <div style={{ border: '1px solid hsl(var(--border))', borderRadius: 10, padding: '11px 13px' }}>
              <div className="block-label" style={{ marginBottom: 5 }}>SKU humano</div>
              <div className="sku" style={{ fontSize: 15, fontWeight: 600 }}>{item.sku}</div>
            </div>
            <div style={{ border: '1px solid hsl(var(--border))', borderRadius: 10, padding: '11px 13px' }}>
              <div className="block-label" style={{ marginBottom: 5 }}>Código interno</div>
              <div className="mono" style={{ fontSize: 15, fontWeight: 600 }}>{item.code}</div>
            </div>
          </div>

          {/* barcode mock */}
          <div style={{ border: '1px solid hsl(var(--border))', borderRadius: 10, padding: 14, marginBottom: 18, textAlign: 'center' }}>
            <Barcode code={item.code} />
            <div className="mono" style={{ fontSize: 12, letterSpacing: '0.12em', marginTop: 7 }}>{item.code}</div>
            <div style={{ fontSize: 11.5, marginTop: 2 }} className="muted">{item.sku} · {item.name} {item.variant}</div>
          </div>

          {/* stock */}
          <div className="block-label">Estoque</div>
          <div className="grid cols-4" style={{ gap: 8, marginBottom: 16 }}>
            {[['Disponível', item.available, low ? 'bad' : 'ok'], ['Reservado', item.reserved, 'info'], ['Em cura', item.cure, 'cure'], ['Mínimo', item.min, 'neutral']].map(([k, v, tone]) => (
              <div key={k} style={{ textAlign: 'center', border: '1px solid hsl(var(--border))', borderRadius: 9, padding: '10px 4px' }}>
                <div className={cn('om-stat-value', `om-text--${tone}`)} style={{ fontSize: 20 }}>{num(v)}</div>
                <div className="om-stat-label" style={{ fontSize: 11 }}>{k}</div>
              </div>
            ))}
          </div>

          {/* attributes */}
          <div className="block-label">Detalhes</div>
          {isProduct && <div className="field"><span className="field-k">Coleção · aroma</span><span className="field-v" style={{ maxWidth: 280 }}>{item.collection} · {item.aroma}</span></div>}
          <div className="field"><span className="field-k">Categoria · unidade</span><span className="field-v">{item.cat} · {item.unit}</span></div>
          <div className="field"><span className="field-k">Custo médio</span><span className="field-v">{BRL(item.costAvg)}</span></div>
          {isProduct && <div className="field"><span className="field-k">Preço atual</span><span className="field-v">{BRL(item.price)} <span className="muted" style={{ fontWeight: 400 }}>· sug. {BRL(item.priceSugg)}</span></span></div>}
          {isProduct && <div className="field"><span className="field-k">Peso embalado</span><span className="field-v">{item.packWeightG} g · {item.packDims} cm</span></div>}
          <div className="field"><span className="field-k">Controle</span><span className="field-v row" style={{ gap: 6, justifyContent: 'flex-end' }}>
            {item.cureDays > 0 && <Badge tone="cure">cura {item.cureDays}d</Badge>}
            {item.fragile && <Badge tone="warn">frágil</Badge>}
            <Badge tone="ok">{item.status}</Badge>
          </span></div>

          {usedIn.length > 0 && (
            <React.Fragment>
              <div className="block-label" style={{ marginTop: 18 }}>Usado em receitas</div>
              {usedIn.map(r => (
                <div key={r.id} className="lrow om-row-click" onClick={() => go('receitas', { open: r.id })}>
                  <div className="chip chip--brand" style={{ width: 28, height: 28, borderRadius: 7 }}><Icon name="receitas" size={14} /></div>
                  <div className="lrow-main"><div className="lrow-title">{r.name} {r.version}</div><div className="lrow-sub">{r.productName}</div></div>
                  <Icon name="chevronRight" size={15} className="muted" />
                </div>
              ))}
            </React.Fragment>
          )}
        </div>

        <div className="drawer-foot">
          <Button variant="default" icon="printer" style={{ flex: 1 }}>Imprimir etiqueta</Button>
          <Button variant="outline" icon="layers" onClick={() => go('estoque')}>Movimentos</Button>
          <Button variant="outline" icon="more" />
        </div>
      </aside>
    </React.Fragment>
  );
}

// lightweight deterministic barcode (Code128-ish bars, visual only)
function Barcode({ code }) {
  const bars = [];
  for (let i = 0; i < code.length; i++) {
    const d = parseInt(code[i], 10);
    bars.push(1 + (d % 3)); // bar width
    bars.push(1 + ((d + 1) % 2)); // gap width
  }
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 1, height: 46 }}>
      {bars.map((w, i) => (
        <div key={i} style={{ width: w * 1.6, height: '100%', background: i % 2 === 0 ? 'hsl(var(--foreground))' : 'transparent' }} />
      ))}
    </div>
  );
}

function Itens({ go, route }) {
  const { items, num, BRL } = window.DB;
  const [type, setType] = React.useState('todos');
  const [q, setQ] = React.useState('');
  const [view, setView] = useView('itens', 'list');
  const [novo, setNovo] = React.useState(false);
  const [, bump] = React.useState(0);
  const [openCode, setOpenCode] = React.useState(route.open || null);
  React.useEffect(() => { if (route.open) setOpenCode(route.open); }, [route]);

  const filters = [
    { value: 'todos', label: 'Todos', n: items.length },
    { value: 'pa', label: 'Produtos', n: items.filter(i => i.type === 'pa').length },
    { value: 'kit', label: 'Kits', n: items.filter(i => i.type === 'kit').length },
    { value: 'mp', label: 'Matéria-prima', n: items.filter(i => i.type === 'mp').length },
    { value: 'emb', label: 'Embalagem', n: items.filter(i => i.type === 'emb').length },
  ];
  const baseRows = items.filter(i => (type === 'todos' || i.type === type) &&
    (!q || (i.name + i.sku + i.code).toLowerCase().includes(q.toLowerCase())));
  const sort = useSort(baseRows, {
    name: i => i.name, type: i => i.type, sku: i => i.sku, code: i => i.code,
    available: i => i.available, costAvg: i => i.costAvg, price: i => i.price,
  }, 'name', 'asc');
  const rows = sort.sorted;
  const openItem = items.find(i => i.code === openCode);

  return (
    <div className="page page--wide fade-in">
      <div className="page-head">
        <div><h1 className="page-h1">Itens / SKUs</h1><p className="page-lede">{items.length} itens no catálogo · todos com código interno e etiqueta</p></div>
        <div className="row-wrap">
          <Button variant="outline" icon="printer" onClick={() => go('etiquetas')}>Etiquetas em massa</Button>
          <Button variant="default" icon="plus" onClick={() => setNovo(true)}>Novo item</Button>
        </div>
      </div>

      <div className="toolbar">
        <div className="seg">{filters.map(f => (
          <button key={f.value} className={cn('om-tab', type === f.value && 'om-tab--active')} onClick={() => setType(f.value)}>
            {f.label}<span className="om-tab-count">{f.n}</span>
          </button>
        ))}</div>
        <div className="spacer" />
        <div style={{ width: 260 }}><Input icon="search" placeholder="Nome, SKU ou código…" value={q} onChange={e => setQ(e.target.value)} /></div>
        <ViewToggle value={view} onChange={setView} />
      </div>

      {view === 'grid' ? (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(248px, 1fr))' }}>
          {rows.map(i => {
            const tm = TYPE_META[i.type]; const low = i.available < i.min;
            return (
              <div key={i.code} className="task" style={{ cursor: 'pointer' }} onClick={() => setOpenCode(i.code)}>
                <div className="row between">
                  <div className={cn('swatch', tm.sw)} style={{ width: 38, height: 38, borderRadius: 10 }}><Icon name={tm.icon} size={18} /></div>
                  <Badge tone="neutral">{tm.label}</Badge>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14.5 }}>{i.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{i.variant} · {i.cat}</div>
                </div>
                <div className="sku" style={{ fontSize: 12 }}>{i.sku} · <span className="muted">{i.code}</span></div>
                <Sep />
                <div className="row between">
                  <div><div className="om-stat-label">Disponível</div><div style={{ fontWeight: 650, fontSize: 15 }} className={low ? 'om-text--bad' : ''}>{num(i.available)} {i.unit}</div></div>
                  <div style={{ textAlign: 'right' }}><div className="om-stat-label">Preço</div><div style={{ fontWeight: 650, fontSize: 15 }}>{i.price ? BRL(i.price) : '—'}</div></div>
                </div>
              </div>
            );
          })}
          {rows.length === 0 && <div style={{ gridColumn: '1 / -1' }}><Empty icon="search" title="Nada encontrado" hint="Ajuste a busca ou o filtro de tipo." /></div>}
        </div>
      ) : (
      <Card style={{ overflow: 'hidden' }}>
        <table className="om-table">
          <thead><tr>
            <SortTh label="Item" k="name" sort={sort} />
            <SortTh label="Tipo" k="type" sort={sort} />
            <SortTh label="SKU" k="sku" sort={sort} />
            <th>Código interno</th>
            <SortTh label="Disponível" k="available" sort={sort} align="right" />
            <SortTh label="Custo" k="costAvg" sort={sort} align="right" />
            <SortTh label="Preço" k="price" sort={sort} align="right" />
            <th></th>
          </tr></thead>
          <tbody>
            {rows.map(i => {
              const tm = TYPE_META[i.type]; const low = i.available < i.min;
              return (
                <tr key={i.code} className="om-row-click" onClick={() => setOpenCode(i.code)}>
                  <td><div className="item-cell">
                    <div className={cn('swatch', tm.sw)}><Icon name={tm.icon} size={15} /></div>
                    <div style={{ minWidth: 0 }}><div className="cell-title">{i.name} <span className="muted">{i.variant}</span></div><div className="cell-sub">{i.cat}</div></div>
                  </div></td>
                  <td><Badge tone="neutral">{tm.label}</Badge></td>
                  <td><span className="sku">{i.sku}</span></td>
                  <td><span className="code-pill">{i.code}</span></td>
                  <td className="om-td-right" style={{ fontWeight: 600 }}><span className={low ? 'om-text--bad' : ''}>{num(i.available)}</span> <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>{i.unit}</span></td>
                  <td className="om-td-right muted">{BRL(i.costAvg)}</td>
                  <td className="om-td-right">{i.price ? <span style={{ fontWeight: 600 }}>{BRL(i.price)}</span> : <span className="muted">—</span>}</td>
                  <td className="om-td-right"><Icon name="chevronRight" size={16} className="muted" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <Empty icon="search" title="Nada encontrado" hint="Ajuste a busca ou o filtro de tipo." />}
      </Card>
      )}

      {openItem && <ItemDrawer item={openItem} go={go} onClose={() => setOpenCode(null)} />}
      <NovoItemModal open={novo} onClose={() => setNovo(false)} onCreate={(it) => { items.push(it); bump(n => n + 1); }} />
    </div>
  );
}
window.Itens = Itens;
window.Barcode = Barcode;
