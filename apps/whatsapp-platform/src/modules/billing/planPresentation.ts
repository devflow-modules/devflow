/**
 * Narrativa comercial e apresentação dos planos (UI / produto).
 *
 * Os limites numéricos e flags de feature continuam em `plans.ts` — fonte de verdade para enforcement.
 */

import type { PlanKey } from "./plans";
import { formatIncludedUsageSentence } from "./usageCommunication";

/** Título curto por plano: estágio da operação (valor, não técnico). */
export const COMMERCIAL_PLAN_HEADLINE: Record<PlanKey, string> = {
  FREE: "Testar a plataforma",
  STARTER: "Começar a operar com organização",
  PRO: "Operar com equipe, IA e controle",
  SCALE: "Escalar atendimento com mais volume e automação",
};

/** Subtítulo: para quem é (linha de valor). */
export const COMMERCIAL_PLAN_SUBTITLE: Record<PlanKey, string> = {
  FREE: "Para explorar a Inbox, ligar o WhatsApp e validar o fluxo antes de crescer.",
  STARTER: "Para começar a centralizar o atendimento e responder com mais organização.",
  PRO: "Ideal para equipas que precisam organizar o atendimento, usar IA e ganhar produtividade.",
  SCALE:
    "Para operações com maior volume, múltiplos atendentes e necessidade de escala — não é só «mais caro», é preparado para crescer.",
};

/** Benefícios em linguagem de resultado (o que resolve). */
export const COMMERCIAL_PLAN_BENEFITS: Record<PlanKey, readonly string[]> = {
  FREE: [
    "Inbox para receber e responder conversas num só lugar",
    "Ligar um canal WhatsApp Business e começar a operar",
    "Primeiros passos com IA de atendimento",
  ],
  STARTER: [
    "Atendimento mais organizado e menos caótico no dia a dia",
    "Automação básica (regras simples) — sem fluxos avançados nem filas operacionais",
    "Um lugar central para o histórico e o estado das conversas",
  ],
  PRO: [
    "Filas, tags e responsáveis nas conversas (a partir deste plano)",
    "Equipa com até 3 atendentes a trabalhar em conjunto",
    "IA de atendimento configurável (identidade, regras e guardrails)",
    "Automação avançada (fluxos ricos) e relatórios para acompanhar a operação",
  ],
  SCALE: [
    "Todas as capacidades do Pro, com limites mais altos e IA avançada (modelo premium)",
    "Mais interações de IA e volume de conversas para operações exigentes",
    "Até 10 pessoas na equipa e até 3 canais WhatsApp",
    "API e webhooks para integrar com CRM e sistemas próprios",
    "Suporte prioritário incluído",
  ],
};

/** Texto do botão de checkout por plano pago. */
export const COMMERCIAL_CHECKOUT_CTA: Record<"STARTER" | "PRO" | "SCALE", string> = {
  STARTER: "Começar",
  PRO: "Começar com PRO",
  SCALE: "Escalar operação",
};

export const COMMERCIAL_TAGLINE: Record<PlanKey, string> = COMMERCIAL_PLAN_SUBTITLE;

/** @deprecated Prefer COMMERCIAL_PLAN_SUBTITLE; mantido para imports antigos. */
export const COMMERCIAL_POSITIONING: Record<PlanKey, string> = COMMERCIAL_PLAN_SUBTITLE;

export const COMMERCIAL_RECOMMENDED_PLAN: PlanKey = "PRO";

export const COMMERCIAL_RECOMMENDED_BADGE = "Mais escolhido";

/** Subtítulo da página Plano e faturação (PageHeader / contexto). */
export const BILLING_PAGE_HEADER_DESCRIPTION =
  "Gerencie o seu plano, consumo e crescimento da sua operação.";

/** Mesma linha no cartão do plano (BillingHeader), alinhada ao PageHeader. */
export const BILLING_HEADER_SUPPORTING_LINE = BILLING_PAGE_HEADER_DESCRIPTION;

/** Microcopy abaixo da tabela de planos — reduz fricção na escolha. */
export const PRICING_DECISION_REASSURANCE =
  "Comece com o plano que melhor representa a sua operação hoje. Pode alterar a qualquer momento.";

/** Texto secundário para agrupar quotas numéricas (sem as destacar como principal). */
export const PRICING_LIMITS_SECTION_TITLE = "O que está incluído em cada plano";

export function formatIncludedLimitsLine(plan: PlanKey): string {
  return formatIncludedUsageSentence(plan);
}

