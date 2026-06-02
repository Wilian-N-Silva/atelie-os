/* ============================================================
   forms.jsx — working create/action dialogs (Modal-based)
   Mutates window.DB arrays + toasts; parent bumps to refresh.
   ============================================================ */

function genCode(prefix) {
  const n = String(Math.floor(Math.random() * 1e7)).padStart(7, '0');
  return (prefix || '01') + '0' + n + '0';
}

/* ---------------- Novo pedido ------------------------------------- */
function NovoPedidoModal({ open, onClose, onCreate }) {
  const { items, CHANNELS, BRL } = window.DB;
  const products = items.filter(i => i.type === 'pa' || i.type === 'kit');
  const [customer, setCustomer] = React.useState('');
  const [city, setCity] = React.useState('');
  const [channel, setChannel] = React.useState('instagram');
  const [lines, setLines] = React.useState([{ sku: products[0].sku, qty: 1 }]);
  const [note, setNote] = React.useState('');
  const [err, setErr] = React.useState({});

  React.useEffect(() => { if (open) { setCustomer(''); setCity(''); setChannel('instagram'); setLines([{ sku: products[0].sku, qty: 1 }]); setNote(''); setErr({}); } }, [open]);

  const subtotal = lines.reduce((s, l) => { const it = items.find(i => i.sku === l.sku); return s + (it ? it.price * l.qty : 0); }, 0);
  const addLine = () => setLines(l => [...l, { sku: products[0].sku, qty: 1 }]);
  const setLine = (i, patch) => setLines(l => l.map((x, j) => j === i ? { ...x, ...patch } : x));
  const rmLine = (i) => setLines(l => l.filter((_, j) => j !== i));

  const submit = () => {
    const e = {};
    if (!customer.trim()) e.customer = 'Informe o nome do cliente';
    if (!lines.length) e.lines = 'Adicione ao menos um item';
    setErr(e); if (Object.keys(e).length) return;
    const num = '#' + (1044 + Math.floor(Math.random() * 50));
    onCreate && onCreate({
      id: 'o' + Date.now(), code: genCode('0401'), num, channel, customerName: customer, customer,
      city: city || 'A definir', status: 'a_separar', payment: 'pago', createdAt: 'agora',
      freight: 0, discount: 0, total: subtotal, items: lines.map(l => ({ sku: l.sku, qty: l.qty })), tracking: null, note: note || null,
    });
    window.toast('Pedido ' + num + ' criado · pronto para separar');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} icon="pedidos" title="Novo pedido" subtitle="Cadastro manual de pedido" width={620}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><div className="spacer" style={{ flex: 1 }} /><span className="muted" style={{ fontSize: 13, marginRight: 8 }}>Total {BRL(subtotal)}</span><Button variant="default" icon="check" onClick={submit}>Criar pedido</Button></>}>
      <div className="ff-grid">
        <Field label="Cliente" required error={err.customer}><Input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Nome do cliente" /></Field>
        <Field label="Cidade · UF"><Input value={city} onChange={e => setCity(e.target.value)} placeholder="São Paulo · SP" /></Field>
      </div>
      <Field label="Canal de venda"><Select value={channel} onChange={setChannel} options={Object.entries(CHANNELS).map(([value, label]) => ({ value, label }))} /></Field>

      <Field label="Itens" error={err.lines} />
      {lines.map((l, i) => (
        <div className="line-add" key={i}>
          <Select className="" style={{ flex: 1 }} value={l.sku} onChange={v => setLine(i, { sku: v })} options={products.map(p => ({ value: p.sku, label: `${p.name} ${p.variant}` }))} />
          <div style={{ width: 116 }}><Stepper value={l.qty} onChange={v => setLine(i, { qty: Math.max(1, Math.round(v)) })} min={1} /></div>
          <span className="muted" style={{ width: 84, textAlign: 'right', fontSize: 13 }}>{BRL((items.find(it => it.sku === l.sku)?.price || 0) * l.qty)}</span>
          <button className="wf-handle-btn" onClick={() => rmLine(i)} disabled={lines.length === 1}><Icon name="x" size={15} /></button>
        </div>
      ))}
      <Button variant="outline" size="sm" icon="plus" onClick={addLine} style={{ marginTop: 10 }}>Adicionar item</Button>

      <Field label="Observação" className="" style={{ marginTop: 16 }}><Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Ex.: cartão escrito à mão…" style={{ minHeight: 60 }} /></Field>
    </Modal>
  );
}

