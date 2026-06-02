"use client";
/* ============================================================
   auth-flow.tsx — multi-tenant authentication.
   Screens: login · signup (criar / convite) · link mágico ·
   recuperar senha. Ported from the design prototype's auth.jsx.
   onAuthed(session) advances the Root session gate.
   ============================================================ */
import * as React from "react";
import { cn, Icon, Input, Button, Avatar, toast, ROLE_LABELS } from "@/components/ui";
import { fetchAppSession } from "@/lib/app-session";
import type { Session } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type AuthView = "login" | "signup" | "magic" | "forgot";
type Go = (v: AuthView) => void;

interface ScreenProps {
  email: string;
  setEmail: (v: string) => void;
  onAuthed: (s: Session) => void;
  go: Go;
}

async function postAuth(endpoint: "sign-in/email" | "sign-up/email", body: Record<string, unknown>) {
  const res = await fetch(`/api/auth/${endpoint}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => null) as { message?: string; error?: string } | null;
    throw new Error(payload?.message || payload?.error || "Nao foi possivel autenticar.");
  }
}

async function loadSessionAfterAuth(onAuthed: (s: Session) => void) {
  const session = await fetchAppSession();
  if (!session) throw new Error("Sessao nao encontrada apos autenticar.");
  onAuthed(session);
}

function GoogleG({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" width="17" height="17" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.5 13.2l7.8 6.1C12.2 13.3 17.6 9.5 24 9.5Z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.5c-.5 2.9-2.2 5.4-4.7 7l7.6 5.9c4.4-4.1 6.7-10.1 6.7-17.4Z" />
      <path fill="#FBBC05" d="M10.3 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.3.8-4.7l-7.8-6.1C.9 16.2 0 20 0 24s.9 7.8 2.5 10.8l7.8-6.1Z" />
      <path fill="#34A853" d="M24 48c6.2 0 11.5-2 15.3-5.5l-7.6-5.9c-2.1 1.4-4.8 2.3-7.7 2.3-6.4 0-11.8-3.8-13.7-9.2l-7.8 6.1C6.5 42.6 14.6 48 24 48Z" />
    </svg>
  );
}

function PwField({ label, value, onChange, placeholder, autoComplete, forgot, onForgot, hint }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  autoComplete?: string; forgot?: boolean; onForgot?: () => void; hint?: string;
}) {
  const [show, setShow] = React.useState(false);
  return (
    <div>
      <div className="au-field-label">
        <span>{label}</span>
        {forgot && <button type="button" className="au-link au-link--muted" onClick={onForgot}>Esqueci minha senha</button>}
      </div>
      <div className="au-pw">
        <input className="om-input" type={show ? "text" : "password"} value={value}
          onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete} />
        <button type="button" className="au-pw-eye" tabIndex={-1} onClick={() => setShow((s) => !s)}
          title={show ? "Ocultar" : "Mostrar"}><Icon name={show ? "eye" : "lock"} size={16} /></button>
      </div>
      {hint && <div className="ff-hint">{hint}</div>}
    </div>
  );
}

function AuthErr({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <div className="au-error"><Icon name="alertCircle" size={15} style={{ marginTop: 1 }} /><div>{children}</div></div>;
}

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
        <span className="mono">v2.1</span><span>·</span><span>© 2026 Ateliê OS</span>
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
function LoginScreen({ email, setEmail, onAuthed, go }: ScreenProps) {
  const [pw, setPw] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!EMAIL_RE.test(email)) return setErr("Digite um e-mail válido.");
    if (pw.length < 8) return setErr("A senha deve ter ao menos 8 caracteres.");
    setErr(null); setBusy(true);
    try {
      await postAuth("sign-in/email", { email, password: pw, rememberMe: true });
      await loadSessionAfterAuth(onAuthed);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Nao foi possivel entrar.");
      setBusy(false);
    }
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
          <Input icon="user" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@atelie.com.br" autoComplete="email" />
        </div>
        <PwField label="Senha" value={pw} onChange={setPw} placeholder="••••••••" autoComplete="current-password" forgot onForgot={() => go("forgot")} />
        <Button type="submit" variant="default" size="lg" className="au-submit" disabled={busy} iconRight={busy ? null : "arrowRight"}>
          {busy ? "Entrando…" : "Entrar"}
        </Button>
      </form>

      <div className="au-div">ou continue com</div>
      <div className="au-oauth">
        <button className="au-oauth-btn" onClick={() => toast("Google ainda nao esta configurado neste ambiente.", "info")}>
          <GoogleG className="au-g" /> Continuar com Google
        </button>
        <button className="au-oauth-btn" onClick={() => go("magic")}>
          <Icon name="wand" size={16} /> Entrar com link mágico
        </button>
      </div>

      <div className="au-foot">Ainda não tem conta? <button className="au-link" onClick={() => go("signup")}>Criar conta</button></div>
    </div>
  );
}

/* ---------------- Signup (criar ateliê / aceitar convite) ---------------- */
function SignupScreen({ email, setEmail, onAuthed, go }: ScreenProps) {
  const [mode, setMode] = React.useState<"create" | "invite">("create");
  const [name, setName] = React.useState("");
  const [pw, setPw] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const invite = { company: "Atelie de exemplo", by: "Administrador", role: "operator" as const, email: "convite@example.com" };
  React.useEffect(() => { if (mode === "invite") setEmail(invite.email); }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) return setErr("Informe seu nome.");
    if (mode === "create" && !EMAIL_RE.test(email)) return setErr("Digite um e-mail válido.");
    if (pw.length < 8) return setErr("A senha deve ter ao menos 8 caracteres.");
    setErr(null); setBusy(true);
    try {
      await postAuth("sign-up/email", {
        email,
        password: pw,
        name: name.trim(),
      });

      if (mode === "create") {
        await loadSessionAfterAuth(onAuthed);
      } else {
        const res = await fetch("/api/app/demo-invite", {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) throw new Error("Nao foi possivel aceitar o convite.");
        onAuthed((await res.json()) as Session);
      }
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Nao foi possivel criar a conta.");
      setBusy(false);
    }
  };

  return (
    <div className="au-card">
      <MobileBrand />
      <div className="au-eyebrow">Comece agora</div>
      <h1 className="au-title">Criar sua conta</h1>
      <p className="au-lede">Monte um novo ateliê do zero ou entre em um ateliê que te convidou.</p>

      <div className="au-seg">
        <button className={cn("au-seg-btn", mode === "create" && "au-seg-btn--on")} onClick={() => { setMode("create"); setErr(null); setEmail(""); }}>
          <Icon name="plus" size={15} /> Novo ateliê
        </button>
        <button className={cn("au-seg-btn", mode === "invite" && "au-seg-btn--on")} onClick={() => { setMode("invite"); setErr(null); }}>
          <Icon name="inbox" size={15} /> Tenho um convite
        </button>
      </div>

      {mode === "invite" && (
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
          <Input icon="user" value={name} onChange={(e) => setName(e.target.value)} placeholder="Como devemos te chamar?" autoComplete="name" />
        </div>
        <div>
          <div className="au-field-label"><span>E-mail</span></div>
          <Input icon="user" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@atelie.com.br" autoComplete="email" disabled={mode === "invite"} />
          {mode === "invite" && <div className="ff-hint">Convite vinculado a este e-mail.</div>}
        </div>
        <PwField label="Senha" value={pw} onChange={setPw} placeholder="Crie uma senha" autoComplete="new-password" hint="Mínimo de 8 caracteres." />
        <Button type="submit" variant="default" size="lg" className="au-submit" disabled={busy} iconRight={busy ? null : "arrowRight"}>
          {busy ? "Criando…" : (mode === "create" ? "Criar ateliê" : "Aceitar convite e entrar")}
        </Button>
      </form>

      {mode === "create" && (
        <>
          <div className="au-div">ou</div>
          <div className="au-oauth">
            <button className="au-oauth-btn" onClick={() => toast("Google ainda nao esta configurado neste ambiente.", "info")}>
              <GoogleG className="au-g" /> Cadastrar com Google
            </button>
          </div>
        </>
      )}

      <div className="au-foot">Já tem uma conta? <button className="au-link" onClick={() => go("login")}>Entrar</button></div>
    </div>
  );
}

/* ---------------- Magic link ---------------- */
function MagicScreen({ email, setEmail, onAuthed, go }: ScreenProps) {
  const [step, setStep] = React.useState<"email" | "code">("email");
  const [err, setErr] = React.useState<string | null>(null);
  const [code, setCode] = React.useState(["", "", "", "", "", ""]);
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);

  const sendCode = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!EMAIL_RE.test(email)) return setErr("Digite um e-mail válido.");
    setErr("Link magico ainda precisa de um provedor de e-mail configurado.");
  };
  const setDigit = (i: number, v: string) => {
    v = v.replace(/\D/g, "").slice(-1);
    setCode((c) => { const n = [...c]; n[i] = v; return n; });
    if (v && i < 5) refs.current[i + 1]?.focus();
  };
  const onKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[i] && i > 0) refs.current[i - 1]?.focus();
  };
  const onPaste = (e: React.ClipboardEvent) => {
    const d = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6).split("");
    if (d.length) { e.preventDefault(); const n = ["", "", "", "", "", ""]; d.forEach((x, i) => (n[i] = x)); setCode(n); refs.current[Math.min(d.length, 5)]?.focus(); }
  };
  const verify = React.useCallback(() => {
    if (code.join("").length < 6) return setErr("Digite o código de 6 dígitos.");
    setErr("Link magico ainda precisa de um provedor de e-mail configurado.");
  }, [code]);
  React.useEffect(() => { if (step === "code" && code.join("").length === 6) verify(); }, [code, step, verify]);

  if (step === "email") {
    return (
      <div className="au-card">
        <MobileBrand />
        <button className="au-link au-link--muted" onClick={() => go("login")} style={{ marginBottom: 18 }}>← Voltar para o login</button>
        <h1 className="au-title">Entrar com link mágico</h1>
        <p className="au-lede">Enviamos um código de 6 dígitos para o seu e-mail. Sem senha para lembrar.</p>
        <form className="au-form" onSubmit={sendCode}>
          <AuthErr>{err}</AuthErr>
          <div>
            <div className="au-field-label"><span>E-mail</span></div>
            <Input icon="user" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@atelie.com.br" autoComplete="email" />
          </div>
          <Button type="submit" variant="default" size="lg" className="au-submit" iconRight="arrowRight">Enviar código</Button>
        </form>
        <div className="au-foot"><button className="au-link" onClick={() => go("login")}>Usar senha</button></div>
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
            <input key={i} ref={(el) => { refs.current[i] = el; }} value={d} inputMode="numeric" maxLength={1}
              onChange={(e) => setDigit(i, e.target.value)} onKeyDown={(e) => onKey(i, e)} />
          ))}
        </div>
        <div className="ff-hint" style={{ textAlign: "center" }}>Nesta demonstração, qualquer código de 6 dígitos funciona.</div>
        <Button variant="default" size="lg" className="au-submit" onClick={verify}>Confirmar e entrar</Button>
      </div>
      <div className="au-foot">Não recebeu? <button className="au-link" onClick={() => { setCode(["", "", "", "", "", ""]); toast("Novo código enviado.", "info"); }}>Reenviar código</button> · <button className="au-link au-link--muted" onClick={() => setStep("email")}>Trocar e-mail</button></div>
    </div>
  );
}

/* ---------------- Forgot / reset ---------------- */
function ForgotScreen({ email, setEmail, go }: ScreenProps) {
  const [step, setStep] = React.useState<"email" | "sent" | "reset">("email");
  const [err, setErr] = React.useState<string | null>(null);
  const [pw, setPw] = React.useState(""); const [pw2, setPw2] = React.useState("");

  const send = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!EMAIL_RE.test(email)) return setErr("Digite um e-mail válido.");
    setErr(null); setStep("sent");
  };
  const reset = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (pw.length < 8) return setErr("A senha deve ter ao menos 8 caracteres.");
    if (pw !== pw2) return setErr("As senhas não coincidem.");
    setErr("Recuperacao de senha ainda precisa de um provedor de e-mail configurado.");
  };

  if (step === "email") {
    return (
      <div className="au-card">
        <MobileBrand />
        <button className="au-link au-link--muted" onClick={() => go("login")} style={{ marginBottom: 18 }}>← Voltar para o login</button>
        <h1 className="au-title">Recuperar senha</h1>
        <p className="au-lede">Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.</p>
        <form className="au-form" onSubmit={send}>
          <AuthErr>{err}</AuthErr>
          <div>
            <div className="au-field-label"><span>E-mail</span></div>
            <Input icon="user" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@atelie.com.br" autoComplete="email" />
          </div>
          <Button type="submit" variant="default" size="lg" className="au-submit" iconRight="arrowRight">Enviar link de recuperação</Button>
        </form>
      </div>
    );
  }
  if (step === "sent") {
    return (
      <div className="au-card">
        <MobileBrand />
        <div className="au-sent-ico"><Icon name="inbox" size={24} /></div>
        <h1 className="au-title">Verifique seu e-mail</h1>
        <p className="au-lede">Enviamos um link de recuperação para <span className="au-sent-mail">{email}</span>. Abra o link para definir uma nova senha.</p>
        <div className="au-form">
          <Button variant="default" size="lg" className="au-submit" onClick={() => setStep("reset")} iconRight="arrowRight">Abrir link (demonstração)</Button>
          <button className="au-oauth-btn" onClick={() => setStep("email")}><Icon name="refresh" size={15} /> Reenviar para outro e-mail</button>
        </div>
        <div className="au-foot"><button className="au-link" onClick={() => go("login")}>Voltar para o login</button></div>
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
        <PwField label="Nova senha" value={pw} onChange={setPw} placeholder="Mínimo de 8 caracteres" autoComplete="new-password" />
        <PwField label="Confirmar senha" value={pw2} onChange={setPw2} placeholder="Repita a senha" autoComplete="new-password" />
        <Button type="submit" variant="default" size="lg" className="au-submit">Redefinir senha</Button>
      </form>
    </div>
  );
}

/* ---------------- Flow controller ---------------- */
export function AuthFlow({ onAuthed }: { onAuthed: (s: Session) => void }) {
  const [view, setView] = React.useState<AuthView>("login");
  const [email, setEmail] = React.useState("");
  const go: Go = (v) => setView(v);
  const props: ScreenProps = { email, setEmail, onAuthed, go };

  return (
    <div className="au-wrap">
      <AuthAside />
      <div className="au-main">
        {view === "login" && <LoginScreen {...props} />}
        {view === "signup" && <SignupScreen {...props} />}
        {view === "magic" && <MagicScreen {...props} />}
        {view === "forgot" && <ForgotScreen {...props} />}
      </div>
    </div>
  );
}
