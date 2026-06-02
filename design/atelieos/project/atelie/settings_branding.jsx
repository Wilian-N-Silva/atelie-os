/* ============================================================
   settings_branding.jsx — Aparência da marca (white-label)
   ============================================================ */
const COLOR_FIELDS = [
  ['primary', 'Primária', 'ações, destaques'],
  ['primaryForeground', 'Texto da primária', 'sobre a primária'],
  ['background', 'Fundo', 'fundo do app'],
  ['foreground', 'Texto', 'texto principal'],
  ['card', 'Cartão', 'fundo de cartões'],
  ['accent', 'Acento', 'realces sutis'],
  ['secondary', 'Secundária', 'botões neutros'],
  ['muted', 'Suave', 'fundos discretos'],
  ['border', 'Borda', 'linhas e divisórias'],
  ['success', 'Sucesso', 'estados positivos'],
  ['warning', 'Alerta', 'atenção'],
  ['danger', 'Erro', 'destrutivo'],
  ['info', 'Informação', 'neutro informativo'],
];

function clone(o) { return JSON.parse(JSON.stringify(o)); }

function ThemePreview({ theme }) {
  const c = theme.colors;
  return (
    <div className="theme-preview">
      <div className="block-label" style={{ marginBottom: 10 }}>Pré-visualização</div>
      <div className="theme-preview-shell" style={{ borderColor: c.border, background: c.background, color: c.foreground }}>
        <div className="tp-bar" style={{ background: c.sidebarBackground || c.primary, color: '#fff' }}>
          <span style={{ width: 16, height: 16, borderRadius: 5, background: c.accent, display: 'inline-block' }} />
          {theme.name || 'Tema'}
        </div>
        <div className="tp-body">
          <div className="tp-card" style={{ background: c.card, borderColor: c.border, color: c.foreground }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Vela Lavanda Francesa</div>
            <div style={{ fontSize: 12, color: c.mutedForeground, marginTop: 2 }}>156 ml · em estoque</div>
            <div style={{ display: 'flex', gap: 7, marginTop: 11, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="tp-btn" style={{ background: c.primary, color: c.primaryForeground }}>Imprimir etiqueta</button>
              <button className="tp-btn" style={{ background: c.secondary, color: c.secondaryForeground }}>Editar</button>
              <span className="tp-chip" style={{ background: c.success, color: '#fff' }}>Liberado</span>
              <span className="tp-chip" style={{ background: c.warning, color: '#fff' }}>Em cura</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsBranding({ brand, setBrand }) {
  const { brandPresets } = window.DB;
  const [draft, setDraft] = React.useState(() => brand ? clone(brand) : clone(brandPresets[0]));
  const [tab, setTab] = React.useState('form'); // form | json
  const [jsonText, setJsonText] = React.useState(() => JSON.stringify(draft, null, 2));
  const [jsonErr, setJsonErr] = React.useState(null);
  const [jsonOk, setJsonOk] = React.useState(false);
  const [logo, setLogo] = React.useState(() => localStorage.getItem('atelie-logo') || null);
  const [applied, setApplied] = React.useState(false);

  const applyDraft = (d) => {
    window.Theme.apply(d);
    setBrand(d);
    setApplied(true);
    setTimeout(() => setApplied(false), 1800);
  };
  const choosePreset = (p) => { const d = clone(p); setDraft(d); setJsonText(JSON.stringify(d, null, 2)); applyDraft(d); };
  const setColor = (key, val) => {
    setDraft(d => { const nd = clone(d); nd.colors[key] = val; nd.name = nd.name && !nd.custom ? nd.name + ' (editado)' : nd.name; nd.custom = true; return nd; });
  };
  const applyJson = () => {
    try {
      const obj = JSON.parse(jsonText);
      const errs = window.Theme.validate(obj);
      if (errs.length) { setJsonErr(errs); setJsonOk(false); return; }
      setJsonErr(null); setJsonOk(true); setDraft(obj); applyDraft(obj);
      setTimeout(() => setJsonOk(false), 2000);
    } catch (e) { setJsonErr(['JSON inválido: ' + e.message]); setJsonOk(false); }
  };
  const restore = () => { window.Theme.restore(); setBrand(null); const d = clone(brandPresets[0]); setDraft(d); setJsonText(JSON.stringify(d, null, 2)); };
  const onLogo = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { setLogo(r.result); localStorage.setItem('atelie-logo', r.result); };
    r.readAsDataURL(f);
  };
  const removeLogo = () => { setLogo(null); localStorage.removeItem('atelie-logo'); };

  // keep json text in sync when editing via form
  React.useEffect(() => { if (tab === 'json') setJsonText(JSON.stringify(draft, null, 2)); }, [tab]);

  return (
    <div>
      <div className="row between" style={{ marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div className="set-section-title">Aparência da marca</div>
          <div className="set-section-lede" style={{ marginBottom: 0 }}>Personalize cores, logo e tema. As mudanças valem para todo o sistema, sem recompilar.</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Button variant="ghost" icon="rotate" onClick={restore}>Restaurar padrão</Button>
          <Button variant="default" icon={applied ? 'check' : 'palette'} onClick={() => applyDraft(draft)}>{applied ? 'Aplicado' : 'Aplicar tema'}</Button>
        </div>
      </div>

      {/* presets */}
      <Card style={{ marginBottom: 'var(--gap)' }}>
        <CardHeader><CardTitle>Temas prontos</CardTitle><span className="muted" style={{ fontSize: 12.5 }}>{brandPresets.length} presets · duplicáveis</span></CardHeader>
        <CardContent style={{ paddingTop: 8 }}>
          <div className="preset-grid">
            {brandPresets.map(p => {
              const on = draft && draft.name === p.name && !draft.custom;
              return (
                <div key={p.id} className={cn('preset', on && 'preset--on')} onClick={() => choosePreset(p)}>
                  <div className="preset-swatches">
                    {['sidebarBackground','primary','accent','secondary','background'].map(k => <div key={k} style={{ background: p.colors[k] }} />)}
                  </div>
                  <div className="preset-meta">
                    <div><div className="preset-name">{p.name}</div><div className="muted" style={{ fontSize: 11 }}>{p.mode}</div></div>
                    {on && <Icon name="checkCircle" size={17} className="om-text--ok" />}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr', gap: 'var(--gap)', alignItems: 'start' }}>
        <Card>
          <CardHeader>
            <Tabs tabs={[{ value: 'form', label: 'Cores', icon: 'sliders' }, { value: 'json', label: 'JSON avançado', icon: 'code' }]} value={tab} onChange={setTab} />
          </CardHeader>
          <CardContent style={{ paddingTop: 12 }}>
            {tab === 'form' ? (
              <div>
                {COLOR_FIELDS.map(([key, label, hint]) => (
                  <div className="color-row" key={key}>
                    <button className="color-swatch-btn" style={{ background: draft.colors[key] || '#ccc' }}>
                      <input type="color" value={draft.colors[key] || '#cccccc'} onChange={e => setColor(key, e.target.value)} />
                    </button>
                    <div className="color-label">{label} <small>{hint}</small></div>
                    <Input className="color-hex" value={draft.colors[key] || ''} onChange={e => setColor(key, e.target.value)} />
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <div className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>Cole ou edite o JSON do tema. Cores em <span className="mono">#RRGGBB</span>.</div>
                <textarea className="json-editor" value={jsonText} onChange={e => { setJsonText(e.target.value); setJsonErr(null); }} spellCheck={false} />
                {jsonErr && <div className="json-err"><Icon name="alertCircle" size={15} /><div>{jsonErr.map((e, i) => <div key={i}>{e}</div>)}</div></div>}
                {jsonOk && <div className="json-ok"><Icon name="check" size={15} /> Tema válido e aplicado.</div>}
                <div className="row" style={{ gap: 8, marginTop: 12 }}>
                  <Button variant="default" icon="check" onClick={applyJson}>Validar e aplicar</Button>
                  <Button variant="ghost" onClick={() => setJsonText(JSON.stringify(draft, null, 2))}>Reverter edição</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 'var(--gap)' }}>
          <ThemePreview theme={draft} />

          <Card>
            <CardHeader><CardTitle>Logotipo</CardTitle></CardHeader>
            <CardContent style={{ paddingTop: 6 }}>
              <div className="logo-drop">
                <div className="logo-prev">{logo ? <img src={logo} alt="logo" /> : <Icon name="flame" size={22} className="muted" />}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Logo da empresa</div>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>PNG, JPG, WEBP ou SVG. Fallback: nome textual.</div>
                  <div className="row" style={{ gap: 8 }}>
                    <label className="om-btn om-btn--outline om-btn--sm" style={{ cursor: 'pointer' }}>
                      <Icon name="upload" size={14} /> Enviar
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onLogo} style={{ display: 'none' }} />
                    </label>
                    {logo && <Button variant="ghost" size="sm" icon="trash" onClick={removeLogo}>Remover</Button>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
window.SettingsBranding = SettingsBranding;