/* ---------------- Planejar produção ------------------------------- */
function PlanejarProducaoModal({ open, onClose, onCreate }) {
  const { recipes, items, findItem, num: fmt } = window.DB;
  const activeRecipes = recipes;
  const [recipeId, setRecipeId] = React.useState(activeRecipes[0].id);
  const [qty, setQty] = React.useState(24);
  const [date, setDate] = React.useState('hoje');
  const [resp, setResp] = React.useState('Camila');
  const recipe = recipes.find(r => r.id === recipeId);

  React.useEffect(() => { if (open) { setRecipeId(activeRecipes[0].id); setQty(24); } }, [open]);

  const reqs = recipe ? recipe.components.map(c => {
    const need = +(c.qty * qty * (1 + c.loss / 100)).toFixed(2);
    const it = findItem(c.sku);
    return { name: it ? it.name : c.sku, sku: c.sku, need, unit: c.unit, have: it ? it.available : 0, short: it ? it.available < need : true };
  }) : [];
  const anyShort = reqs.some(r => r.short);

  const submit = () => {
    const prod = items.find(i => i.sku === recipe.product);
    const num = 'OP-' + (209 + Math.floor(Math.random() * 90));
    onCreate && onCreate({
      id: 'p' + Date.now(), code: genCode('0301'), num, product: recipe.product,
      productName: prod ? `${prod.name} ${prod.variant}` : recipe.productName, recipe: recipe.name, recipeVer: recipe.version,
      planned: qty, status: 'aguardando_materiais', date, resp, cureUntil: null, short: anyShort,
      missing: reqs.filter(r => r.short).map(r => ({ sku: r.sku, need: r.need, have: r.have })),
    });
    window.toast(num + ' planejada · ' + qty + ' un de ' + recipe.name);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} icon="producao" title="Planejar produção" subtitle="Nova ordem de produção (OP)" width={600}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><div className="spacer" style={{ flex: 1 }} /><Button variant="default" icon="check" onClick={submit}>Criar OP</Button></>}>
      <div className="ff-grid">
        <Field label="Receita" required><Select value={recipeId} onChange={setRecipeId} options={activeRecipes.map(r => ({ value: r.id, label: `${r.name} ${r.version}` }))} /></Field>
        <Field label="Quantidade a produzir" required><Stepper value={qty} onChange={v => setQty(Math.max(1, Math.round(v)))} min={1} step={6} /></Field>
      </div>
      <div className="ff-grid">
        <Field label="Data planejada"><Input value={date} onChange={e => setDate(e.target.value)} placeholder="dd/mm" /></Field>
        <Field label="Responsável"><Input value={resp} onChange={e => setResp(e.target.value)} /></Field>
      </div>

      <Field label="Materiais necessários" />
      <div style={{ border: '1px solid hsl(var(--border))', borderRadius: 10, overflow: 'hidden' }}>
        <table className="minitable" style={{ fontSize: 13 }}>
          <tbody>
            {reqs.map(r => (
              <tr key={r.sku}>
                <td style={{ padding: '8px 12px' }}>{r.name}<div className="cell-sub sku">{r.sku}</div></td>
                <td className="r" style={{ padding: '8px 12px' }}>{fmt(r.need, r.need % 1 ? 2 : 0)} {r.unit}</td>
                <td className="r" style={{ padding: '8px 12px' }}>{r.short ? <Badge tone="bad">só {fmt(r.have, r.have % 1 ? 1 : 0)}</Badge> : <Badge tone="ok" dot>ok</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {anyShort && <div className="json-err" style={{ marginTop: 12 }}><Icon name="alert" size={15} /> Falta material para esta quantidade. A OP entra como “aguardando material”.</div>}
    </Modal>
  );
}

/* ---------------- Novo item --------------------------------------- */
function NovoItemModal({ open, onClose, onCreate }) {
  const TYPES = [{ value: 'pa', label: 'Produto acabado' }, { value: 'kit', label: 'Kit' }, { value: 'mp', label: 'Matéria-prima' }, { value: 'emb', label: 'Embalagem' }];
  const [type, setType] = React.useState('pa');
  const [name, setName] = React.useState('');
  const [variant, setVariant] = React.useState('');
  const [cat, setCat] = React.useState('Velas');
  const [unit, setUnit] = React.useState('un');
  const [min, setMin] = React.useState(24);
  const [cost, setCost] = React.useState(0);
  const [price, setPrice] = React.useState(0);
  const [cureDays, setCureDays] = React.useState(0);
  const [err, setErr] = React.useState({});
  const isProduct = type === 'pa' || type === 'kit';

  React.useEffect(() => { if (open) { setType('pa'); setName(''); setVariant(''); setCat('Velas'); setUnit('un'); setMin(24); setCost(0); setPrice(0); setCureDays(0); setErr({}); } }, [open]);

  const submit = () => {
    const e = {};
    if (!name.trim()) e.name = 'Informe o nome';
    setErr(e); if (Object.keys(e).length) return;
    const sku = (cat.slice(0, 3).toUpperCase() + '-' + name.slice(0, 3).toUpperCase() + '-' + String(Math.floor(Math.random() * 900) + 100));
    onCreate && onCreate({
      code: genCode(type === 'mp' ? '0101' : type === 'emb' ? '0102' : '0103'), sku, name, variant, type, cat, unit,
      min: +min, phys: 0, reserved: 0, cure: 0, blocked: 0, available: 0, costAvg: +cost,
      priceSugg: +price, price: isProduct ? +price : 0, status: 'ativo', cureDays: +cureDays,
      collection: isProduct ? 'Geral' : undefined, aroma: isProduct ? '—' : undefined, fragile: isProduct,
    });
    window.toast('Item “' + name + '” cadastrado · ' + sku);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} icon="itens" title="Novo item" subtitle="Cadastro no catálogo · gera SKU e código interno" width={620}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><div className="spacer" style={{ flex: 1 }} /><Button variant="default" icon="check" onClick={submit}>Cadastrar item</Button></>}>
      <Field label="Tipo de item" required>
        <div className="seg" style={{ display: 'flex' }}>
          {TYPES.map(t => <button key={t.value} className={cn('om-tab', type === t.value && 'om-tab--active')} style={{ flex: 1 }} onClick={() => setType(t.value)}>{t.label}</button>)}
        </div>
      </Field>
      <div className="ff-grid">
        <Field label="Nome" required error={err.name}><Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Vela Bergamota" /></Field>
        <Field label="Variação"><Input value={variant} onChange={e => setVariant(e.target.value)} placeholder="156ml" /></Field>
      </div>
      <div className="ff-grid-3">
        <Field label="Categoria"><Input value={cat} onChange={e => setCat(e.target.value)} /></Field>
        <Field label="Unidade"><Select value={unit} onChange={setUnit} options={['un', 'kg', 'ml', 'g', 'm']} /></Field>
        <Field label="Estoque mínimo"><Input type="number" value={min} onChange={e => setMin(e.target.value)} /></Field>
      </div>
      <div className="ff-grid-3">
        <Field label="Custo médio (R$)"><Input type="number" step="0.01" value={cost} onChange={e => setCost(e.target.value)} /></Field>
        {isProduct && <Field label="Preço de venda (R$)"><Input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} /></Field>}
        {isProduct && <Field label="Cura (dias)"><Input type="number" value={cureDays} onChange={e => setCureDays(e.target.value)} /></Field>}
      </div>
    </Modal>
  );
}

