/* ============================================================
   screen_etiquetas.jsx — Editor de Etiquetas (Code128, models)
   Fila de impressão: várias etiquetas diferentes numa folha só.
   ============================================================ */

/* deterministic Code128-ish barcode (visual) */
function Code128({ code, height = 54, scale = 2 }) {
  const seq = [];
  seq.push([2, 'b'], [1, 'w'], [1, 'b'], [2, 'w']);
  for (let i = 0; i < code.length; i++) {
    const d = parseInt(code[i], 10);
    seq.push([1 + (d % 3), 'b']);
    seq.push([1 + ((d + 2) % 3), 'w']);
    seq.push([1 + ((d * 3 + 1) % 2), 'b']);
    seq.push([1 + ((d + 1) % 2), 'w']);
  }
  seq.push([2, 'b'], [1, 'w'], [3, 'b']);
  return (
    <div className="lab-barcode" style={{ height }}>
      {seq.map(([w, c], i) => (
        <div key={i} style={{ width: w * scale, height: '100%', background: c === 'b' ? '#111' : 'transparent' }} />
      ))}
    </div>
  );
}

/* on-screen preview (px) */
function LabelPreview({ tpl, entity, fields, mm = 3.2 }) {
  const W = tpl.w * mm, H = tpl.h * mm;
  const big = tpl.w >= 80;
  const nameSize = big ? 17 : tpl.w >= 60 ? 14 : 12;
  return (
    <div className="lab-paper" style={{ width: W, height: H }}>
      <div className="lab-paper-pad" style={{ gap: big ? 8 : 5 }}>
        {fields.name && <div className="lab-name" style={{ fontSize: nameSize }}>{entity.name}{fields.variant && entity.variant ? <span className="lab-variant" style={{ fontWeight: 500 }}> · {entity.variant}</span> : null}</div>}
        {fields.opNum && <div className="lab-name" style={{ fontSize: 20 }}>{entity.opNum}</div>}
        {fields.productName && <div style={{ fontSize: 13, color: '#333' }}>{entity.productName}</div>}
        {fields.orderNum && <div className="lab-name" style={{ fontSize: 22 }}>{entity.orderNum}</div>}
        {fields.customer && <div style={{ fontSize: 13, color: '#333' }}>{entity.customer} · {entity.city}</div>}
        {fields.locName && <div className="lab-name" style={{ fontSize: 18 }}>{entity.locName}</div>}
        {fields.locType && <div style={{ fontSize: 12, color: '#555' }}>{entity.locType}</div>}
        {fields.sku && <div className="lab-sku" style={{ fontSize: big ? 14 : 12 }}>{entity.sku}</div>}
        {fields.lot && <div className="lab-meta" style={{ fontSize: 12 }}>Lote {entity.lot}</div>}
        {fields.prodDate && <div className="lab-meta" style={{ fontSize: 11 }}>Produção {entity.prodDate}</div>}
        {fields.planned && <div className="lab-meta" style={{ fontSize: 12 }}>{entity.planned} un · {entity.recipe}</div>}
        <div style={{ flex: 1 }} />
        {fields.barcode && (
          <div>
            <Code128 code={entity.code} height={big ? 60 : tpl.w >= 60 ? 46 : 34} scale={big ? 2.2 : 1.6} />
            <div className="lab-code-h" style={{ fontSize: big ? 13 : 10.5, marginTop: 3 }}>{entity.code}</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* print label (mm units) */
function PrintLabel({ spec, sheet }) {
  const { entity, fields } = spec;
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.5mm', boxSizing: 'border-box', overflow: 'hidden' }}>
      <div>
        {fields.name && <div style={{ fontWeight: 700, fontSize: '2.6mm', lineHeight: 1.1, color: '#000' }}>{entity.name}{fields.variant && entity.variant ? ' · ' + entity.variant : ''}</div>}
        {fields.opNum && <div style={{ fontWeight: 700, fontSize: '3.4mm', color: '#000' }}>{entity.opNum}</div>}
        {fields.orderNum && <div style={{ fontWeight: 700, fontSize: '3.6mm', color: '#000' }}>{entity.orderNum}</div>}
        {fields.customer && <div style={{ fontSize: '2.2mm', color: '#333' }}>{entity.customer} · {entity.city}</div>}
        {fields.locName && <div style={{ fontWeight: 700, fontSize: '3mm', color: '#000' }}>{entity.locName}</div>}
        {fields.productName && <div style={{ fontSize: '2.2mm', color: '#333' }}>{entity.productName}</div>}
        {fields.sku && <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: '2.2mm', color: '#000' }}>{entity.sku}</div>}
        {fields.lot && <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: '2.2mm', color: '#333' }}>Lote {entity.lot}</div>}
      </div>
      {fields.barcode && (
        <div>
          <Code128 code={entity.code} height={Math.max(18, sheet.labelH * 1.4)} scale={1.3} />
          <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: '2mm', textAlign: 'center', letterSpacing: '0.08em', color: '#000' }}>{entity.code}</div>
        </div>
      )}
    </div>
  );
}

