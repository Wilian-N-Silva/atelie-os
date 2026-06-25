/* ============================================================
   auth.jsx — multi-tenant authentication
   Screens: login · signup (criar / convite) · link mágico ·
   recuperar senha. Exposes window.AuthFlow.
   onAuthed({ user, companyName, onboarded }) advances Root.
   ============================================================ */

const ROLE_OPTS = [
  { value: 'admin', label: 'Administrador(a)' },
  { value: 'operator', label: 'Operador(a)' },
];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function GoogleG({ className }) {
  return (
    <svg className={className} viewBox="0 0 48 48" width="17" height="17" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.5 13.2l7.8 6.1C12.2 13.3 17.6 9.5 24 9.5Z"/>
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.5c-.5 2.9-2.2 5.4-4.7 7l7.6 5.9c4.4-4.1 6.7-10.1 6.7-17.4Z"/>
      <path fill="#FBBC05" d="M10.3 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.3.8-4.7l-7.8-6.1C.9 16.2 0 20 0 24s.9 7.8 2.5 10.8l7.8-6.1Z"/>
      <path fill="#34A853" d="M24 48c6.2 0 11.5-2 15.3-5.5l-7.6-5.9c-2.1 1.4-4.8 2.3-7.7 2.3-6.4 0-11.8-3.8-13.7-9.2l-7.8 6.1C6.5 42.6 14.6 48 24 48Z"/>
    </svg>
  );
}

function PwField({ label, value, onChange, placeholder, autoComplete, forgot, onForgot, hint }) {
  const [show, setShow] = React.useState(false);
  return (
    <div>
      <div className="au-field-label">
        <span>{label}</span>
        {forgot && <button type="button" className="au-link au-link--muted" onClick={onForgot}>Esqueci minha senha</button>}
      </div>
      <div className="au-pw">
        <input className="om-input" type={show ? 'text' : 'password'} value={value}
          onChange={e => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete} />
        <button type="button" className="au-pw-eye" tabIndex={-1} onClick={() => setShow(s => !s)}
          title={show ? 'Ocultar' : 'Mostrar'}><Icon name={show ? 'eye' : 'lock'} size={16} /></button>
      </div>
      {hint && <div className="ff-hint">{hint}</div>}
    </div>
  );
}

function AuthErr({ children }) {
  if (!children) return null;
  return <div className="au-error"><Icon name="alertCircle" size={15} style={{ marginTop: 1 }} /><div>{children}</div></div>;
}

/* ---------------- Aside (neutral brand panel) ---------------- */
function AuthAside() {
  return (
    <aside className="au-aside">
      <div className="au-aside-grid" />
      <div className="au-brand">
        <div className="au-mark"><Icon name="flame" size={19} strokeWidth={2.2} /></div>
        <div>
          <div className="au-brand-name">Ateliê OS</div>
          <div className="au-brand-sub">Backoffice artesanal</div>
        </div>
      </div>

      <div className="au-aside-mid">
        <div className="au-headline">O sistema operacional do seu ateliê.</div>
        <div className="au-sub">Catálogo, estoque, produção, cura, pedidos e etiquetas — tudo em um lugar, no ritmo da sua bancada.</div>
        <div className="au-feats">
          <div className="au-feat">
            <div className="au-feat-ico"><Icon name="layers" size={15} /></div>
            <div><div className="au-feat-t">Multiempresa, white-label</div><div className="au-feat-d">Cada ateliê com sua marca, sua equipe e seus acessos.</div></div>
          </div>
          <div className="au-feat">
            <div className="au-feat-ico"><Icon name="scan" size={15} /></div>
            <div><div className="au-feat-t">Operação por scanner ou manual</div><div className="au-feat-d">Separe, confira e embale na velocidade da bancada.</div></div>
          </div>
          <div className="au-feat">
            <div className="au-feat-ico"><Icon name="droplet" size={15} /></div>
            <div><div className="au-feat-t">Lotes, cura e qualidade</div><div className="au-feat-d">Rastreabilidade do insumo ao pedido enviado.</div></div>
          </div>
        </div>
      </div>

      <div className="au-aside-foot">
        <span className="mono">v0.1.2 beta</span><span>·</span><span>© 2026 Ateliê OS</span>
      </div>
    </aside>
  );
}

function MobileBrand() {
  return (
    <div className="au-mobile-brand">
      <div className="au-mobile-mark"><Icon name="flame" size={17} strokeWidth={2.2} /></div>
      <div><div style={{ fontSize: 14, fontWeight: 650 }}>Ateliê OS</div></div>
    </div>
  );
}