/* ---------------- Nova receita ------------------------------------ */
function NovaReceitaModal({ open, onClose, onCreate }) {
  const { items, findItem, BRL } = window.DB;
  const products = items.filter(i => i.type === 'pa' || i.type === 'kit');
  const mps = items.filter(i => i.type === 'mp' || i.type === 'emb');
  const [name, setName] = React.useState('');
  const [product, setProduct] = React.useState(products[0].sku);
  const [cureDays, setCureDays] = React.useState(14);
  const [comps, setComps] = React.useState([{ sku: mps[0].sku, qty: 1, loss: 2 }]);
  const [err, setErr] = React.useState({});

  React.useEffect(() => { if (open) { setName(''); setProduct(products[0].sku); setCureDays(14); setComps([{ sku: mps[0].sku, qty: 1, loss: 2 }]); setErr({}); } }, [open]);

  const cost = comps.reduce((s, c) => { const it = findItem(c.sku); return s + (it ? it.costAvg * c.qty * (1 + c.loss / 100) : 0); }, 0);
  const addC = () => setComps(c => [...c, { sku: mps[0].sku, qty: 1, loss: 2 }]);
  const setC = (i, patch) => setComps(c => c.map((x, j) => j === i ? { ...x, ...patch } : x));
  const rmC = (i) => setComps(c => c.filter((_, j) => j !== i));

  const submit = () => {
    const e = {};
    if (!name.trim()) e.name = 'Informe o nome da receita';
    setErr(e); if (Object.keys(e).length) return;
    const prod = items.find(i => i.sku === product);
    onCreate && onCreate({
      id: 'r' + Date.now(), name, product, productName: prod ? `${prod.name} ${prod.variant}` : product, version: 'v1', status: 'rascunho',
      yield: 1, yieldUnit: prod ? prod.variant : 'un', cureDays: +cureDays, prodMin: 8, loss: 4, cost,
      components: comps.map(c => { const it = findItem(c.sku); return { sku: c.sku, name: it ? it.name : c.sku, qty: +c.qty, unit: it ? it.unit : 'un', loss: +c.loss, req: true }; }), tests: [],
    });
    window.toast('Receita “' + name + '” criada como rascunho');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} icon="receitas" title="Nova receita" subtitle="Fórmula com componentes e custo calculado" width={640}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><div className="spacer" style={{ flex: 1 }} /><span className="muted" style={{ fontSize: 13, marginRight: 8 }}>Custo/un {BRL(cost)}</span><Button variant="default" icon="check" onClick={submit}>Criar receita</Button></>}>
      <div className="ff-grid">
        <Field label="Nome da receita" required error={err.name}><Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Bergamota & Sálvia" /></Field>
        <Field label="Produto gerado" required><Select value={product} onChange={setProduct} options={products.map(p => ({ value: p.sku, label: `${p.name} ${p.variant}` }))} /></Field>
      </div>
      <Field label="Cura (dias)" style={{ maxWidth: 160 }}><Input type="number" value={cureDays} onChange={e => setCureDays(e.target.value)} /></Field>

      <Field label="Componentes" />
      {comps.map((c, i) => (
        <div className="line-add" key={i}>
          <Select style={{ flex: 1 }} value={c.sku} onChange={v => setC(i, { sku: v })} options={mps.map(m => ({ value: m.sku, label: `${m.name} (${m.unit})` }))} />
          <div style={{ width: 110 }}><Stepper value={c.qty} onChange={v => setC(i, { qty: v })} min={0} step={c.qty < 1 ? 0.01 : 1} /></div>
          <div style={{ width: 84 }}><Input type="number" value={c.loss} onChange={e => setC(i, { loss: e.target.value })} title="perda %" /></div>
          <button className="wf-handle-btn" onClick={() => rmC(i)} disabled={comps.length === 1}><Icon name="x" size={15} /></button>
        </div>
      ))}
      <Button variant="outline" size="sm" icon="plus" onClick={addC} style={{ marginTop: 10 }}>Adicionar componente</Button>
      <div className="ff-hint" style={{ marginTop: 8 }}>Colunas: componente · quantidade · perda (%). Custo recalculado automaticamente.</div>
    </Modal>
  );
}

