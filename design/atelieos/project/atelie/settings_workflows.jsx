/* ============================================================
   settings_workflows.jsx — Fluxos e Kanban configuráveis
   Nome visível separado da chave técnica + comportamentos.
   ============================================================ */
const AUTO_LABELS = {
  none: 'Nenhuma', reserve_stock: 'Reservar estoque', release_reservation: 'Liberar reserva',
  start_production: 'Iniciar produção', consume_materials: 'Consumir materiais', create_output_lot: 'Gerar lote',
  block_stock_availability: 'Bloquear venda', release_stock_availability: 'Liberar para venda',
  request_quality_review: 'Pedir revisão', mark_ready_to_ship: 'Pronto p/ envio', mark_shipped: 'Marcar enviado', mark_delivered: 'Marcar entregue',
};

function SettingsWorkflows({ workflows, setWorkflows }) {
  const cloneWf = (o) => JSON.parse(JSON.stringify(o));
  const { workflowPresets, AUTOMATIONS, STEP_COLORS } = window.DB;
  const [entity, setEntity] = React.useState('production');
  const [colorPop, setColorPop] = React.useState(null);
  const [saved, setSaved] = React.useState(false);

  const steps = workflows[entity] || [];
  const update = (next) => setWorkflows(w => ({ ...w, [entity]: next }));

  const setStep = (i, patch) => update(steps.map((s, j) => j === i ? { ...s, ...patch } : s));
  const move = (i, dir) => {
    const j = i + dir; if (j < 0 || j >= steps.length) return;
    const next = steps.slice(); const tmp = next[i]; next[i] = next[j]; next[j] = tmp; update(next);
  };
  const archive = (i) => update(steps.filter((_, j) => j !== i));
  const addStep = () => update([...steps, { key: 'etapa_' + (steps.length + 1), label: 'Nova etapa', color: 'neutral', automation: 'none' }]);
  const loadPreset = (id) => {
    const p = workflowPresets[entity].find(x => x.id === id);
    if (p) update(cloneWf(p.steps));
  };
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 1800); };

  const toneVar = (t) => ({ neutral: '--muted-foreground', info: '--info', cure: '--cure', warn: '--warn', ok: '--ok', bad: '--bad' }[t] || '--muted-foreground');

  const FLAGS = [
    ['blocks_availability', 'Bloqueia venda'],
    ['requires_checklist', 'Exige checklist'],
    ['requires_reason', 'Exige motivo'],
    ['requires_quantity_input', 'Pede quantidade'],
  ];

  return (
    <div onClick={() => setColorPop(null)}>
      <div className="row between" style={{ marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div className="set-section-title">Fluxos e Kanban</div>
          <div className="set-section-lede" style={{ marginBottom: 0 }}>Configure as etapas. O sistema usa a <b>chave técnica</b>, então renomear não quebra nada.</div>
        </div>
        <Button variant="default" icon={saved ? 'check' : 'workflow'} onClick={save}>{saved ? 'Salvo' : 'Salvar fluxo'}</Button>
      </div>

      <div className="toolbar">
        <Tabs tabs={[{ value: 'production', label: 'Produção', icon: 'producao' }, { value: 'order', label: 'Pedidos', icon: 'pedidos' }]} value={entity} onChange={setEntity} />
        <div className="spacer" />
        <select className="om-input" style={{ width: 'auto' }} value="" onChange={e => e.target.value && loadPreset(e.target.value)}>
          <option value="">Carregar preset…</option>
          {workflowPresets[entity].map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <Button variant="outline" icon="plus" onClick={addStep}>Etapa</Button>
      </div>

      <div style={{ background: 'hsl(var(--info-bg))', color: 'hsl(var(--info))', padding: '10px 13px', borderRadius: 10, fontSize: 12.5, marginBottom: 16, display: 'flex', gap: 8 }}>
        <Icon name="alertCircle" size={15} />
        <div>Ex.: você pode renomear <b>“Em cura”</b> para <b>“Secagem”</b> ou <b>“Resfriamento”</b>. A regra interna segue a chave <span className="wf-key">{steps.find(s => s.blocks_availability) ? steps.find(s => s.blocks_availability).key : 'waiting_release'}</span>, que bloqueia a venda.</div>
      </div>

      {steps.map((s, i) => (
        <div className="wf-step" key={i}>
          <div className="wf-step-handle">
            <button className="wf-handle-btn" disabled={i === 0} onClick={() => move(i, -1)}><Icon name="chevronUp" size={14} /></button>
            <button className="wf-handle-btn" disabled={i === steps.length - 1} onClick={() => move(i, 1)}><Icon name="chevronDown" size={14} /></button>
          </div>
          <div style={{ position: 'relative' }}>
            <div className="wf-color" style={{ background: `hsl(var(${toneVar(s.color)}))` }} onClick={(e) => { e.stopPropagation(); setColorPop(colorPop === i ? null : i); }} />
            {colorPop === i && (
              <div className="wf-color-pop" onClick={e => e.stopPropagation()}>
                {STEP_COLORS.map(c => (
                  <div key={c} className={cn('wf-color-opt', s.color === c && 'wf-color-opt--on')} style={{ background: `hsl(var(${toneVar(c)}))` }} onClick={() => { setStep(i, { color: c }); setColorPop(null); }} />
                ))}
              </div>
            )}
          </div>
          <div className="wf-step-main">
            <div className="row" style={{ gap: 8 }}>
              <input className="wf-label-input" value={s.label} onChange={e => setStep(i, { label: e.target.value })} />
              {s.is_initial && <Badge tone="info">inicial</Badge>}
              {s.is_final && <Badge tone="neutral">final</Badge>}
            </div>
            <div className="wf-flags">
              <span className="wf-key">{s.key}</span>
              {FLAGS.map(([k, label]) => (
                <button key={k} className={cn('wf-flag', s[k] && 'wf-flag--on')} onClick={() => setStep(i, { [k]: !s[k] })}>
                  <span className="wf-flag-dot" />{label}
                </button>
              ))}
              <select className="wf-auto" value={s.automation || 'none'} onChange={e => setStep(i, { automation: e.target.value })}>
                {AUTOMATIONS.map(a => <option key={a} value={a}>⚙ {AUTO_LABELS[a] || a}</option>)}
              </select>
            </div>
          </div>
          <button className="wf-handle-btn" onClick={() => archive(i)} title="Arquivar etapa" style={{ width: 30, height: 30 }}><Icon name="trash" size={15} /></button>
        </div>
      ))}

      <div className="muted" style={{ fontSize: 12, marginTop: 12, display: 'flex', gap: 7, alignItems: 'center' }}>
        <Icon name="lock" size={14} /> Etapas em uso por registros não são apagadas — viram arquivadas e pedem migração.
      </div>
    </div>
  );
}
window.SettingsWorkflows = SettingsWorkflows;
