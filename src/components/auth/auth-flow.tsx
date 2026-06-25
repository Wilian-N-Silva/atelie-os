"use client";

import * as React from "react";
import { Avatar, Button, Icon, Input, ROLE_LABELS, toast } from "@/components/ui";
import { fetchAppSession } from "@/lib/app-session";
import type { Session } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AuthView = "login" | "signup" | "magic" | "forgot";
type Go = (v: AuthView) => void;
type AuthConfig = NonNullable<Session["deployment"]>;
type InvitePreview = {
  email: string;
  role: "admin" | "operator";
  company: { name: string; slug: string };
};

interface ScreenProps {
  email: string;
  setEmail: (v: string) => void;
  onAuthed: (s: Session) => void;
  go: Go;
  config: AuthConfig;
  inviteToken: string | null;
  invite: InvitePreview | null;
  inviteError: string | null;
  resetToken: string | null;
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

async function acceptInvite(token: string) {
  const res = await fetch(`/api/invites/${encodeURIComponent(token)}`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error === "invite_email_mismatch"
      ? "Entre com o mesmo e-mail que recebeu o convite."
      : "Nao foi possivel aceitar o convite.");
  }
  return await res.json() as Session;
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

function AuthAside({ config }: { config: AuthConfig }) {
  return (
    <aside className="au-aside">
      <div className="au-aside-grid" />
      <div className="au-brand">
        <div className="au-mark"><Icon name="flame" size={19} strokeWidth={2.2} /></div>
        <div>
          <div className="au-brand-name">{config.brandName}</div>
          <div className="au-brand-sub">{config.deploymentMode === "standalone" ? "Ambiente dedicado" : "Backoffice artesanal"}</div>
        </div>
      </div>

      <div className="au-aside-mid">
        <div className="au-headline">{config.loginHeadline}</div>
        <div className="au-sub">{config.loginSubheading}</div>
        <div className="au-feats">
          <div className="au-feat">
            <div className="au-feat-ico"><Icon name="layers" size={15} /></div>
            <div>
              <div className="au-feat-t">{config.deploymentMode === "standalone" ? "Ambiente dedicado" : "Multiempresa, white-label"}</div>
              <div className="au-feat-d">{config.deploymentMode === "standalone" ? "Dados, marca, equipe e acessos isolados para este cliente." : "Cada atelie com sua marca, sua equipe e seus acessos."}</div>
            </div>
          </div>
          <div className="au-feat">
            <div className="au-feat-ico"><Icon name="scan" size={15} /></div>
            <div><div className="au-feat-t">Operacao por scanner ou manual</div><div className="au-feat-d">Separe, confira e embale na velocidade da bancada.</div></div>
          </div>
          <div className="au-feat">
            <div className="au-feat-ico"><Icon name="droplet" size={15} /></div>
            <div><div className="au-feat-t">Lotes, cura e qualidade</div><div className="au-feat-d">Rastreabilidade do insumo ao pedido enviado.</div></div>
          </div>
        </div>
      </div>

      <div className="au-aside-foot">
        <span className="mono">0.1.1 beta</span><span>·</span><span>© 2026 {config.brandName}</span>
      </div>
    </aside>
  );
}

function MobileBrand({ config }: { config: AuthConfig }) {
  return (
    <div className="au-mobile-brand">
      <div className="au-mobile-mark"><Icon name="flame" size={17} strokeWidth={2.2} /></div>
      <div><div style={{ fontSize: 14, fontWeight: 650 }}>{config.brandName}</div></div>
    </div>
  );
}

function LoginScreen({ email, setEmail, onAuthed, go, config, inviteToken, invite, inviteError }: ScreenProps) {
  const [pw, setPw] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!EMAIL_RE.test(email)) return setErr("Digite um e-mail valido.");
    if (pw.length < 8) return setErr("A senha deve ter ao menos 8 caracteres.");
    setErr(null); setBusy(true);
    try {
      await postAuth("sign-in/email", { email, password: pw, rememberMe: true });
      if (inviteToken) onAuthed(await acceptInvite(inviteToken));
      else await loadSessionAfterAuth(onAuthed);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Nao foi possivel entrar.");
      setBusy(false);
    }
  };

  return (
    <div className="au-card">
      <MobileBrand config={config} />
      <div className="au-eyebrow">Bem-vinda de volta</div>
      <h1 className="au-title">Entrar no {config.brandName}</h1>
      <p className="au-lede">{invite ? `Entre com ${invite.email} para aceitar o convite de ${invite.company.name}.` : config.loginSubheading}</p>

      <form className="au-form" onSubmit={submit}>
        <AuthErr>{err || inviteError}</AuthErr>
        <div>
          <div className="au-field-label"><span>E-mail</span></div>
          <Input icon="user" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@atelie.com.br" autoComplete="email" />
        </div>
        <PwField label="Senha" value={pw} onChange={setPw} placeholder="••••••••" autoComplete="current-password" forgot onForgot={() => go("forgot")} />
        <Button type="submit" variant="default" size="lg" className="au-submit" disabled={busy} iconRight={busy ? null : "arrowRight"}>
          {busy ? "Entrando..." : "Entrar"}
        </Button>
      </form>

      {config.deploymentMode !== "standalone" && (
        <>
          <div className="au-div">ou continue com</div>
          <div className="au-oauth">
            <button className="au-oauth-btn" onClick={() => toast("Google ainda nao esta configurado neste ambiente.", "info")}>
              <GoogleG className="au-g" /> Continuar com Google
            </button>
            <button className="au-oauth-btn" onClick={() => go("magic")}>
              <Icon name="wand" size={16} /> Entrar com link magico
            </button>
          </div>
        </>
      )}

      {config.allowSignup && <div className="au-foot">Ainda nao tem conta? <button className="au-link" onClick={() => go("signup")}>Criar conta</button></div>}
    </div>
  );
}