/* ---------------- Estoque: Contagem ------------------------------- */
function ContagemModal({ open, onClose, onMove }) {
  const { items, num } = window.DB;
  const [sku, setSku] = React.useState(items[0].sku);
  const [counted, setCounted] = React.useState(0);
  const it = items.find(i => i.sku === sku);
  React.useEffect(() => { if (open) { setSku(items[0].sku); setCounted(items[0].phys); } }, [open]);
  React.useEffect(() => { if (it) setCounted(it.phys); }, [sku]);
  const diff = +(counted - (it ? it.phys : 0)).toFixed(2);

  const submit = () => {
    onMove && onMove({ sku, type: diff >= 0 ? 'ajuste_positivo' : 'ajuste_negativo', qty: diff, ref: 'Contagem' });
    window.toast('Contagem registrada · ' + it.name + (diff ? ` (${diff > 0 ? '+' : ''}${num(diff, diff % 1 ? 1 : 0)})` : ' sem diferença'), diff < 0 ? 'bad' : 'ok');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} icon="refresh" title="Contagem de estoque" subtitle="Conferência física · gera ajuste pela diferença" width={520}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><div className="spacer" style={{ flex: 1 }} /><Button variant="default" icon="check" onClick={submit}>Registrar contagem</Button></>}>
      <Field label="Item" required><Select value={sku} onChange={setSku} options={items.map(i => ({ value: i.sku, label: `${i.name} ${i.variant} (${i.sku})` }))} /></Field>
      <div className="ff-grid-3">
        <Field label="Saldo no sistema"><Input value={it ? num(it.phys, it.phys % 1 ? 1 : 0) + ' ' + it.unit : ''} readOnly /></Field>
        <Field label="Contagem física" required><Input type="number" value={counted} onChange={e => setCounted(parseFloat(e.target.value) || 0)} autoFocus /></Field>
        <Field label="Diferença"><Input value={(diff > 0 ? '+' : '') + num(diff, diff % 1 ? 1 : 0)} readOnly className={diff < 0 ? 'om-text--bad' : diff > 0 ? 'om-text--ok' : ''} /></Field>
      </div>
      {diff !== 0 && <div className={diff < 0 ? 'json-err' : 'json-ok'}><Icon name={diff < 0 ? 'trendDown' : 'trendUp'} size={15} /> Será gerado um ajuste {diff > 0 ? 'positivo' : 'negativo'} de {num(Math.abs(diff), diff % 1 ? 1 : 0)} {it && it.unit}.</div>}
    </Modal>
  );
}

