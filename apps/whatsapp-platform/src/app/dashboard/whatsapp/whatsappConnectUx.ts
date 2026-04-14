/**
 * UX do fluxo de conexão WhatsApp (sem alterar APIs).
 * Mapeia respostas da API para mensagens humanas; logs só no cliente para diagnóstico.
 */

export type OnboardingErrorKind = "permission" | "business_access" | "generic";

export type OnboardingUxStage =
  | "onboarding_start"
  | "onboarding_redirect"
  | "onboarding_success"
  | "onboarding_error";

/** Log legível no consola (sem dados sensíveis). */
export function logOnboardingUxStage(
  stage: OnboardingUxStage,
  extra?: Record<string, unknown>
): void {
  if (typeof console === "undefined" || !console.info) return;
  console.info(
    "[WHATSAPP][OnboardingUX]",
    JSON.stringify({ stage, ...extra, ts: new Date().toISOString() })
  );
}

/**
 * Infere o tipo de mensagem a partir do texto bruto (nunca mostrar esse texto ao utilizador final).
 */
export function mapOnboardingErrorToKind(message: string, status: number): OnboardingErrorKind {
  const m = message.toLowerCase();
  if (
    status === 403 ||
    m.includes("permissão") ||
    m.includes("permission") ||
    m.includes("acesso negado") ||
    m.includes("application does not") ||
    m.includes("não tem permissão") ||
    m.includes("sem permissão")
  ) {
    return "permission";
  }
  if (
    m.includes("nenhum número") ||
    m.includes("número whatsapp") ||
    m.includes("business suite") ||
    m.includes("meta business") ||
    (m.includes("negócio") && (m.includes("configurar") || m.includes("conectar")))
  ) {
    return "business_access";
  }
  return "generic";
}

/** Link configurável (ex.: página de suporte); fallback mailto. */
export function getWhatsappSupportHref(): string {
  const u = process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_URL?.trim();
  if (u) return u;
  return "mailto:suporte@devflowlabs.com.br";
}

export const ONBOARDING_ERROR_COPY: Record<
  OnboardingErrorKind,
  { title: string; description: string }
> = {
  permission: {
    title: "Não conseguimos concluir a conexão.",
    description: "Verifique se você está usando a conta correta do Facebook e tente novamente.",
  },
  business_access: {
    title: "Sua conta precisa de acesso ao WhatsApp Business.",
    description: "A Meta pode pedir para configurar seu negócio durante o processo.",
  },
  generic: {
    title: "Algo deu errado ao conectar.",
    description: "Tente novamente. Se continuar, podemos te ajudar.",
  },
};
