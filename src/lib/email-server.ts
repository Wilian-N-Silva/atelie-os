type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

function emailFrom() {
  return process.env.RESEND_FROM_EMAIL || "Atelie OS <noreply@atelie-os.local>";
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

export async function sendTeamInviteEmail(input: { to: string; companyName: string; role: string; invitedBy?: string | null }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000";
  return sendEmail({
    to: input.to,
    subject: `Convite para ${input.companyName}`,
    html: `<p>${input.invitedBy ?? "A equipe"} convidou voce para ${input.companyName} como ${input.role}.</p><p><a href="${appUrl}">Entrar no Atelie OS</a></p>`,
    text: `${input.invitedBy ?? "A equipe"} convidou voce para ${input.companyName} como ${input.role}. Acesse: ${appUrl}`,
  });
}