/* ---------------- Estoque: Transferir ----------------------------- */
function TransferirModal({ open, onClose, onMove }) {
  const { items, locations, num } = window.DB;
  const [sku, setSku] = React.useState(items[0].sku);
  const [from, setFrom] = React.useState(locations[0].name);
  const [to, setTo] = React.useState(locations[1].name);
  const [qty, setQty] = React.useState(1);
  const it = items.find(i => i.sku === sku);
  React.useEffect(() => { if (open) { setSku(items[0].sku); setFrom(locations[0].name); setTo(locations[1].name); setQty(1); } }, [open]);

  const submit = () => {
    if (from === to) { window.toast('Origem e destino devem ser diferentes', 'bad'); return; }
    onMove && onMove({ sku, type: 'transferencia', qty: 0, loc: to, ref: `${from} → ${to}` });
    window.toast(`${num(qty, qty % 1 ? 1 : 0)} ${it.unit} de ${it.name} transferido para ${to}`, 'info');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} icon="layers" title="Transferir estoque" subtitle="Mover entre locais sem alterar o saldo total" width={540}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><div className="spacer" style={{ flex: 1 }} /><Button variant="default" icon="check" onClick={submit}>Transferir</Button></>}>
      <Field label="Item" required><Select value={sku} onChange={setSku} options={items.map(i => ({ value: i.sku, label: `${i.name} ${i.variant}` }))} /></Field>
      <div className="ff-grid">
        <Field label="De" required><Select value={from} onChange={setFrom} options={locations.map(l => l.name)} /></Field>
        <Field label="Para" required><Select value={to} onChange={setTo} options={locations.map(l => l.name)} /></Field>
      </div>
      <Field label="Quantidade" style={{ maxWidth: 160 }}><Stepper value={qty} onChange={v => setQty(Math.max(1, v))} min={1} /></Field>
    </Modal>
  );
}

