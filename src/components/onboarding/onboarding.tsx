"use client";
/* ============================================================
   onboarding.tsx — account setup after self-serve signup.
   Create ateliê → details → (optional) invite team → enter app.
   Ported from the design prototype's onboarding.jsx.
   ============================================================ */
import * as React from "react";
import { cn, Icon, Input, Button, Select, Progress, Card, CardContent, Sep, ROLE_LABELS } from "@/components/ui";
import type { SessionUser } from "@/lib/types";
import type { OnboardingInvite } from "@/lib/seed-defaults";

export interface OnboardingDonePayload {
  companyName: string;
  segment: string;
  teamSize: string;
  logoUrl?: string | null;
  invites: OnboardingInvite[];
}

const ROLE_OPTS = [
  { value: "admin", label: "Administrador(a)" },
  { value: "operator", label: "Operador(a)" },
];
const SEGMENTS = [
  { id: "velas", label: "Velas aromáticas", icon: "flame" },
  { id: "cosmeticos", label: "Cosméticos & banho", icon: "droplet" },
  { id: "alimentos", label: "Alimentos artesanais", icon: "beaker" },
  { id: "outro", label: "Outro segmento", icon: "box" },
];
const TEAM_SIZES = [
  { id: "solo", label: "Só eu", desc: "Operação individual" },
  { id: "small", label: "2 – 5 pessoas", desc: "Equipe enxuta" },
  { id: "big", label: "6 ou mais", desc: "Ateliê com turnos" },
];
const STEPS = [
  { t: "Sobre o ateliê", d: "Nome, segmento e marca" },
  { t: "Convide a equipe", d: "Opcional — adicione depois" },
  { t: "Tudo pronto", d: "Entrar no sistema" },
];

function OnbRail({ step }: { step: number }) {
  return (
    <aside className="ob-rail">
      <div className="ob-rail-brand">
        <div className="ob-rail-mark"><Icon name="flame" size={18} strokeWidth={2.2} /></div>
        <div><div style={{ fontSize: 14, fontWeight: 650 }}>Ateliê OS</div><div className="au-brand-sub" style={{ color: "hsl(var(--muted-foreground))" }}>Configuração inicial</div></div>
      </div>
      <div className="ob-steps">
        {STEPS.map((s, i) => (
          <div key={i} className={cn("ob-step", i === step && "ob-step--on", i < step && "ob-step--done", i > step && "ob-step--idle")}>
            <div className="ob-step-num">{i < step ? <Icon name="check" size={13} /> : i + 1}</div>
            <div><div className="ob-step-t">{s.t}</div><div className="ob-step-d">{s.d}</div></div>
          </div>
        ))}
      </div>
      <div className="ob-rail-foot">Você poderá ajustar tudo isso depois em Configurações.</div>
    </aside>
  );
}

