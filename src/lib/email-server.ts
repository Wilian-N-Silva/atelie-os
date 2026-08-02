type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function appBaseUrl(requestUrl?: string) {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.BETTER_AUTH_URL?.trim() ||
    requestUrl ||
    "http://localhost:3000";

  try {
    const url = new URL(configured);
    return url.origin;
  } catch {
    if (requestUrl) return new URL(requestUrl).origin;
    return "http://localhost:3000";
  }
}

export function teamInviteUrl(token: string, requestUrl?: string) {
  const url = new URL("/", appBaseUrl(requestUrl));
  url.searchParams.set("invite", token);
  return url.toString();
}

function emailFrom() {
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!from && process.env.RESEND_API_KEY) {
    throw new Error("RESEND_FROM_EMAIL is required when RESEND_API_KEY is configured.");
  }
  return from || "Atelie OS <noreply@atelie-os.local>";
}

export function resendConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

export async function sendEmail(input: SendEmailInput) {
  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY is required to send email.");
    console.info("[email:dev]", { to: input.to, subject: input.subject });
    return { skipped: true };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: emailFrom(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!response.ok) {
    const error = await response.text().catch(() => "");
    throw new Error(`resend_email_failed:${response.status}:${error.slice(0, 200)}`);
  }

  return response.json().catch(() => ({ ok: true }));
}

export async function sendPasswordResetEmail(input: { to: string; url: string }) {
  return sendEmail({
    to: input.to,
    subject: "Recuperar senha do Atelie OS",
    html: `<p>Use este link para criar uma nova senha:</p><p><a href="${input.url}">Redefinir senha</a></p><p>Se voce nao pediu isso, ignore este e-mail.</p>`,
    text: `Use este link para criar uma nova senha: ${input.url}`,
  });
}

export async function sendMagicLinkEmail(input: { to: string; url: string }) {
  return sendEmail({
    to: input.to,
    subject: "Seu link de acesso ao Atelie OS",
    html: `<p>Use este link para entrar no Atelie OS:</p><p><a href="${input.url}">Entrar agora</a></p><p>Se voce nao pediu isso, ignore este e-mail.</p>`,
    text: `Use este link para entrar no Atelie OS: ${input.url}`,
  });
}

export async function sendTeamInviteEmail(input: { to: string; companyName: string; role: string; invitedBy?: string | null; token?: string; requestUrl?: string }) {
  const url = input.token ? teamInviteUrl(input.token, input.requestUrl) : appBaseUrl(input.requestUrl);
  const invitedBy = escapeHtml(input.invitedBy ?? "A equipe");
  const companyName = escapeHtml(input.companyName);
  const role = escapeHtml(input.role);
  return sendEmail({
    to: input.to,
    subject: `Convite para ${input.companyName}`,
    html: `<p>${invitedBy} convidou voce para ${companyName} como ${role}.</p><p><a href="${escapeHtml(url)}">Aceitar convite</a></p>`,
    text: `${input.invitedBy ?? "A equipe"} convidou voce para ${input.companyName} como ${input.role}. Acesse: ${url}`,
  });
}
