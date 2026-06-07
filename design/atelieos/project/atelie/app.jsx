/* ============================================================
   app.jsx — root: routing, theme, density, mount
   ============================================================ */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "comfortable"
}/*EDITMODE-END*/;

function Placeholder({ name }) {
  return (
    <div className="page fade-in">
      <Empty icon="settings" title={`${name} — em construção`} hint="Esta tela faz parte do MVP e será detalhada na sequência." />
    </div>
  );
}

function Workspace({ session, onSignOut }) {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [theme, setTheme] = React.useState(() => localStorage.getItem('atelie-theme') || 'light');
  const [route, setRoute] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('atelie-route')) || { screen: 'hoje' }; }
    catch (e) { return { screen: 'hoje' }; }
  });
  const [cmdOpen, setCmdOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);

  // ---- white-label: branding, workflows, label sheets ----
  const [brand, setBrandState] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('atelie-brand')); } catch (e) { return null; }
  });
  React.useEffect(() => { window.Theme && window.Theme.loadSaved(); }, []);
  const setBrand = (b) => setBrandState(b);

  const [workflows, setWorkflowsState] = React.useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('atelie-workflows'));
      if (saved) return saved;
    } catch (e) {}
    return {
      production: JSON.parse(JSON.stringify(window.DB.workflowPresets.production[0].steps)),
      order: JSON.parse(JSON.stringify(window.DB.workflowPresets.order[0].steps)),
    };
  });
  const setWorkflows = (updater) => setWorkflowsState(w => {
    const next = typeof updater === 'function' ? updater(w) : updater;
    localStorage.setItem('atelie-workflows', JSON.stringify(next));
    return next;
  });

  const [sheets, setSheetsState] = React.useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('atelie-sheets'));
      if (saved && saved.length) return saved;
    } catch (e) {}
    return JSON.parse(JSON.stringify(window.DB.labelSheets));
  });
  const setSheets = (updater) => setSheetsState(s => {
    const next = typeof updater === 'function' ? updater(s) : updater;
    localStorage.setItem('atelie-sheets', JSON.stringify(next));
    return next;
  });

  // notification state (read/resolved) persisted; list generated dynamically
  const [notifState, setNotifState] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('atelie-notif')) || {}; } catch (e) { return {}; }
  });
  React.useEffect(() => { localStorage.setItem('atelie-notif', JSON.stringify(notifState)); }, [notifState]);

  const notifications = React.useMemo(
    () => window.DB.buildNotifications().map(n => ({ ...n, status: notifState[n.id] || 'unread' })),
    [notifState]
  );
  const unread = notifications.filter(n => n.status === 'unread').length;
  const markRead = (id) => setNotifState(s => (s[id] === 'resolved' ? s : { ...s, [id]: 'read' }));
  const markResolved = (id) => setNotifState(s => ({ ...s, [id]: 'resolved' }));
  const markAllRead = () => setNotifState(s => {
    const next = { ...s };
    notifications.forEach(n => { if (next[n.id] !== 'resolved') next[n.id] = 'read'; });
    return next;
  });

  // global ⌘K / Ctrl+K
  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmdOpen(o => !o); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  React.useEffect(() => {
    if (window.Theme) window.Theme.freezeTransitions();
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('atelie-theme', theme);
  }, [theme]);
  React.useEffect(() => {
    document.documentElement.setAttribute('data-density', t.density === 'compact' ? 'compact' : 'comfortable');
  }, [t.density]);
  React.useEffect(() => { localStorage.setItem('atelie-route', JSON.stringify(route)); }, [route]);

  const go = (screen, params = {}) => {
    setRoute({ screen, ...params });
    const c = document.querySelector('.content');
    if (c) c.scrollTop = 0;
  };

  const SCREENS = {
    hoje: window.Dashboard,
    pedidos: window.Pedidos,
    producao: window.Producao,
    estoque: window.Estoque,
    itens: window.Itens,
    receitas: window.Receitas,
    etiquetas: window.Etiquetas,
    ia: window.ConteudoIA,
    configuracoes: window.Configuracoes,
    manual: window.Manual,
  };

  const screenProps = { go, route };
  if (route.screen === 'producao') screenProps.workflow = workflows.production;
  if (route.screen === 'etiquetas') screenProps.sheets = sheets;
  if (route.screen === 'configuracoes') Object.assign(screenProps, { brand, setBrand, workflows, setWorkflows, sheets, setSheets, currentUser: session && session.user });

  // fullscreen Modo Operação (no shell)
  if (route.screen === 'operacao') {
    const Op = window.ModoOperacao;
    return (
      <React.Fragment>
        {Op ? <Op go={go} route={route} /> : <Placeholder name="Modo Operação" />}
        {cmdOpen && <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} go={go} />}
      </React.Fragment>
    );
  }

  const Screen = SCREENS[route.screen];
  return (
    <React.Fragment>
      <Shell route={route} go={go} theme={theme} setTheme={setTheme}
        unread={unread} onOpenCmd={() => setCmdOpen(true)} onOpenNotif={() => setNotifOpen(true)}
        user={session && session.user} company={session && session.companyName} onSignOut={onSignOut}>
        {Screen ? <Screen {...screenProps} /> : <Placeholder name={route.screen} />}
      </Shell>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} go={go} />
      {notifOpen && <NotifCenter notifications={notifications} unread={unread}
        markRead={markRead} markResolved={markResolved} markAllRead={markAllRead}
        go={go} onClose={() => setNotifOpen(false)} />}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Densidade" />
        <TweakRadio label="Espaçamento" value={t.density}
          options={['comfortable', 'compact']}
          onChange={(v) => setTweak('density', v)} />
        <TweakSection label="Tema" />
        <TweakRadio label="Aparência" value={theme}
          options={['light', 'dark']}
          onChange={(v) => setTheme(v)} />
      </TweaksPanel>
    </React.Fragment>
  );
}

window.Workspace = Workspace;