export function Onboarding({ user, onDone }: { user?: SessionUser; onDone: (p: OnboardingDonePayload) => void | Promise<void> }) {
  const [step, setStep] = React.useState(0);
  const [coName, setCoName] = React.useState("");
  const [segment, setSegment] = React.useState("velas");
  const [size, setSize] = React.useState("small");
  const [logo, setLogo] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [invites, setInvites] = React.useState([{ email: "", role: "operator" }]);
  const [saving, setSaving] = React.useState(false);

  const firstName = user?.name ? user.name.split(" ")[0] : "";

  const onLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => setLogo(r.result as string);
    r.readAsDataURL(f);
  };

  const next = () => {
    if (step === 0) {
      if (!coName.trim()) return setErr("Dê um nome ao seu ateliê.");
      setErr(null);
    }
    setStep((s) => s + 1);
  };

  const validInvites = invites.filter((i) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.email.trim()));
  const setInvite = (i: number, patch: Partial<{ email: string; role: string }>) => setInvites((list) => list.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const addInvite = () => setInvites((list) => [...list, { email: "", role: "operator" }]);
  const rmInvite = (i: number) => setInvites((list) => (list.length === 1 ? [{ email: "", role: "operator" }] : list.filter((_, idx) => idx !== i)));

  const finish = async () => {
    setSaving(true);
    try {
      await onDone({
        companyName: coName.trim(),
        segment,
        teamSize: size,
        logoUrl: logo,
        invites: validInvites.map((invite) => ({
          email: invite.email.trim().toLowerCase(),
          role: invite.role === "admin" ? "admin" : "operator",
        })),
      });
    } catch {
      setErr("Nao foi possivel concluir a configuracao inicial.");
      setSaving(false);
    }
  };

  return (
    <div className="ob-wrap">
      <OnbRail step={step} />
      <div className="ob-main">
        <div className="ob-panel">
          <div className="ob-progress-m"><Progress value={(step / (STEPS.length - 1)) * 100} /></div>

          {step === 0 && (
            <div>
              <div className="ob-eyebrow">{firstName ? `Olá, ${firstName}` : "Vamos começar"} · Passo 1 de 3</div>
              <h1 className="ob-title">Crie seu ateliê</h1>
              <p className="ob-lede">Esse é o espaço da sua marca dentro do Ateliê OS. Cada ateliê tem seus próprios produtos, estoque e equipe.</p>

              <div className="ob-body">
                <div className="ff">
                  <label className="ff-label">Nome do ateliê <span className="ff-req">*</span></label>
                  <Input value={coName} onChange={(e) => { setCoName(e.target.value); setErr(null); }} placeholder="Ex.: Meu atelie" autoFocus />
                  {err && <div className="ff-error">{err}</div>}
                </div>

                <div className="ff">
                  <label className="ff-label">O que vocês produzem?</label>
                  <div className="ob-choices ob-choices--2">
                    {SEGMENTS.map((s) => (
                      <button key={s.id} type="button" className={cn("ob-choice", segment === s.id && "ob-choice--on")} onClick={() => setSegment(s.id)}>
                        <Icon name={s.icon} size={18} className="ob-choice-ico" />
                        <span className="ob-choice-t">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="ff">
                  <label className="ff-label">Tamanho da equipe</label>
                  <div className="ob-choices ob-choices--3">
                    {TEAM_SIZES.map((s) => (
                      <button key={s.id} type="button" className={cn("ob-choice", size === s.id && "ob-choice--on")} onClick={() => setSize(s.id)}>
                        <span className="ob-choice-t">{s.label}</span>
                        <span className="ob-choice-d">{s.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="ff" style={{ marginBottom: 0 }}>
                  <label className="ff-label">Logotipo <span className="muted" style={{ fontWeight: 400 }}>· opcional</span></label>
                  <div className="ob-logo">
                    <div className="ob-logo-prev">{logo ? <img src={logo} alt="logo" /> : <Icon name="flame" size={22} className="muted" />}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Adicione a marca do ateliê</div>
                      <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>PNG, JPG, WEBP ou SVG. Pode trocar depois.</div>
                      <div className="row" style={{ gap: 8 }}>
                        <label className="om-btn om-btn--outline om-btn--sm" style={{ cursor: "pointer" }}>
                          <Icon name="upload" size={14} /> Enviar logo
                          <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onLogo} style={{ display: "none" }} />
                        </label>
                        {logo && <Button variant="ghost" size="sm" icon="trash" onClick={() => setLogo(null)}>Remover</Button>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="ob-foot">
                <Button variant="default" size="lg" onClick={next} iconRight="arrowRight">Continuar</Button>
                <span className="muted" style={{ fontSize: 12.5 }}>Leva menos de um minuto.</span>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <div className="ob-eyebrow">Passo 2 de 3 · Opcional</div>
              <h1 className="ob-title">Convide sua equipe</h1>
              <p className="ob-lede">Traga quem trabalha na bancada com você. Vamos enviar um convite por e-mail para cada pessoa — você pode pular e fazer isso depois.</p>

              <div className="ob-body">
                {invites.map((inv, i) => (
                  <div className="ob-invite-row" key={i}>
                    <Input icon="user" type="email" value={inv.email} onChange={(e) => setInvite(i, { email: e.target.value })} placeholder="email@daequipe.com" />
                    <div className="ob-invite-role">
                      <Select value={inv.role} onChange={(v) => setInvite(i, { role: v })} options={ROLE_OPTS} />
                    </div>
                    <button type="button" className="ob-rm" onClick={() => rmInvite(i)} title="Remover"><Icon name="x" size={16} /></button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" icon="plus" onClick={addInvite}>Adicionar pessoa</Button>
              </div>

              <div className="ob-foot">
                <Button variant="default" size="lg" onClick={() => setStep(2)} iconRight="arrowRight">
                  {validInvites.length ? `Enviar ${validInvites.length} convite${validInvites.length > 1 ? "s" : ""}` : "Continuar"}
                </Button>
                <button className="au-link au-link--muted" onClick={() => { setInvites([{ email: "", role: "operator" }]); setStep(2); }}>Pular por enquanto</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="ob-done-ico"><Icon name="check" size={28} strokeWidth={2.4} /></div>
              <h1 className="ob-title">Tudo pronto, {firstName || "bem-vinda"}!</h1>
              <p className="ob-lede"><strong>{coName.trim()}</strong> está configurado. Você entra como <strong>{ROLE_LABELS.owner}</strong>, com acesso total ao ateliê.{validInvites.length ? ` Enviamos ${validInvites.length} convite${validInvites.length > 1 ? "s" : ""} para a sua equipe.` : ""}</p>

              <div className="ob-body">
                <Card>
                  <CardContent style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div className="row" style={{ gap: 12 }}>
                      <div className="chip chip--brand chip--lg"><Icon name="hoje" size={20} /></div>
                      <div><div style={{ fontWeight: 600, fontSize: 14 }}>Comece pelo “Hoje no ateliê”</div><div className="muted" style={{ fontSize: 12.5 }}>O painel reúne as pendências do dia em um só lugar.</div></div>
                    </div>
                    <Sep />
                    <div className="row" style={{ gap: 12 }}>
                      <div className="chip chip--brand chip--lg"><Icon name="itens" size={20} /></div>
                      <div><div style={{ fontWeight: 600, fontSize: 14 }}>Cadastre seus itens e receitas</div><div className="muted" style={{ fontSize: 12.5 }}>Matérias-primas, embalagens e produtos do catálogo.</div></div>
                    </div>
                    <Sep />
                    <div className="row" style={{ gap: 12 }}>
                      <div className="chip chip--brand chip--lg"><Icon name="user" size={20} /></div>
                      <div><div style={{ fontWeight: 600, fontSize: 14 }}>Gerencie acessos quando quiser</div><div className="muted" style={{ fontSize: 12.5 }}>Convide pessoas e ajuste papéis em Configurações → Usuários.</div></div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="ob-foot">
                <Button variant="default" size="lg" onClick={finish} iconRight={saving ? undefined : "arrowRight"} disabled={saving}>
                  {saving ? "Entrando..." : "Entrar no Ateliê OS"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
