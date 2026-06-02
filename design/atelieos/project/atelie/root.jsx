/* ============================================================
   root.jsx — session gate (loads LAST).
   Routes: not authed → AuthFlow · authed & !onboarded →
   Onboarding · authed & onboarded → Workspace (the app).
   Session persisted in localStorage 'atelie-session'.
   ============================================================ */

function Root() {
  const [session, setSession] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('atelie-session')); } catch (e) { return null; }
  });

  // apply saved theme + brand so auth/onboarding match the app skin
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', localStorage.getItem('atelie-theme') === 'dark');
    try {
      const tw = JSON.parse(localStorage.getItem('om-tweaks') || 'null');
      const density = tw && tw.density === 'compact' ? 'compact' : 'comfortable';
      document.documentElement.setAttribute('data-density', density);
    } catch (e) {}
    if (window.Theme) window.Theme.loadSaved();
  }, []);

  const persist = (s) => {
    if (s) localStorage.setItem('atelie-session', JSON.stringify(s));
    else localStorage.removeItem('atelie-session');
    setSession(s);
  };

  const onAuthed = (s) => persist(s);
  const onDone = ({ companyName }) => persist({ ...session, companyName, onboarded: true });
  const onSignOut = () => persist(null);

  if (!session) return <AuthFlow onAuthed={onAuthed} />;
  if (!session.onboarded) return <Onboarding user={session.user} onDone={onDone} />;
  return <Workspace session={session} onSignOut={onSignOut} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