/* ---------------- Login ---------------- */
function LoginScreen({ email, setEmail, onAuthed, go }) {
  const [pw, setPw] = React.useState('');
  const [err, setErr] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  const submit = (e) => {
    e && e.preventDefault();
    if (!EMAIL_RE.test(email)) return setErr('Digite um e-mail válido.');
    if (pw.length < 6) return setErr('A senha deve ter ao menos 6 caracteres.');
    setErr(null); setBusy(true);
    setTimeout(() => {
      onAuthed({ user: { name: 'Camila Ribeiro', email, role: 'owner' }, companyName: 'Instante Âmbar', onboarded: true });
    }, 480);
  };

  return (
    <div className="au-card">
      <MobileBrand />
      <div className="au-eyebrow">Bem-vinda de volta</div>
      <h1 className="au-title">Entrar no Ateliê OS</h1>
      <p className="au-lede">Acesse o backoffice do seu ateliê para continuar de onde parou.</p>

      <form className="au-form" onSubmit={submit}>
        <AuthErr>{err}</AuthErr>
        <div>
          <div className="au-field-label"><span>E-mail</span></div>
          <Input icon="user" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@atelie.com.br" autoComplete="email" />
        </div>
        <PwField label="Senha" value={pw} onChange={setPw} placeholder="••••••••" autoComplete="current-password" forgot onForgot={() => go('forgot')} />
        <Button type="submit" variant="default" size="lg" className="au-submit" disabled={busy} iconRight={busy ? null : 'arrowRight'}>
          {busy ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>

      <div className="au-div">ou continue com</div>
      <div className="au-oauth">
        <button className="au-oauth-btn" onClick={() => onAuthed({ user: { name: 'Camila Ribeiro', email: email || 'camila@instanteambar.com.br', role: 'owner' }, companyName: 'Instante Âmbar', onboarded: true })}>
          <GoogleG className="au-g" /> Continuar com Google
        </button>
        <button className="au-oauth-btn" onClick={() => go('magic')}>
          <Icon name="wand" size={16} /> Entrar com link mágico
        </button>
      </div>

      <div className="au-foot">Ainda não tem conta? <button className="au-link" onClick={() => go('signup')}>Criar conta</button></div>
    </div>
  );
}

/* ---------------- Signup (criar ateliê / aceitar convite) ---------------- */
function SignupScreen({ email, setEmail, onAuthed, go }) {
  const [mode, setMode] = React.useState('create'); // create | invite
  const [name, setName] = React.useState('');
  const [pw, setPw] = React.useState('');
  const [err, setErr] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  // simulated invite (as if arrived from an email link)
  const invite = { company: 'Instante Âmbar', by: 'Camila Ribeiro', role: 'operator', email: 'rafael@instanteambar.com.br' };
  React.useEffect(() => { if (mode === 'invite') setEmail(invite.email); }, [mode]);

  const submit = (e) => {
    e && e.preventDefault();
    if (!name.trim()) return setErr('Informe seu nome.');
    if (mode === 'create' && !EMAIL_RE.test(email)) return setErr('Digite um e-mail válido.');
    if (pw.length < 6) return setErr('A senha deve ter ao menos 6 caracteres.');
    setErr(null); setBusy(true);
    setTimeout(() => {
      if (mode === 'create') {
        onAuthed({ user: { name: name.trim(), email, role: 'owner' }, companyName: null, onboarded: false });
      } else {
        onAuthed({ user: { name: name.trim(), email: invite.email, role: invite.role }, companyName: invite.company, onboarded: true });
      }
    }, 520);
  };

  return (
    <div className="au-card">
      <MobileBrand />
      <div className="au-eyebrow">Comece agora</div>
      <h1 className="au-title">Criar sua conta</h1>
      <p className="au-lede">Monte um novo ateliê do zero ou entre em um ateliê que te convidou.</p>

      <div className="au-seg">
        <button className={cn('au-seg-btn', mode === 'create' && 'au-seg-btn--on')} onClick={() => { setMode('create'); setErr(null); setEmail(''); }}>
          <Icon name="plus" size={15} /> Novo ateliê
        </button>
        <button className={cn('au-seg-btn', mode === 'invite' && 'au-seg-btn--on')} onClick={() => { setMode('invite'); setErr(null); }}>
          <Icon name="inbox" size={15} /> Tenho um convite
        </button>
      </div>

      {mode === 'invite' && (
        <div className="au-invite">
          <Avatar name={invite.by} size={40} />
          <div className="au-invite-meta">
            <div className="au-invite-co">{invite.company}</div>
            <div className="au-invite-by">{invite.by} convidou você como <strong>{ROLE_LABELS[invite.role]}</strong></div>
          </div>
        </div>
      )}

      <form className="au-form" onSubmit={submit}>
        <AuthErr>{err}</AuthErr>
        <div>
          <div className="au-field-label"><span>Seu nome</span></div>
          <Input icon="user" value={name} onChange={e => setName(e.target.value)} placeholder="Como devemos te chamar?" autoComplete="name" />
        </div>
        <div>
          <div className="au-field-label"><span>E-mail</span></div>
          <Input icon="user" type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="voce@atelie.com.br" autoComplete="email" disabled={mode === 'invite'} />
          {mode === 'invite' && <div className="ff-hint">Convite vinculado a este e-mail.</div>}
        </div>
        <PwField label="Senha" value={pw} onChange={setPw} placeholder="Crie uma senha" autoComplete="new-password" hint="Mínimo de 6 caracteres." />
        <Button type="submit" variant="default" size="lg" className="au-submit" disabled={busy} iconRight={busy ? null : 'arrowRight'}>
          {busy ? 'Criando…' : (mode === 'create' ? 'Criar ateliê' : 'Aceitar convite e entrar')}
        </Button>
      </form>

      {mode === 'create' && (<>
        <div className="au-div">ou</div>
        <div className="au-oauth">
          <button className="au-oauth-btn" onClick={() => onAuthed({ user: { name: 'Nova operadora', email: email || 'nova@atelie.com.br', role: 'owner' }, companyName: null, onboarded: false })}>
            <GoogleG className="au-g" /> Cadastrar com Google
          </button>
        </div>
      </>)}

      <div className="au-foot">Já tem uma conta? <button className="au-link" onClick={() => go('login')}>Entrar</button></div>
    </div>
  );
}

/* ---------------- Magic link ---------------- */
function MagicScreen({ email, setEmail, onAuthed, go }) {
  const [step, setStep] = React.useState('email'); // email | code
  const [err, setErr] = React.useState(null);
  const [code, setCode] = React.useState(['', '', '', '', '', '']);
  const refs = React.useRef([]);

  const sendCode = (e) => {
    e && e.preventDefault();
    if (!EMAIL_RE.test(email)) return setErr('Digite um e-mail válido.');
    setErr(null); setStep('code');
    setTimeout(() => refs.current[0] && refs.current[0].focus(), 60);
  };
  const setDigit = (i, v) => {
    v = v.replace(/\D/g, '').slice(-1);
    setCode(c => { const n = [...c]; n[i] = v; return n; });
    if (v && i < 5) refs.current[i + 1] && refs.current[i + 1].focus();
  };
  const onKey = (i, e) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) refs.current[i - 1] && refs.current[i - 1].focus();
  };
  const onPaste = (e) => {
    const d = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6).split('');
    if (d.length) { e.preventDefault(); const n = ['', '', '', '', '', '']; d.forEach((x, i) => n[i] = x); setCode(n); refs.current[Math.min(d.length, 5)] && refs.current[Math.min(d.length, 5)].focus(); }
  };
  const verify = () => {
    if (code.join('').length < 6) return setErr('Digite o código de 6 dígitos.');
    onAuthed({ user: { name: 'Camila Ribeiro', email, role: 'owner' }, companyName: 'Instante Âmbar', onboarded: true });
  };
  React.useEffect(() => { if (step === 'code' && code.join('').length === 6) verify(); }, [code]);

  if (step === 'email') {
    return (
      <div className="au-card">
        <MobileBrand />
        <button className="au-link au-link--muted" onClick={() => go('login')} style={{ marginBottom: 18 }}>← Voltar para o login</button>
        <h1 className="au-title">Entrar com link mágico</h1>
        <p className="au-lede">Enviamos um código de 6 dígitos para o seu e-mail. Sem senha para lembrar.</p>
        <form className="au-form" onSubmit={sendCode}>
          <AuthErr>{err}</AuthErr>
          <div>
            <div className="au-field-label"><span>E-mail</span></div>
            <Input icon="user" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@atelie.com.br" autoComplete="email" />
          </div>
          <Button type="submit" variant="default" size="lg" className="au-submit" iconRight="arrowRight">Enviar código</Button>
        </form>
        <div className="au-foot"><button className="au-link" onClick={() => go('login')}>Usar senha</button></div>
      </div>
    );
  }
  return (
    <div className="au-card">
      <MobileBrand />
      <div className="au-sent-ico"><Icon name="inbox" size={24} /></div>
      <h1 className="au-title">Digite o código</h1>
      <p className="au-lede">Enviamos um código para <span className="au-sent-mail">{email}</span>. Ele expira em 10 minutos.</p>
      <div className="au-form">
        <AuthErr>{err}</AuthErr>
        <div className="au-otp" onPaste={onPaste}>
          {code.map((d, i) => (
            <input key={i} ref={el => refs.current[i] = el} value={d} inputMode="numeric" maxLength={1}
              onChange={e => setDigit(i, e.target.value)} onKeyDown={e => onKey(i, e)} />
          ))}
        </div>
        <div className="ff-hint" style={{ textAlign: 'center' }}>Nesta demonstração, qualquer código de 6 dígitos funciona.</div>
        <Button variant="default" size="lg" className="au-submit" onClick={verify}>Confirmar e entrar</Button>
      </div>
      <div className="au-foot">Não recebeu? <button className="au-link" onClick={() => { setCode(['', '', '', '', '', '']); toast('Novo código enviado.', 'info'); }}>Reenviar código</button> · <button className="au-link au-link--muted" onClick={() => setStep('email')}>Trocar e-mail</button></div>
    </div>
  );
}