/* ---------------- Estoque: Ajuste --------------------------------- */
function AjusteModal({ open, onClose, onMove }) {
  const { items, num } = window.DB;
  const REASONS = ['Quebra', 'Perda', 'Sobra de produção', 'Doação', 'Uso interno', 'Correção'];
  const [sku, setSku] = React.useState(items[0].sku);
  const [dir, setDir] = React.useState('-');
  const [qty, setQty] = React.useState(1);
  const [reason, setReason] = React.useState(REASONS[0]);
  const it = items.find(i => i.sku === sku);
  React.useEffect(() => { if (open) { setSku(items[0].sku); setDir('-'); setQty(1); setReason(REASONS[0]); } }, [open]);

  const submit = () => {
    const signed = dir === '-' ? -qty : qty;
    onMove && onMove({ sku, type: dir === '-' ? 'ajuste_negativo' : 'ajuste_positivo', qty: signed, ref: reason });
    window.toast(`Ajuste ${dir}${num(qty, qty % 1 ? 1 : 0)} ${it.unit} em ${it.name} · ${reason}`, dir === '-' ? 'bad' : 'ok');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} icon="sliders" title="Ajustar estoque" subtitle="Entrada ou saída manual com motivo" width={520}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><div className="spacer" style={{ flex: 1 }} /><Button variant="default" icon="check" onClick={submit}>Registrar ajuste</Button></>}>
      <Field label="Item" required><Select value={sku} onChange={setSku} options={items.map(i => ({ value: i.sku, label: `${i.name} ${i.variant}` }))} /></Field>
      <div className="ff-grid-3">
        <Field label="Operação">
          <div className="seg" style={{ display: 'flex' }}>
            <button className={cn('om-tab', dir === '-' && 'om-tab--active')} style={{ flex: 1 }} onClick={() => setDir('-')}>Saída −</button>
            <button className={cn('om-tab', dir === '+' && 'om-tab--active')} style={{ flex: 1 }} onClick={() => setDir('+')}>Entrada +</button>
          </div>
        </Field>
        <Field label="Quantidade"><Stepper value={qty} onChange={v => setQty(Math.max(0, v))} min={0} /></Field>
        <Field label="Saldo atual"><Input value={it ? num(it.available) + ' ' + it.unit : ''} readOnly /></Field>
      </div>
      <Field label="Motivo" required><Select value={reason} onChange={setReason} options={REASONS} /></Field>
    </Modal>
  );
}

Object.assign(window, { NovoPedidoModal, PlanejarProducaoModal, NovoItemModal, NovaReceitaModal, ContagemModal, TransferirModal, AjusteModal });
