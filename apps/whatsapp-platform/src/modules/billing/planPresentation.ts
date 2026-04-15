/**
 * Narrativa comercial (venda consultiva): avaliação + operação contratada.
 * Limites e flags: `plans.ts`.
 */

import type { PlanKey } from "./plans";
import { formatIncludedUsageSentence } from "./usageCommunication";

/** Título curto por plano: estágio da operação (valor, não técnico). */
export const COMMERCIAL_PLAN_HEADLINE: Record<PlanKey, string> = {
  FREE: "Demonstração da plataforma em ambiente limitado",
  OPERATIONAL_BASE: "Operação profissional no WhatsApp",
};

/** Subtítulo: para quem é (linha de valor). */
export const COMMERCIAL_PLAN_SUBTITLE: Record<PlanKey, string> = {
  FREE: "Avaliação guiada: experimente inbox e IA com limites claros — a operação completa vem com a implantação.",
  OPERATIONAL_BASE:
    "Sistema profissional para organizar, controlar e escalar o atendimento da sua empresa no WhatsApp — com implantação acompanhada.",
};

/** Benefícios em linguagem de resultado (o que resolve). */
export const COMMERCIAL_PLAN_BENEFITS: Record<PlanKey, readonly string[]> = {
  FREE: [
    "Inbox para receber e responder conversas num só lugar",
    "Ligar um canal WhatsApp Business e percorrer o fluxo real",
    "Primeiros passos com IA de atendimento (volume incluído limitado)",
  ],
  OPERATIONAL_BASE: [
    "Inbox com filas, responsáveis e prioridade",
    "Equipa, automação e IA alinhadas à operação",
    "Relatórios e integrações quando precisar de escalar",
    "Contrato e limites ajustados à sua realidade — sem «menu de planos» genérico",
  ],
};

export const COMMERCIAL_CHECKOUT_CTA: Record<PlanKey, string> = {
  FREE: "Continuar na avaliação guiada",
  OPERATIONAL_BASE: "Ativar operação completa",
};

export const COMMERCIAL_TAGLINE: Record<PlanKey, string> = COMMERCIAL_PLAN_SUBTITLE;

/** @deprecated Prefer COMMERCIAL_PLAN_SUBTITLE; mantido para imports antigos. */
export const COMMERCIAL_POSITIONING: Record<PlanKey, string> = COMMERCIAL_PLAN_SUBTITLE;

export const COMMERCIAL_RECOMMENDED_PLAN: PlanKey = "OPERATIONAL_BASE";

export const COMMERCIAL_RECOMMENDED_BADGE = "Recomendado";

/** Subtítulo da página Consumo / faturação (PageHeader / contexto). */
export const BILLING_PAGE_HEADER_DESCRIPTION =
  "Acompanhe o consumo do período e a sua assinatura. Ajustes de contrato e implantação são feitos com a nossa equipa.";

/** Secção de venda consultiva na página Plano / billing (FREE → operação completa). */
export const HOW_FULL_OPERATION_WORKS = {
  title: "Como funciona a operação completa",
  intro:
    "Depois da avaliação guiada, a operação em produção combina implantação (setup) com mensalidade operacional alinhada ao volume e à equipa.",
  bullets: [
    "Implantação: canais, permissões, regras e integrações conforme o contrato.",
    "Mensalidade: pacote incluído de conversas e IA, com expansão transparente quando precisar de mais volume.",
    "Ajustes de funcionalidades e limites são tratados com a equipa — não é um produto self-service genérico.",
  ] as const,
} as const;

/** Mesma linha no cartão do plano (BillingHeader), alinhada ao PageHeader. */
export const BILLING_HEADER_SUPPORTING_LINE = BILLING_PAGE_HEADER_DESCRIPTION;

export const PRICING_DECISION_REASSURANCE =
  "O pacote incluído reflete a sua operação contratada. Precisa de mais volume? Falamos e ajustamos sem parar o atendimento.";

export const PRICING_LIMITS_SECTION_TITLE = "O que está incluído no pacote";

export function formatIncludedLimitsLine(plan: PlanKey): string {
  return formatIncludedUsageSentence(plan);
}

/** Sem upsell SaaS de «trocar de plano» — direciona para conversa comercial. */
export function upgradeSuggestionCopy(current: PlanKey): { title: string; href: string } | null {
  if (current === "FREE") {
    return {
      title: "Quer operação completa com implantação? Fale com a nossa equipa.",
      href: "/dashboard/billing",
    };
  }
  return null;
}

export function billingChangePlanButtonLabel(current: PlanKey): string {
  void current;
  return "Falar sobre o contrato ou volumes";
}

export function upgradeCtaHeadline(current: PlanKey, next: PlanKey): string {
  void current;
  void next;
  return "Ajustar pacote ou implantação";
}

export const CONTEXTUAL_UPGRADE_HINTS = {
  inbox:
    "Neste ambiente de avaliação, filas e responsáveis avançados fazem parte da operação completa — combinamos na implantação. Veja consumo em Consumo e faturação.",
  aiSettings:
    "Margem de IA e automação alinhadas ao contrato: na avaliação o uso é limitado; para expandir, avance para a operação completa com a equipa.",
  whatsappChannel:
    "Vários canais e volumes maiores entram no pacote de implantação — fale connosco quando for avançar da demonstração para a operação.",
} as const;

export type ValueAxisId = "operacao" | "ia" | "gestao" | "escala";

export type PlanComparisonCell = {
  label: string;
  free: string;
  operationalBase: string;
};

const COLUMN_KEY: Record<PlanKey, keyof Pick<PlanComparisonCell, "free" | "operationalBase">> = {
  FREE: "free",
  OPERATIONAL_BASE: "operationalBase",
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
        operationalBase: "Filas, tags, prioridade e histórico completo",
      },
      {
        label: "Canal WhatsApp",
        free: "Um canal para começar",
        operationalBase: "Até várias linhas conforme contrato",
      },
      {
        label: "Organização do trabalho",
        free: "Essencial",
        operationalBase: "Operação com visibilidade e controlo",
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
        operationalBase: "IA configurável, guardrails e relatórios",
      },
      {
        label: "Automação (regras e fluxos)",
        free: "Não incluída",
        operationalBase: "Regras, fluxos e recuperação comercial",
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
        operationalBase: "Equipa conforme pacote contratado",
      },
      {
        label: "Visão do negócio",
        free: "Visão básica",
        operationalBase: "Relatórios e funil alinhados à operação",
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
        operationalBase: "Pacote mensal + uso adicional transparente",
      },
      {
        label: "Integrações",
        free: "—",
        operationalBase: "API e webhooks quando faz parte do contrato",
      },
    ],
  },
];
