import { Resend } from "resend";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail(input: SendEmailInput): Promise<{ ok: true } | { ok: false; error: unknown }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;

  if (!apiKey || !from) {
    return { ok: false, error: new Error("RESEND_API_KEY/RESEND_FROM não configurados") };
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

export function buildInviteEmailHtml(params: { householdName: string; acceptUrl: string }) {
  return `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height: 1.4">
      <h2>Convite para entrar na casa ${escapeHtml(params.householdName)}</h2>
      <p>Você foi convidado para acessar uma casa no Financeiro.</p>
      <p><a href="${params.acceptUrl}">Clique aqui para aceitar o convite</a></p>
      <p>Se você não esperava este convite, pode ignorar este e-mail.</p>
    </div>
  `.trim();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
