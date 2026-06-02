/* ============================================================
   screen_settings.jsx — Configurações shell with sub-nav
   ============================================================ */
function Configuracoes({ go, route, brand, setBrand, workflows, setWorkflows, sheets, setSheets, currentUser }) {
  const tab = route.tab || 'branding';
  const setTab = (t) => go('configuracoes', { tab: t });

  const NAV = [
    { id: 'branding', label: 'Aparência da marca', sub: 'Cores, tema, logo', icon: 'palette' },
    { id: 'users', label: 'Usuários e acessos', sub: 'Equipe, papéis, convites', icon: 'user' },
    { id: 'workflows', label: 'Fluxos e Kanban', sub: 'Etapas configuráveis', icon: 'workflow' },
    { id: 'labels', label: 'Modelos de etiqueta', sub: 'Folhas e tamanhos', icon: 'tag' },
  ];

  return (
    <div className="page page--wide fade-in">
      <div className="page-head">
        <div><h1 className="page-h1">Configurações</h1><p className="page-lede">Personalize o sistema para o seu ateliê — tudo white-label</p></div>
      </div>

      <div className="set-layout">
        <nav className="set-nav">
          {NAV.map(n => (
            <button key={n.id} className={cn('set-nav-item', tab === n.id && 'set-nav-item--on')} onClick={() => setTab(n.id)}>
              <Icon name={n.icon} size={18} className="muted" />
              <div><div>{n.label}</div><div className="set-nav-item-sub">{n.sub}</div></div>
            </button>
          ))}
        </nav>

        <div>
          {tab === 'branding' && <SettingsBranding brand={brand} setBrand={setBrand} />}
          {tab === 'users' && <SettingsUsers currentUser={currentUser} />}
          {tab === 'workflows' && <SettingsWorkflows workflows={workflows} setWorkflows={setWorkflows} />}
          {tab === 'labels' && <SettingsLabels sheets={sheets} setSheets={setSheets} />}
        </div>
      </div>
    </div>
  );
}
window.Configuracoes = Configuracoes;