function SignupScreen({ email, setEmail, onAuthed, go, config, inviteToken, invite, inviteError }: ScreenProps) {
  const [mode, setMode] = React.useState<"create" | "invite">(invite ? "invite" : "create");
  const [name, setName] = React.useState("");
  const [pw, setPw] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (invite) {
      setMode("invite");
      setEmail(invite.email);
    }
  }, [invite, setEmail]);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) return setErr("Informe seu nome.");
    if (!EMAIL_RE.test(email)) return setErr("Digite um e-mail valido.");
    if (pw.length < 8) return setErr("A senha deve ter ao menos 8 caracteres.");
    setErr(null); setBusy(true);
    try {
      await postAuth("sign-up/email", { email, password: pw, name: name.trim(), inviteToken: inviteToken ?? undefined });
      if (mode === "invite" && inviteToken) onAuthed(await acceptInvite(inviteToken));
      else await loadSessionAfterAuth(onAuthed);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Nao foi possivel criar a conta.");
      setBusy(false);
    }
  };

  return (
    <div className="au-card">
      <MobileBrand config={config} />
      <div className="au-eyebrow">Comece agora</div>
      <h1 className="au-title">{invite ? "Aceitar convite" : "Criar sua conta"}</h1>
      <p className="au-lede">{invite ? `Crie sua senha para entrar em ${invite.company.name}.` : "Monte um novo atelie do zero ou entre em um atelie que te convidou."}</p>

      {!invite && (
        <div className="au-seg">
          <button className={`au-seg-btn ${mode === "create" ? "au-seg-btn--on" : ""}`} onClick={() => { setMode("create"); setErr(null); setEmail(""); }}>
            <Icon name="plus" size={15} /> Novo atelie
          </button>
          <button className={`au-seg-btn ${mode === "invite" ? "au-seg-btn--on" : ""}`} onClick={() => { setMode("invite"); setErr("Abra o link recebido por e-mail para aceitar um convite."); }}>
            <Icon name="inbox" size={15} /> Tenho um convite
          </button>
        </div>
      )}

      {mode === "invite" && invite && (
        <div className="au-invite">
          <Avatar name={invite.company.name} size={40} />
          <div className="au-invite-meta">
            <div className="au-invite-co">{invite.company.name}</div>
            <div className="au-invite-by">Convite para entrar como <strong>{ROLE_LABELS[invite.role]}</strong></div>
          </div>
        </div>
      )}

      <form className="au-form" onSubmit={submit}>
        <AuthErr>{err || inviteError}</AuthErr>
        <div>
          <div className="au-field-label"><span>Seu nome</span></div>
          <Input icon="user" value={name} onChange={(e) => setName(e.target.value)} placeholder="Como devemos te chamar?" autoComplete="name" />
        </div>
        <div>
          <div className="au-field-label"><span>E-mail</span></div>
          <Input icon="user" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@atelie.com.br" autoComplete="email" disabled={mode === "invite" && Boolean(invite)} />
          {mode === "invite" && <div className="ff-hint">Convite vinculado a este e-mail.</div>}
        </div>
        <PwField label="Senha" value={pw} onChange={setPw} placeholder="Crie uma senha" autoComplete="new-password" hint="Minimo de 8 caracteres." />
        <Button type="submit" variant="default" size="lg" className="au-submit" disabled={busy} iconRight={busy ? null : "arrowRight"}>
          {busy ? "Criando..." : (mode === "invite" ? "Aceitar convite e entrar" : "Criar atelie")}
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

      <div className="au-foot">Ja tem uma conta? <button className="au-link" onClick={() => go("login")}>Entrar</button></div>
    </div>
  );
}

