import { logEvent } from "@/lib/observability/log-event";
import { getTransactionalEmailConfig } from "@/modules/email/infrastructure/emailConfig";
import { sendWithResend } from "@/modules/email/infrastructure/resendClient";
import { sanitizeSupportPayload } from "./sanitizeSupportPayload";
import { SUPPORT_RECENT_MESSAGES_DAYS } from "./getSupportDiagnostics";
import { SUPPORT_CATEGORY_LABELS, type SupportCategory, type SupportPayload } from "./supportTypes";

function categoryLabel(c: SupportCategory): string {
  return SUPPORT_CATEGORY_LABELS[c] ?? c;
}

function buildEmailHtml(p: SupportPayload): string {
  const d = p.diagnostics;
  const lines = [
    "<h1>Novo pedido de suporte</h1>",
    `<p><strong>Usuário:</strong> ${escapeHtml(p.email)}</p>`,
    `<p><strong>Tenant:</strong> ${escapeHtml(p.tenantId)}</p>`,
    `<p><strong>Role:</strong> ${escapeHtml(p.role)}</p>`,
    `<p><strong>Tipo:</strong> ${escapeHtml(categoryLabel(p.category))}</p>`,
    "<p><strong>Descrição:</strong></p>",
    `<pre style="white-space:pre-wrap;font-family:system-ui,sans-serif">${escapeHtml(p.description)}</pre>`,
    "<p><strong>Contexto</strong></p>",
    "<ul>",
    `<li>página: ${escapeHtml(p.pathname)}</li>`,
    `<li>activation: ${d.activationComplete}</li>`,
    `<li>phoneConnected: ${d.phoneConnected}</li>`,
    `<li>promptReady: ${d.promptReady}</li>`,
    `<li>apiKeyReady: ${d.apiKeyReady}</li>`,
    `<li>threads: ${d.threadCount}</li>`,
    `<li>mensagens (${SUPPORT_RECENT_MESSAGES_DAYS}d): ${d.recentMessagesCount}</li>`,
    `<li>lineStatus: ${escapeHtml(d.lineStatus ?? "—")}</li>`,
    `<li>phoneNumberId: ${escapeHtml(d.phoneNumberId ?? "—")}</li>`,
    `<li>displayPhoneNumber: ${escapeHtml(d.displayPhoneNumber ?? "—")}</li>`,
    `<li>environment: ${escapeHtml(p.environment)}</li>`,
    `<li>userAgent: ${escapeHtml(p.userAgent.slice(0, 500))}</li>`,
    `<li>capturedAt: ${escapeHtml(p.capturedAtIso)}</li>`,
    "</ul>",
    `<p><strong>Debug ID:</strong> ${escapeHtml(p.debugId)}</p>`,
  ];
  return lines.join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildPlainText(p: SupportPayload): string {
  const d = p.diagnostics;
  return [
    "Novo pedido de suporte",
    "",
    `Usuário: ${p.email}`,
    `Tenant: ${p.tenantId}`,
    `Role: ${p.role}`,
    "",
    `Tipo: ${categoryLabel(p.category)}`,
    "",
    "Descrição:",
    p.description,
    "",
    "Contexto:",
    `- página: ${p.pathname}`,
    `- activation: ${d.activationComplete}`,
    `- phoneConnected: ${d.phoneConnected}`,
    `- promptReady: ${d.promptReady}`,
    `- apiKeyReady: ${d.apiKeyReady}`,
    `- threads: ${d.threadCount}`,
    `- mensagens (${SUPPORT_RECENT_MESSAGES_DAYS}d): ${d.recentMessagesCount}`,
    `- lineStatus: ${d.lineStatus ?? "—"}`,
    `- phoneNumberId: ${d.phoneNumberId ?? "—"}`,
    `- displayPhoneNumber: ${d.displayPhoneNumber ?? "—"}`,
    `- environment: ${p.environment}`,
    `- userAgent: ${p.userAgent}`,
    `- capturedAt: ${p.capturedAtIso}`,
    "",
    `Debug ID: ${p.debugId}`,
  ].join("\n");
}

export type SendSupportNotificationResult =
  | { ok: true; emailSent: boolean; webhookSent: boolean }
  | { ok: false; reason: string };

/**
 * Envia e-mail (Resend) e/ou webhook opcional; regista em log (payload sanitizado).
 */
export async function sendSupportNotification(payload: SupportPayload): Promise<SendSupportNotificationResult> {
  const safe = sanitizeSupportPayload(payload);
  logEvent("info", "support", "report_received", {
    debugId: safe.debugId,
    tenantId: safe.tenantId,
    userId: safe.userId,
    category: safe.category,
  });

  const notifyTo = process.env.WHATSAPP_SUPPORT_NOTIFY_EMAIL?.trim();
  const webhookUrl = process.env.WHATSAPP_SUPPORT_WEBHOOK_URL?.trim();

  let emailSent = false;

  if (notifyTo) {
    const cfg = getTransactionalEmailConfig();
    if (!cfg.ok) {
      logEvent("warn", "support", "email_skipped", { debugId: safe.debugId, reason: cfg.reason });
    } else {
      const r = await sendWithResend({
        apiKey: cfg.apiKey,
        from: cfg.from,
        to: notifyTo,
        subject: `[Suporte] ${categoryLabel(safe.category)} — ${safe.debugId.slice(0, 8)}`,
        html: buildEmailHtml(safe),
        replyTo: safe.email,
      });
      if (r.ok) {
        emailSent = true;
      } else {
        logEvent("warn", "support", "email_failed", {
          debugId: safe.debugId,
          errorCode: r.errorCode,
          errorMessage: r.errorMessage,
        });
      }
    }
  } else {
    logEvent("info", "support", "email_skipped_no_dest", { debugId: safe.debugId });
  }

  let webhookSent = false;
  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: buildPlainText(safe),
          payload: safe,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      webhookSent = res.ok;
      if (!res.ok) {
        logEvent("warn", "support", "webhook_failed", { debugId: safe.debugId, status: res.status });
      }
    } catch (e) {
      logEvent("warn", "support", "webhook_error", {
        debugId: safe.debugId,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const hasEmailDest = Boolean(notifyTo);
  const hasWebhookDest = Boolean(webhookUrl);

  if (!hasEmailDest && !hasWebhookDest) {
    return { ok: true, emailSent: false, webhookSent: false };
  }

  if (hasEmailDest && !emailSent) {
    return { ok: false, reason: "Falha ao enviar notificação por e-mail." };
  }

  if (hasWebhookDest && !webhookSent && !hasEmailDest) {
    return { ok: false, reason: "Falha ao notificar o webhook." };
  }

  return { ok: true, emailSent, webhookSent };
}