function entityOptionsFor(target) {
  const { items, orders, production, locations } = window.DB;
  switch (target) {
    case 'item': return items.map(i => ({ id: i.code, label: `${i.name} ${i.variant}`, sub: i.sku, e: { name: i.name, variant: i.variant, sku: i.sku, code: i.code } }));
    case 'lote': return production.filter(p => p.lot).map(p => ({ id: p.lot, label: `Lote ${p.lot}`, sub: p.productName, e: { name: p.productName, lot: p.lot, prodDate: p.date, code: p.lot } }));
    case 'op': return production.map(p => ({ id: p.code, label: `${p.num}`, sub: p.productName, e: { opNum: p.num, productName: p.productName, planned: p.planned, recipe: p.recipe + ' ' + p.recipeVer, code: p.code } }));
    case 'pedido': return orders.map(o => ({ id: o.code, label: o.num, sub: o.customerName, e: { orderNum: o.num, customer: o.customerName, city: o.city, code: o.code } }));
    case 'local': return locations.map(l => ({ id: l.code, label: l.name, sub: l.type, e: { locName: l.name, locType: l.type, code: l.code } }));
    default: return [];
  }
}

const FIELD_LABELS = { name: 'Nome do item', variant: 'Variação', sku: 'SKU humano', code: 'Código interno', barcode: 'Código de barras (Code128)', lot: 'Número do lote', prodDate: 'Data de produção', opNum: 'Número da OP', productName: 'Produto', planned: 'Quantidade planejada', recipe: 'Receita', orderNum: 'Número do pedido', customer: 'Cliente', city: 'Cidade', locName: 'Nome do local', locType: 'Tipo de local' };