function MagicScreen({ email, setEmail, go, config, inviteToken }: ScreenProps) {
  const [step, setStep] = React.useState<"email" | "sent">("email");
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const sendLink = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!EMAIL_RE.test(email)) return setErr("Digite um e-mail valido.");
    setErr(null); setBusy(true);
    try {
      const callbackURL = inviteToken ? `/?invite=${encodeURIComponent(inviteToken)}` : "/";
      const res = await fetch("/api/auth/sign-in/magic-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, callbackURL }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null) as { message?: string; error?: string } | null;
        throw new Error(payload?.message || payload?.error || "Nao foi possivel enviar o link.");
      }
      setStep("sent");
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Nao foi possivel enviar o link.");
    } finally {
      setBusy(false);
    }
  };

  if (step === "email") {
    return (
      <div className="au-card">
        <MobileBrand config={config} />
        <button className="au-link au-link--muted" onClick={() => go("login")} style={{ marginBottom: 18 }}>← Voltar para o login</button>
        <h1 className="au-title">Entrar com link magico</h1>
        <p className="au-lede">Enviaremos um link seguro para seu e-mail. Ele expira em poucos minutos.</p>
        <form className="au-form" onSubmit={sendLink}>
          <AuthErr>{err}</AuthErr>
          <div>
            <div className="au-field-label"><span>E-mail</span></div>
            <Input icon="user" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@atelie.com.br" autoComplete="email" />
          </div>
          <Button type="submit" variant="default" size="lg" className="au-submit" disabled={busy} iconRight={busy ? null : "arrowRight"}>{busy ? "Enviando..." : "Enviar link"}</Button>
        </form>
        <div className="au-foot"><button className="au-link" onClick={() => go("login")}>Usar senha</button></div>
      </div>
    );
  }

  return (
    <div className="au-card">
      <MobileBrand config={config} />
      <div className="au-sent-ico"><Icon name="inbox" size={24} /></div>
      <h1 className="au-title">Verifique seu e-mail</h1>
      <p className="au-lede">Enviamos um link de acesso para <span className="au-sent-mail">{email}</span>. Abra o link neste navegador para entrar.</p>
      <div className="au-form">
        <AuthErr>{err}</AuthErr>
        <Button variant="default" size="lg" className="au-submit" onClick={() => go("login")}>Voltar para senha</Button>
      </div>
      <div className="au-foot">Nao recebeu? <button className="au-link" onClick={() => setStep("email")}>Enviar novamente</button></div>
    </div>
  );
}

