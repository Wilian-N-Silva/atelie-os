/* ============================================================
   screen_operacao.jsx — Modo Operação (bench, scanner + manual)
   Flow per manual: bipar pedido → ação → cada item → finalizar.
   Manual fallback (+1/−1, marcar, desfazer) sempre disponível.
   ============================================================ */
const PACK_CHECKLIST = [
  'Produto correto', 'Aroma correto', 'Lote correto',
  'Vidro sem defeito · tampa correta', 'Etiqueta inferior aplicada',
  'Dust cover · cartão incluído', 'Produto protegido · caixa fechada',
  'Etiqueta de envio aplicada',
];

function ProgressRing({ pct, size = 44 }) {
  const r = (size - 6) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#23252c" strokeWidth="5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--op-amber)" strokeWidth="5"
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100}
        style={{ transition: 'stroke-dashoffset .35s ease' }} />
    </svg>
  );
}

function ModoOperacao({ go, route }) {
  const { orders, findItem, items } = window.DB;
  const [mode, setMode] = React.useState(route.mode || 'separacao');
  const order = React.useMemo(() => {
    return orders.find(o => o.id === route.order)
      || orders.find(o => ['pago', 'a_separar'].includes(o.status))
      || orders[0];
  }, [route.order]);

  const expected = order.items.map(it => ({ ...findItem(it.sku), need: it.qty }));
  const [counts, setCounts] = React.useState(() => Object.fromEntries(expected.map(e => [e.sku, 0])));
  const [log, setLog] = React.useState([]);
  const [fb, setFb] = React.useState(null); // {kind:'ok'|'bad', name, sub, fix}
  const [scanState, setScanState] = React.useState('focus'); // focus|ok|bad
  const [input, setInput] = React.useState('');
  const [checks, setChecks] = React.useState(() => PACK_CHECKLIST.map(() => false));
  const [finished, setFinished] = React.useState(false);
  const inputRef = React.useRef(null);
  const flashTimer = React.useRef(null);

  const now = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const totalNeed = expected.reduce((s, e) => s + e.need, 0);
  const totalDone = expected.reduce((s, e) => s + counts[e.sku], 0);
  const pct = totalNeed ? Math.round((totalDone / totalNeed) * 100) : 0;
  const complete = totalDone >= totalNeed;

  const refocus = () => { if (mode !== 'embalagem' && inputRef.current) inputRef.current.focus(); };
  React.useEffect(() => { refocus(); }, [mode]);

  const flash = (state) => {
    setScanState(state);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setScanState('focus'), 700);
  };
  const pushLog = (entry) => setLog(l => [{ ...entry, t: now() }, ...l].slice(0, 14));

  const bip = (raw) => {
    const q = String(raw).trim().toLowerCase();
    if (!q) return;
    setInput('');
    // simulated special errors
    if (q === '__cura') {
      setFb({ kind: 'bad', name: 'Lote em cura', sub: 'Lote 020300000613 · Baunilha & Âmbar ainda descansando', fix: 'Use outro lote liberado ou aguarde a cura terminar.' });
      flash('bad'); pushLog({ kind: 'bad', label: 'Lote em cura — bloqueado' }); return;
    }
    // match expected
    const hit = expected.find(e => e.code === q || e.sku.toLowerCase() === q || e.name.toLowerCase().includes(q));
    if (hit) {
      if (counts[hit.sku] >= hit.need) {
        setFb({ kind: 'bad', name: 'Quantidade excedida', sub: `${hit.name} ${hit.variant} — já separou ${hit.need}/${hit.need}`, fix: 'Confira se o pedido está correto.' });
        flash('bad'); pushLog({ kind: 'bad', label: `Excedido: ${hit.name}` }); return;
      }
      setCounts(c => ({ ...c, [hit.sku]: c[hit.sku] + 1 }));
      setFb({ kind: 'ok', name: `${hit.name} ${hit.variant}`, sub: `${counts[hit.sku] + 1} de ${hit.need} · ${hit.sku}` });
      flash('ok'); pushLog({ kind: 'ok', label: `${hit.name} ${hit.variant}`, sku: hit.sku }); return;
    }
    // exists but not in this order → item errado
    const other = items.find(i => i.code === q || i.sku.toLowerCase() === q);
    if (other) {
      setFb({ kind: 'bad', name: 'Item errado', sub: `${other.name} não pertence a ${order.num}`, fix: 'Separe o item correto da lista ao lado.' });
      flash('bad'); pushLog({ kind: 'bad', label: `Item errado: ${other.sku}` }); return;
    }
    // unknown
    setFb({ kind: 'bad', name: 'Código desconhecido', sub: `“${raw}” não foi encontrado`, fix: 'Busque manualmente ou confira a etiqueta.' });
    flash('bad'); pushLog({ kind: 'bad', label: 'Código desconhecido' });
  };

  const adjust = (sku, d) => {
    setCounts(c => {
      const e = expected.find(x => x.sku === sku);
      const nv = Math.max(0, Math.min(e.need, c[sku] + d));
      if (nv === c[sku]) return c;
      pushLog({ kind: d > 0 ? 'ok' : 'neutral', label: `${d > 0 ? '+1' : '−1'} ${e.name}`, sku });
      return { ...c, [sku]: nv };
    });
  };
  const markComplete = (sku) => {
    const e = expected.find(x => x.sku === sku);
    setCounts(c => ({ ...c, [sku]: e.need }));
    pushLog({ kind: 'ok', label: `Completo: ${e.name}`, sku });
  };
  const undo = () => {
    const last = log[0];
    if (!last) return;
    if (last.kind === 'ok' && last.sku) setCounts(c => ({ ...c, [last.sku]: Math.max(0, c[last.sku] - 1) }));
    setLog(l => l.slice(1));
    setFb(null);
  };

  const exit = () => go(route.order ? 'pedidos' : 'hoje', route.order ? { open: order.id } : {});

  const modeLabel = { separacao: 'Separação de pedido', conferencia: 'Conferência', embalagem: 'Embalagem' }[mode];
  const checksDone = checks.filter(Boolean).length;
  const packComplete = checksDone >= PACK_CHECKLIST.length;

  return (
    <div className="op" onClick={refocus}>
      {/* header */}
      <div className="op-head">
        <button className="op-exit" onClick={exit}><Icon name="x" size={18} /> Sair</button>
        <div className="op-doc">
          <span className="op-doc-mode">{modeLabel}</span>
          <span className="op-doc-title">{order.num} · {order.customerName}</span>
        </div>
        <div style={{ flex: 1 }} />
        <div className="op-modes">
          {[['separacao','Separação','scan'],['conferencia','Conferência','listChecks'],['embalagem','Embalagem','package2']].map(([m,l,ic]) => (
            <button key={m} className={cn('op-mode', mode === m && 'op-mode--on')} onClick={() => setMode(m)}>
              <Icon name={ic} size={15} />{l}
            </button>
          ))}
        </div>
        <div className="op-prog">
          <div className="op-prog-ring"><ProgressRing pct={mode === 'embalagem' ? Math.round(checksDone/PACK_CHECKLIST.length*100) : pct} />
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 }}>
              {mode === 'embalagem' ? `${checksDone}/${PACK_CHECKLIST.length}` : `${pct}%`}
            </div>
          </div>
        </div>
      </div>

      {mode !== 'embalagem' && (
        <div className="op-scan">
          <div className="op-scanwrap">
            <div className={cn('op-scanfield', `op-scanfield--${scanState}`)}>
              {scanState === 'focus' && <div className="op-scanline-anim" style={{ animation: 'scanline 2.4s linear infinite' }} />}
              <Icon name={scanState === 'ok' ? 'check' : scanState === 'bad' ? 'alert' : 'scan'} size={28}
                className="op-scanicon" style={{ color: scanState === 'ok' ? 'var(--op-ok)' : scanState === 'bad' ? 'var(--op-bad)' : 'var(--op-amber)' }} />
              <input ref={inputRef} className="op-scaninput" value={input} autoFocus
                placeholder="Bipe o código ou digite SKU / nome…"
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') bip(input); }} />
              <span className="op-scanhint"><span className="op-pulse" /> Leitor pronto</span>
            </div>
            <div className="op-sim">
              <span className="op-sim-label">Simular leitura:</span>
              {expected.map(e => (
                <button key={e.sku} className="op-chip" onClick={() => bip(e.code)}>
                  <Icon name="scan" size={13} />{e.sku}
                </button>
              ))}
              <button className="op-chip op-chip--bad" onClick={() => bip('__cura')}><Icon name="thermometer" size={13} />lote em cura</button>
              <button className="op-chip op-chip--bad" onClick={() => bip(items.find(i => i.type==='pa' && !expected.some(e=>e.sku===i.sku)).code)}><Icon name="alert" size={13} />item errado</button>
            </div>
          </div>
        </div>
      )}

      {/* body */}
      {mode === 'embalagem' ? (
        <div className="op-body" style={{ gridTemplateColumns: '1fr' }}>
          <div className="op-col" style={{ maxWidth: 760, margin: '0 auto', width: '100%' }}>
            <div className="op-coltitle"><span>Checklist de embalagem · {order.num}</span><span>{checksDone}/{PACK_CHECKLIST.length}</span></div>
            {PACK_CHECKLIST.map((label, i) => (
              <div key={i} className={cn('op-item', checks[i] && 'op-item--done')} onClick={() => setChecks(c => c.map((v, j) => j === i ? !v : v))} style={{ cursor: 'pointer' }}>
                <div className="op-item-check">{checks[i] && <Icon name="check" size={18} strokeWidth={3} />}</div>
                <div className="op-item-body"><div className="op-item-name" style={{ fontSize: 15 }}>{label}</div></div>
              </div>
            ))}
            <div style={{ color: 'var(--op-mut)', fontSize: 13, marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
              <Icon name="alertCircle" size={15} /> O pedido só vai para “pronto para envio” com o checklist completo.
            </div>
          </div>
        </div>
      ) : (
        <div className="op-body">
          <div className="op-col">
            <div className="op-coltitle"><span>Itens esperados</span><span>{totalDone} / {totalNeed} bipados</span></div>
            {expected.map(e => {
              const done = counts[e.sku] >= e.need;
              return (
                <div key={e.sku} className={cn('op-item', done && 'op-item--done')}>
                  <div className="op-item-check">{done && <Icon name="check" size={18} strokeWidth={3} />}</div>
                  <div className="op-item-body">
                    <div className="op-item-name">{e.name} <span style={{ color: 'var(--op-mut)', fontWeight: 500 }}>{e.variant}</span></div>
                    <div className="op-item-sku">{e.sku} · {e.code}</div>
                  </div>
                  <div className="op-item-qty">{counts[e.sku]}<small> / {e.need}</small></div>
                  <div className="op-item-ctrl">
                    <button className="op-qbtn" onClick={() => adjust(e.sku, -1)} disabled={counts[e.sku] === 0}><Icon name="minus" size={16} /></button>
                    <button className="op-qbtn" onClick={() => adjust(e.sku, +1)} disabled={done}><Icon name="plus" size={16} /></button>
                    <button className="op-qbtn" onClick={() => markComplete(e.sku)} disabled={done} title="Marcar completo"><Icon name="check" size={16} /></button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="op-col op-col--right">
            <div className="op-coltitle">Última leitura</div>
            <div className={cn('op-feedback', fb && `op-feedback--${fb.kind}`)}>
              {!fb && <div className="op-fb-empty">Aguardando leitura…<br /><span style={{ fontSize: 13 }}>Bipe um item ou use os botões.</span></div>}
              {fb && (
                <React.Fragment>
                  <div className={cn('op-fb-top', fb.kind === 'ok' ? 'op-fb-ok' : 'op-fb-bad')}>
                    <Icon name={fb.kind === 'ok' ? 'checkCircle' : 'alertCircle'} size={17} />
                    {fb.kind === 'ok' ? 'Confirmado' : 'Bloqueado'}
                  </div>
                  <div className="op-fb-name">{fb.name}</div>
                  <div className="op-fb-sub">{fb.sub}</div>
                  {fb.fix && <div className="op-fb-fix"><Icon name="arrowRight" size={15} />{fb.fix}</div>}
                </React.Fragment>
              )}
            </div>

            <div className="op-coltitle" style={{ marginTop: 4 }}>Histórico recente</div>
            <div className="op-log">
              {log.length === 0 && <div style={{ color: '#4a4d57', fontSize: 13 }}>Nenhuma ação ainda.</div>}
              {log.map((e, i) => (
                <div key={i} className="op-logrow">
                  <span className="op-logdot" style={{ background: e.kind === 'ok' ? 'var(--op-ok)' : e.kind === 'bad' ? 'var(--op-bad)' : 'var(--op-mut)' }} />
                  {e.label}
                  <span className="op-logtime">{e.t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* footer */}
      <div className="op-foot">
        {mode !== 'embalagem' && <button className="op-fbtn" onClick={undo} disabled={!log.length}><Icon name="undo" size={18} /> Desfazer</button>}
        <div style={{ flex: 1, color: 'var(--op-mut)', fontSize: 13.5 }}>
          {mode === 'embalagem'
            ? (packComplete ? 'Checklist completo — pode marcar pronto para envio.' : (PACK_CHECKLIST.length - checksDone === 1 ? 'Falta 1 item do checklist.' : `Faltam ${PACK_CHECKLIST.length - checksDone} itens do checklist.`))
            : (complete ? 'Tudo bipado — pode finalizar a etapa.' : (totalNeed - totalDone === 1 ? 'Falta 1 item para finalizar.' : `Faltam ${totalNeed - totalDone} itens para finalizar.`))}
        </div>
        {mode === 'embalagem'
          ? <button className="op-fbtn op-fbtn--primary" disabled={!packComplete} onClick={() => setFinished(true)}><Icon name="truck" size={18} /> Marcar pronto p/ envio</button>
          : <button className="op-fbtn op-fbtn--primary" disabled={!complete} onClick={() => setFinished(true)}><Icon name="check" size={18} /> Finalizar {mode === 'conferencia' ? 'conferência' : 'separação'}</button>}
      </div>

      {finished && (
        <div className="op-done">
          <div className="op-done-card">
            <div className="op-done-ring"><Icon name="check" size={42} strokeWidth={2.4} /></div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
              {mode === 'embalagem' ? 'Pedido pronto para envio' : mode === 'conferencia' ? 'Conferência concluída' : 'Separação concluída'}
            </div>
            <div style={{ color: 'var(--op-mut)', fontSize: 14.5, marginBottom: 24 }}>
              {order.num} · {order.customerName}<br />
              {mode === 'embalagem' ? 'Checklist completo registrado.' : `${totalNeed} itens conferidos sem erros.`}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              {mode === 'separacao'
                ? <button className="op-fbtn op-fbtn--amber" onClick={() => { setFinished(false); setMode('embalagem'); }}><Icon name="package2" size={18} /> Ir para embalagem</button>
                : <button className="op-fbtn op-fbtn--amber" onClick={exit}><Icon name="check" size={18} /> Concluir</button>}
              <button className="op-fbtn" onClick={exit}>Voltar aos pedidos</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
window.ModoOperacao = ModoOperacao;