/** Sugestão de upgrade contextual (plano atual → próximo passo). */
export function upgradeSuggestionCopy(current: PlanKey): { title: string; href: string } | null {
  if (current === "FREE" || current === "STARTER") {
    return {
      title: "Para operar com equipe e filas → plano Pro",
      href: "/dashboard/billing",
    };
  }
  if (current === "PRO") {
    return {
      title: "Para mais volume e integrações → plano Scale",
      href: "/dashboard/billing",
    };
  }
  return null;
}

/** CTA principal «mudar plano» — específico ao próximo passo natural. */
export function billingChangePlanButtonLabel(current: PlanKey): string {
  if (current === "FREE" || current === "STARTER") {
    return "Para operar com equipe e filas → plano Pro";
  }
  if (current === "PRO") {
    return "Para mais volume e integrações → plano Scale";
  }
  if (current === "SCALE") {
    return "Alterar ou rever plano";
  }
  return "Mudar de plano";
}

/** Título do cartão de upgrade (próximo plano na sequência). */
export function upgradeCtaHeadline(current: PlanKey, next: PlanKey): string {
  if (next === "PRO") {
    return "Para operar com equipe e filas → plano Pro";
  }
  if (next === "SCALE" && current === "PRO") {
    return "Para mais volume e integrações → plano Scale";
  }
  if (next === "SCALE") {
    return "Escalar a operação com o plano Scale";
  }
  return "Próximo passo de plano";
}

/** Dicas contextuais leves (não intrusivas) com link para billing. */
export const CONTEXTUAL_UPGRADE_HINTS = {
  inbox:
    "Para organizar conversas com filas e responsáveis → o plano Pro foi pensado para equipes.",
  aiSettings: "Precisa de mais margem para IA e automação? Veja os planos e limites incluídos.",
  whatsappChannel:
    "Para vários canais e operação pesada → o Scale acompanha mais volume e integrações.",
} as const;

export type ValueAxisId = "operacao" | "ia" | "gestao" | "escala";

export type PlanComparisonCell = {
  label: string;
  free: string;
  starter: string;
  pro: string;
  scale: string;
};

const COLUMN_KEY: Record<
  PlanKey,
  keyof Pick<PlanComparisonCell, "free" | "starter" | "pro" | "scale">
> = {
  FREE: "free",
  STARTER: "starter",
  PRO: "pro",
  SCALE: "scale",
};

export function comparisonCellValue(row: PlanComparisonCell, plan: PlanKey): string {
  return row[COLUMN_KEY[plan]];
}

export const PLAN_VALUE_COMPARISON: { axis: ValueAxisId; title: string; rows: PlanComparisonCell[] }[] = [
  {
    axis: "operacao",
    title: "Operação",
    rows: [
      {
        label: "Inbox e conversas",
        free: "Receber e responder",
        starter: "Operação no mesmo sítio",
        pro: "Filas, tags e responsáveis",
        scale: "Operação intensiva e estável",
      },
      {
        label: "Canal WhatsApp",
        free: "Um canal para começar",
        starter: "Um canal",
        pro: "Um canal com equipa",
        scale: "Vários canais para escalar",
      },
      {
        label: "Organização do trabalho",
        free: "Essencial",
        starter: "Rotina mais clara",
        pro: "Filas e prioridades visíveis",
        scale: "O mesmo em maior escala",
      },
    ],
  },
  {
    axis: "ia",
    title: "IA de atendimento",
    rows: [
      {
        label: "Configuração e controlo",
        free: "Introdução",
        starter: "IA alinhada ao negócio",
        pro: "IA configurável + relatórios avançados",
        scale: "IA avançada (modelo premium) para operações exigentes",
      },
      {
        label: "Automação (regras e fluxos)",
        free: "Não incluída",
        starter: "Regras básicas (sem fluxos avançados)",
        pro: "Fluxos avançados; filas no plano",
        scale: "Fluxos avançados + IA avançada + API",
      },
    ],
  },
  {
    axis: "gestao",
    title: "Gestão",
    rows: [
      {
        label: "Equipa",
        free: "Um utilizador",
        starter: "Um operador focado",
        pro: "Equipa com até 3 atendentes",
        scale: "Até 10 pessoas na operação",
      },
      {
        label: "Visão do negócio",
        free: "Visão básica",
        starter: "Visão básica",
        pro: "Relatórios para gerir a operação",
        scale: "Relatórios e operações maduras",
      },
    ],
  },
  {
    axis: "escala",
    title: "Escala",
    rows: [
      {
        label: "Volume de conversas",
        free: "Para experimentar",
        starter: "Operação pequena",
        pro: "Operação em crescimento",
        scale: "Alto volume suportado",
      },
      {
        label: "Integrações",
        free: "—",
        starter: "—",
        pro: "—",
        scale: "API e webhooks para o seu ecossistema",
      },
    ],
  },
];