function ForgotScreen({ email, setEmail, go, config, resetToken }: ScreenProps) {
  const [step, setStep] = React.useState<"email" | "sent" | "reset">(resetToken ? "reset" : "email");
  const [err, setErr] = React.useState<string | null>(null);
  const [pw, setPw] = React.useState("");
  const [pw2, setPw2] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (resetToken) setStep("reset");
  }, [resetToken]);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!EMAIL_RE.test(email)) return setErr("Digite um e-mail valido.");
    setErr(null); setBusy(true);
    try {
      const res = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, redirectTo: "/" }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null) as { message?: string; error?: string } | null;
        throw new Error(payload?.message || payload?.error || "Nao foi possivel enviar o link.");
      }
      setStep("sent");
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Nao foi possivel enviar o link.");
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (pw.length < 8) return setErr("A senha deve ter ao menos 8 caracteres.");
    if (pw !== pw2) return setErr("As senhas nao coincidem.");
    if (!resetToken) return setErr("Link de recuperacao invalido ou expirado.");
    setErr(null); setBusy(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newPassword: pw, token: resetToken }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null) as { message?: string; error?: string } | null;
        throw new Error(payload?.message || payload?.error || "Nao foi possivel redefinir a senha.");
      }
      window.history.replaceState({}, "", "/");
      toast("Senha redefinida. Entre com a nova senha.", "ok");
      go("login");
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Nao foi possivel redefinir a senha.");
    } finally {
      setBusy(false);
    }
  };

  if (step === "email") {
    return (
      <div className="au-card">
        <MobileBrand config={config} />
        <button className="au-link au-link--muted" onClick={() => go("login")} style={{ marginBottom: 18 }}>← Voltar para o login</button>
        <h1 className="au-title">Recuperar senha</h1>
        <p className="au-lede">Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.</p>
        <form className="au-form" onSubmit={send}>
          <AuthErr>{err}</AuthErr>
          <div>
            <div className="au-field-label"><span>E-mail</span></div>
            <Input icon="user" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@atelie.com.br" autoComplete="email" />
          </div>
          <Button type="submit" variant="default" size="lg" className="au-submit" disabled={busy} iconRight={busy ? null : "arrowRight"}>{busy ? "Enviando..." : "Enviar link de recuperacao"}</Button>
        </form>
      </div>
    );
  }

  if (step === "sent") {
    return (
      <div className="au-card">
        <MobileBrand config={config} />
        <div className="au-sent-ico"><Icon name="inbox" size={24} /></div>
        <h1 className="au-title">Verifique seu e-mail</h1>
        <p className="au-lede">Enviamos um link de recuperacao para <span className="au-sent-mail">{email}</span>. Abra o link para definir uma nova senha.</p>
        <div className="au-form">
          <Button variant="default" size="lg" className="au-submit" onClick={() => go("login")} iconRight="arrowRight">Voltar para o login</Button>
          <button className="au-oauth-btn" onClick={() => setStep("email")}><Icon name="refresh" size={15} /> Reenviar para outro e-mail</button>
        </div>
      </div>
    );
  }

  return (
    <div className="au-card">
      <MobileBrand config={config} />
      <h1 className="au-title">Criar nova senha</h1>
      <p className="au-lede">Escolha uma nova senha para sua conta.</p>
      <form className="au-form" onSubmit={reset}>
        <AuthErr>{err}</AuthErr>
        <PwField label="Nova senha" value={pw} onChange={setPw} placeholder="Minimo de 8 caracteres" autoComplete="new-password" />
        <PwField label="Confirmar senha" value={pw2} onChange={setPw2} placeholder="Repita a senha" autoComplete="new-password" />
        <Button type="submit" variant="default" size="lg" className="au-submit" disabled={busy}>{busy ? "Redefinindo..." : "Redefinir senha"}</Button>
      </form>
    </div>
  );
}

export function AuthFlow({ onAuthed, config }: { onAuthed: (s: Session) => void; config: AuthConfig }) {
  const [view, setView] = React.useState<AuthView>("login");
  const [email, setEmail] = React.useState("");
  const [inviteToken, setInviteToken] = React.useState<string | null>(null);
  const [invite, setInvite] = React.useState<InvitePreview | null>(null);
  const [inviteError, setInviteError] = React.useState<string | null>(null);
  const [resetToken, setResetToken] = React.useState<string | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextInviteToken = params.get("invite");
    const nextResetToken = params.get("token");
    const authError = params.get("error");

    if (authError) setInviteError(authError === "INVALID_TOKEN" ? "Link invalido ou expirado." : authError);

    if (nextResetToken) {
      setResetToken(nextResetToken);
      setView("forgot");
      return;
    }

    if (nextInviteToken) {
      setInviteToken(nextInviteToken);
      setView("signup");
      fetch(`/api/invites/${encodeURIComponent(nextInviteToken)}`, { cache: "no-store" })
        .then((res) => res.ok ? res.json() : Promise.reject(new Error("invite_not_found")))
        .then((payload: InvitePreview) => {
          setInvite(payload);
          setEmail(payload.email);
        })
        .catch(() => setInviteError("Convite invalido ou expirado."));
    }
  }, []);

  const go: Go = (v) => setView(config.allowSignup || inviteToken || v !== "signup" ? v : "login");
  const props: ScreenProps = { email, setEmail, onAuthed, go, config, inviteToken, invite, inviteError, resetToken };

  return (
    <div className="au-wrap">
      <AuthAside config={config} />
      <div className="au-main">
        {view === "login" && <LoginScreen {...props} />}
        {view === "signup" && (config.allowSignup || inviteToken) && <SignupScreen {...props} />}
        {view === "magic" && <MagicScreen {...props} />}
        {view === "forgot" && <ForgotScreen {...props} />}
      </div>
    </div>
  );
}
