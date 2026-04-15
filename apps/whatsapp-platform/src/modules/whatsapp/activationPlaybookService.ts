import type { ChannelActivationEvent } from "@/modules/whatsapp/channelEventService";

export type ChannelErrorType = "TOKEN_INVALID" | "WEBHOOK_INVALID" | "META_REJECTED" | "UNKNOWN";

export type PlaybookCtaAction = "RETRY" | "OPEN_META" | "COPY_WEBHOOK";

export type ActivationPlaybook = {
  id: string;
  errorType: ChannelErrorType;
  title: string;
  steps: string[];
  cta?: {
    label: string;
    action: PlaybookCtaAction;
  };
};

const META_BUSINESS_URL = "https://business.facebook.com/latest/settings/whatsapp";

/**
 * Heurística por texto do evento (mensagem em inglês/português da API/Meta).
 */
export function classifyChannelError(event: Pick<ChannelActivationEvent, "message">): ChannelErrorType {
  const m = event.message.toLowerCase();
  if (m.includes("token")) return "TOKEN_INVALID";
  if (m.includes("webhook")) return "WEBHOOK_INVALID";
  if (m.includes("permission") || m.includes("rejected")) return "META_REJECTED";
  return "UNKNOWN";
}

const PLAYBOOKS: Record<Exclude<ChannelErrorType, "UNKNOWN">, Omit<ActivationPlaybook, "id" | "errorType">> = {
  TOKEN_INVALID: {
    title: "Token inválido",
    steps: [
      "Aceda ao Meta Business Suite.",
      "Gere um token de acesso válido para o número.",
      "Cole o token no diálogo «Ativar» deste canal.",
    ],
    cta: { label: "Tentar ativar de novo", action: "RETRY" },
  },
  WEBHOOK_INVALID: {
    title: "Webhook inválido",
    steps: [
      "Confirme a URL de callback no painel da Meta (deve coincidir com a da plataforma).",
      "Verifique o verify token configurado na Meta.",
      "Guarde e clique em «Verify and save» na Meta.",
    ],
    cta: { label: "Copiar URL do webhook", action: "COPY_WEBHOOK" },
  },
  META_REJECTED: {
    title: "Pedido rejeitado pela Meta",
    steps: [
      "Abra as definições da conta WhatsApp na Meta.",
      "Confirme permissões e revisão da aplicação.",
      "Corrija o que a Meta indicou e volte a tentar a ativação.",
    ],
    cta: { label: "Abrir Meta Business", action: "OPEN_META" },
  },
};

function toPlaybook(errorType: Exclude<ChannelErrorType, "UNKNOWN">): ActivationPlaybook {
  const base = PLAYBOOKS[errorType];
  return {
    id: `playbook-${errorType.toLowerCase()}`,
    errorType,
    title: base.title,
    steps: base.steps,
    cta: base.cta,
  };
}

export type ChannelPlaybookInput = {
  status: string;
  lastEvent: { type: string; message: string; createdAt?: string } | null;
};

/**
 * Último evento ERROR → classifica e devolve playbook; caso contrário `null`.
 */
export function getChannelPlaybook(channel: ChannelPlaybookInput): ActivationPlaybook | null {
  if (!channel.lastEvent || channel.lastEvent.type !== "ERROR") return null;
  const t = classifyChannelError({ message: channel.lastEvent.message });
  if (t === "UNKNOWN") return null;
  return toPlaybook(t);
}

/** DTO enviado ao cliente (sem expor ids internos desnecessários). */
export type ActivationPlaybookDto = {
  title: string;
  steps: string[];
  errorType: Exclude<ChannelErrorType, "UNKNOWN">;
  cta?: {
    label: string;
    action: PlaybookCtaAction;
    copyPayload?: string;
    href?: string;
  };
};

export function toActivationPlaybookDto(
  playbook: ActivationPlaybook,
  opts: { webhookCallbackUrl: string }
): ActivationPlaybookDto {
  const { errorType, title, steps, cta } = playbook;
  if (!cta) {
    return { title, steps, errorType, cta: undefined };
  }
  if (cta.action === "COPY_WEBHOOK") {
    return {
      title,
      steps,
      errorType,
      cta: {
        label: cta.label,
        action: cta.action,
        copyPayload: opts.webhookCallbackUrl,
      },
    };
  }
  if (cta.action === "OPEN_META") {
    return {
      title,
      steps,
      errorType,
      cta: { label: cta.label, action: cta.action, href: META_BUSINESS_URL },
    };
  }
  return {
    title,
    steps,
    errorType,
    cta: { label: cta.label, action: cta.action },
  };
}

export function resolveWebhookCallbackUrl(): string {
  const base = (process.env.NEXT_PUBLIC_WHATSAPP_APP_URL ?? "").replace(/\/$/, "");
  if (!base) return "/api/webhook/whatsapp";
  return `${base}/api/webhook/whatsapp`;
}