/* ---------------- Forgot / reset ---------------- */
function ForgotScreen({ email, setEmail, go }) {
  const [step, setStep] = React.useState('email'); // email | sent | reset
  const [err, setErr] = React.useState(null);
  const [pw, setPw] = React.useState(''); const [pw2, setPw2] = React.useState('');

  const send = (e) => {
    e && e.preventDefault();
    if (!EMAIL_RE.test(email)) return setErr('Digite um e-mail válido.');
    setErr(null); setStep('sent');
  };
  const reset = (e) => {
    e && e.preventDefault();
    if (pw.length < 6) return setErr('A senha deve ter ao menos 6 caracteres.');
    if (pw !== pw2) return setErr('As senhas não coincidem.');
    setErr(null);
    toast('Senha redefinida. Faça login com a nova senha.', 'ok');
    go('login');
  };

  if (step === 'email') {
    return (
      <div className="au-card">
        <MobileBrand />
        <button className="au-link au-link--muted" onClick={() => go('login')} style={{ marginBottom: 18 }}>← Voltar para o login</button>
        <h1 className="au-title">Recuperar senha</h1>
        <p className="au-lede">Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.</p>
        <form className="au-form" onSubmit={send}>
          <AuthErr>{err}</AuthErr>
          <div>
            <div className="au-field-label"><span>E-mail</span></div>
            <Input icon="user" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@atelie.com.br" autoComplete="email" />
          </div>
          <Button type="submit" variant="default" size="lg" className="au-submit" iconRight="arrowRight">Enviar link de recuperação</Button>
        </form>
      </div>
    );
  }
  if (step === 'sent') {
    return (
      <div className="au-card">
        <MobileBrand />
        <div className="au-sent-ico"><Icon name="inbox" size={24} /></div>
        <h1 className="au-title">Verifique seu e-mail</h1>
        <p className="au-lede">Enviamos um link de recuperação para <span className="au-sent-mail">{email}</span>. Abra o link para definir uma nova senha.</p>
        <div className="au-form">
          <Button variant="default" size="lg" className="au-submit" onClick={() => setStep('reset')} iconRight="arrowRight">Abrir link (demonstração)</Button>
          <button className="au-oauth-btn" onClick={() => setStep('email')}><Icon name="refresh" size={15} /> Reenviar para outro e-mail</button>
        </div>
        <div className="au-foot"><button className="au-link" onClick={() => go('login')}>Voltar para o login</button></div>
      </div>
    );
  }
  return (
    <div className="au-card">
      <MobileBrand />
      <h1 className="au-title">Criar nova senha</h1>
      <p className="au-lede">Escolha uma nova senha para <span className="au-sent-mail">{email}</span>.</p>
      <form className="au-form" onSubmit={reset}>
        <AuthErr>{err}</AuthErr>
        <PwField label="Nova senha" value={pw} onChange={setPw} placeholder="Mínimo de 6 caracteres" autoComplete="new-password" />
        <PwField label="Confirmar senha" value={pw2} onChange={setPw2} placeholder="Repita a senha" autoComplete="new-password" />
        <Button type="submit" variant="default" size="lg" className="au-submit">Redefinir senha</Button>
      </form>
    </div>
  );
}

/* ---------------- Flow controller ---------------- */
function AuthFlow({ onAuthed }) {
  const [view, setView] = React.useState('login'); // login | signup | magic | forgot
  const [email, setEmail] = React.useState('');
  const go = (v) => setView(v);
  const props = { email, setEmail, onAuthed, go };

  return (
    <div className="au-wrap">
      <AuthAside />
      <div className="au-main">
        {view === 'login' && <LoginScreen {...props} />}
        {view === 'signup' && <SignupScreen {...props} />}
        {view === 'magic' && <MagicScreen {...props} />}
        {view === 'forgot' && <ForgotScreen {...props} />}
      </div>
    </div>
  );
}

window.AuthFlow = AuthFlow;
window.ROLE_OPTS = ROLE_OPTS;