/* ---- build dialog: pick type, record, fields, qty ---- */
function AddLabelModal({ open, onClose, onAdd }) {
  const { labelTemplates } = window.DB;
  const [tplId, setTplId] = React.useState('lt1');
  const tpl = labelTemplates.find(t => t.id === tplId);
  const [fields, setFields] = React.useState({});
  const [sel, setSel] = React.useState(null);
  const [copies, setCopies] = React.useState(1);
  const entityOptions = React.useMemo(() => entityOptionsFor(tpl.target), [tplId]);

  React.useEffect(() => { if (open) { setTplId('lt1'); } }, [open]);
  React.useEffect(() => { setFields(Object.fromEntries(tpl.fields.map(f => [f, true]))); setSel(entityOptions[0]); }, [tplId]);

  const entity = sel ? sel.e : {};
  const add = (keepOpen) => {
    if (!sel) return;
    onAdd({ tpl, entity, fields: { ...fields }, copies, title: sel.label, sub: tpl.name });
    if (keepOpen) { window.toast(copies + '× ' + sel.label + ' na fila', 'info'); }
    else onClose();
  };

  return (
    <Modal open={open} onClose={onClose} icon="tag" title="Adicionar etiqueta" subtitle="Escolha tipo, registro e campos" width={760}
      footer={<><Button variant="ghost" onClick={onClose}>Fechar</Button><div className="spacer" style={{ flex: 1 }} /><Button variant="outline" icon="plus" onClick={() => add(true)}>Adicionar e continuar</Button><Button variant="default" icon="check" onClick={() => add(false)}>Adicionar à fila</Button></>}>
      <div className="addlab">
        <div className="addlab-form">
          <div className="block-label" style={{ marginBottom: 8 }}>Tipo de etiqueta</div>
          <div className="lab-tpl-grid" style={{ marginBottom: 16 }}>
            {labelTemplates.map(t => (
              <div key={t.id} className={cn('lab-tpl', tplId === t.id && 'lab-tpl--on')} onClick={() => setTplId(t.id)}>
                <div className={cn('chip', tplId === t.id ? 'chip--brand' : 'chip--neutral')} style={{ width: 30, height: 30, borderRadius: 8 }}><Icon name={t.icon} size={15} /></div>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</div><div className="muted" style={{ fontSize: 11 }}>{t.w}×{t.h} mm</div></div>
              </div>
            ))}
          </div>
          <Field label="Registro"><Select value={sel ? sel.id : ''} onChange={v => setSel(entityOptions.find(o => o.id === v))} options={entityOptions.map(o => ({ value: o.id, label: o.label + ' — ' + o.sub }))} /></Field>
          <div className="block-label" style={{ margin: '4px 0 8px' }}>Campos exibidos</div>
          <div className="lab-field-grid">
            {tpl.fields.map(f => (
              <div key={f} className={cn('lab-field-toggle', fields[f] && 'lab-field-toggle--on')} onClick={() => setFields(s => ({ ...s, [f]: !s[f] }))}>
                <span>{FIELD_LABELS[f] || f}</span><span className={cn('lab-sw', fields[f] && 'lab-sw--on')} />
              </div>
            ))}
          </div>
        </div>
        <div className="addlab-side">
          <div className="block-label" style={{ marginBottom: 8 }}>Pré-visualização</div>
          <div className="lab-stage lab-stage--mini" style={{ marginBottom: 14 }}>
            <div className="lab-stage-grid" />
            {sel ? <LabelPreview tpl={tpl} entity={entity} fields={fields} mm={tpl.w >= 80 ? 2.0 : 3.0} /> : <Empty title="—" />}
          </div>
          <Field label="Quantidade">
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <Stepper value={copies} onChange={v => setCopies(Math.max(1, Math.round(v)))} min={1} />
              {[6, 12, 24].map(n => <Button key={n} variant="ghost" size="sm" onClick={() => setCopies(n)}>{n}×</Button>)}
            </div>
          </Field>
        </div>
      </div>
    </Modal>
  );
}

function Etiquetas({ go, route, sheets }) {
  const { labelHistory } = window.DB;
  const sheetList = sheets && sheets.length ? sheets : window.DB.labelSheets;

  const [sheetId, setSheetId] = React.useState(sheetList[0].id);
  const [queue, setQueue] = React.useState([]);
  const [skip, setSkip] = React.useState([]);
  const [printed, setPrinted] = React.useState(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [previewId, setPreviewId] = React.useState(null);

  const sheet = sheetList.find(s => s.id === sheetId) || sheetList[0];
  const perSheet = sheet.cols * sheet.rows;
  React.useEffect(() => { setSkip([]); }, [sheetId]);

  // flatten queue → specs
  const flat = React.useMemo(() => {
    const out = [];
    queue.forEach(q => { for (let i = 0; i < q.copies; i++) out.push({ tpl: q.tpl, entity: q.entity, fields: q.fields, qid: q.id }); });
    return out;
  }, [queue]);
  const totalLabels = flat.length;
  const slots = [];
  { let page = 0; while (slots.length < totalLabels && page < 300) { for (let c = 0; c < perSheet; c++) { if (page === 0 && skip.includes(c)) continue; slots.push(page * perSheet + c); if (slots.length >= totalLabels) break; } page++; } }
  const lastCell = slots.length ? slots[slots.length - 1] : -1;
  const pages = Math.max(1, lastCell >= 0 ? Math.floor(lastCell / perSheet) + 1 : 1);
  const assignment = {}; const cellQid = {}; const cellNum = {};
  slots.forEach((g, i) => { assignment[g] = flat[i]; cellQid[g] = flat[i].qid; cellNum[g] = i + 1; });
  const skipCount = skip.filter(i => i < perSheet).length;
  const freeTotal = pages * perSheet - skipCount - totalLabels;

  const addToQueue = (spec) => {
    const id = Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    setQueue(q => [...q, { id, ...spec }]);
    setPreviewId(id);
    setPrinted(null);
  };
  const removeQ = (id) => setQueue(q => q.filter(x => x.id !== id));
  const setQCopies = (id, d) => setQueue(q => q.map(x => x.id === id ? { ...x, copies: Math.max(1, x.copies + d) } : x));
  const clearQueue = () => { setQueue([]); setPreviewId(null); };

  const previewItem = queue.find(q => q.id === previewId) || queue[queue.length - 1] || null;

  const doPrint = () => {
    if (!totalLabels) return;
    setPrinted({ count: totalLabels, pages, sheet: sheet.name });
    setTimeout(() => window.print(), 60);
  };

  return (
    <div className="page page--wide lab-page fade-in">
      <div className="page-head">
        <div><h1 className="page-h1">Etiquetas</h1><p className="page-lede">Monte a fila de impressão e mande várias etiquetas — iguais ou diferentes — na mesma folha</p></div>
        <div className="row-wrap">
          <Button variant="ghost" icon="sliders" onClick={() => go('configuracoes', { tab: 'labels' })}>Modelos de folha</Button>
          <Button variant="outline" icon="fileText" onClick={doPrint} disabled={!totalLabels}>Gerar PDF</Button>
          <Button variant="default" icon="printer" onClick={doPrint} disabled={!totalLabels}>Imprimir{totalLabels ? ` ${totalLabels}×` : ''}</Button>
        </div>
      </div>

      <div className="toolbar">
        <div style={{ minWidth: 300 }}>
          <Select value={sheetId} onChange={setSheetId} options={sheetList.map(s => ({ value: s.id, label: `Folha: ${s.name} · ${s.roll ? 'rolo' : s.cols + '×' + s.rows} (${s.cols * s.rows}/folha)` }))} />
        </div>
        <div className="spacer" />
        <Button variant="default" icon="plus" onClick={() => setAddOpen(true)}>Adicionar etiqueta</Button>
      </div>

      <div className="lab-queue-grid">
        {/* MAIN: print queue as a list */}
        <Card style={{ overflow: 'hidden' }}>
          <CardHeader>
            <CardTitle>Fila de impressão</CardTitle>
            <div className="row" style={{ gap: 10 }}>
              <span className="muted" style={{ fontSize: 12.5 }}>{queue.length} item(ns) · {totalLabels} etiqueta{totalLabels !== 1 ? 's' : ''} · {pages} folha{pages > 1 ? 's' : ''}</span>
              {queue.length > 0 && <button className="notif-resolve" onClick={clearQueue}>Limpar</button>}
            </div>
          </CardHeader>
          {queue.length === 0 ? (
            <div style={{ padding: '12px 0' }}><Empty icon="tag" title="Fila vazia" hint="Clique em “Adicionar etiqueta” para montar a primeira." /></div>
          ) : (
            <div className="lab-q-scroll">
            <table className="om-table">
              <thead><tr><th style={{ width: 40 }}>#</th><th>Etiqueta</th><th>Tipo</th><th>Tamanho</th><th className="om-td-right">Quantidade</th><th></th></tr></thead>
              <tbody>
                {queue.map((q, idx) => (
                  <tr key={q.id} className={cn('om-row-click', previewId === q.id && 'om-row-active')} onClick={() => setPreviewId(q.id)}>
                    <td className="muted">{idx + 1}</td>
                    <td><div className="item-cell"><div className="lab-q-thumb"><Icon name={q.tpl.icon} size={15} /></div><div style={{ minWidth: 0 }}><div className="cell-title">{q.title}</div><div className="cell-sub">{q.entity.code || ''}</div></div></div></td>
                    <td><Badge tone="neutral">{q.sub}</Badge></td>
                    <td className="muted mono" style={{ fontSize: 12 }}>{q.tpl.w}×{q.tpl.h}mm</td>
                    <td className="om-td-right" onClick={e => e.stopPropagation()}>
                      <div className="lab-stepper" style={{ height: 30, marginLeft: 'auto' }}>
                        <button style={{ width: 28, height: 28 }} onClick={() => setQCopies(q.id, -1)}><Icon name="minus" size={13} /></button>
                        <input style={{ width: 38, height: 28 }} value={q.copies} readOnly />
                        <button style={{ width: 28, height: 28 }} onClick={() => setQCopies(q.id, +1)}><Icon name="plus" size={13} /></button>
                      </div>
                    </td>
                    <td className="om-td-right" onClick={e => e.stopPropagation()}><button className="wf-handle-btn" onClick={() => removeQ(q.id)}><Icon name="x" size={15} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
          {queue.length > 0 && (
            <div style={{ padding: '14px 16px', borderTop: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Button variant="outline" size="sm" icon="plus" onClick={() => setAddOpen(true)}>Adicionar outra</Button>
              <div className="spacer" style={{ flex: 1 }} />
              <Button variant="default" icon="printer" onClick={doPrint}>Imprimir {totalLabels} · {pages} folha{pages > 1 ? 's' : ''}</Button>
            </div>
          )}
          {printed && <div style={{ margin: '0 16px 16px', background: 'hsl(var(--ok-bg))', color: 'hsl(var(--ok))', padding: '9px 12px', borderRadius: 8, fontSize: 12.5, display: 'flex', gap: 8 }}><Icon name="check" size={15} /> {printed.count} etiqueta(s) em {printed.pages} folha(s) de {printed.sheet} enviadas para impressão.</div>}
        </Card>

        {/* SIDE: sheet fill (fixed, no scroll) */}
        <div className="lab-side">
          <Card className="lab-folha-card">
            <CardHeader><CardTitle>Folha</CardTitle><span className="muted" style={{ fontSize: 12 }}>{sheet.name} · {sheet.roll ? 'rolo' : sheet.cols + '×' + sheet.rows}</span></CardHeader>
            <CardContent style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="lab-fill lab-fill--big" style={{ gridTemplateColumns: `repeat(${Math.min(sheet.cols, 8)}, 1fr)` }}>
                {Array.from({ length: Math.min(perSheet, 48) }).map((_, i) => {
                  const isSkip = skip.includes(i); const hasLabel = assignment[i] != null;
                  const hi = hasLabel && cellQid[i] === previewId;
                  return (
                    <button key={i} type="button" title={isSkip ? 'Posição já usada — clique para liberar' : 'Clique para pular (folha já usada)'}
                      onClick={() => setSkip(s => s.includes(i) ? s.filter(x => x !== i) : [...s, i])}
                      className={cn('lab-fill-cell', isSkip ? 'lab-fill-cell--skip' : hasLabel ? 'lab-fill-cell--on' : 'lab-fill-cell--free', hi && 'lab-fill-cell--hi')}>
                      {isSkip ? <Icon name="x" size={13} /> : hasLabel ? <span className="lab-fill-n">{cellNum[i]}</span> : null}
                    </button>
                  );
                })}
              </div>
              <div className="row between" style={{ marginTop: 12 }}>
                <span className="muted" style={{ fontSize: 12 }}>{skipCount > 0 ? `${skipCount} pulada${skipCount > 1 ? 's' : ''} · ` : ''}{totalLabels ? `${Math.max(0, freeTotal)} livre${freeTotal === 1 ? '' : 's'} · ${pages} folha${pages > 1 ? 's' : ''}` : perSheet + ' posições'}</span>
                {skipCount > 0 && <button className="notif-resolve" onClick={() => setSkip([])}>Limpar puladas</button>}
              </div>
              <div className="muted" style={{ fontSize: 11.5, marginTop: 8, display: 'flex', gap: 6, alignItems: 'flex-start' }}><Icon name="alertCircle" size={13} /> Folha já usada? Clique nas posições para pulá-las.</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AddLabelModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={addToQueue} />

      {/* hidden print sheet */}
      <div id="print-sheet">
        {totalLabels > 0 && Array.from({ length: pages }).map((_, pageIdx) => (
          <div key={pageIdx} style={{ width: `${sheet.pageW}mm`, height: sheet.roll ? `${sheet.pageH}mm` : '297mm', position: 'relative', pageBreakAfter: 'always', background: '#fff' }}>
            {Array.from({ length: perSheet }).map((_, c) => {
              const global = pageIdx * perSheet + c;
              const spec = assignment[global];
              if (!spec) return null;
              const row = Math.floor(c / sheet.cols), col = c % sheet.cols;
              return (
                <div key={c} style={{ position: 'absolute', left: `${sheet.mLeft + col * (sheet.labelW + sheet.gutX)}mm`, top: `${sheet.mTop + row * (sheet.labelH + sheet.gutY)}mm`, width: `${sheet.labelW}mm`, height: `${sheet.labelH}mm` }}>
                  <PrintLabel spec={spec} sheet={sheet} />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
window.Etiquetas = Etiquetas;
window.Code128 = Code128;
