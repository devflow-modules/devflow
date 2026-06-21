import type { CareerChatIntent } from "@devflow/career-core";
import type { CareerSpecialistFields } from "./career-chat-workspace";

export const CAREER_PILOT_ONBOARDING_TITLE = "Prepare sua carreira com um plano de ação claro";

export const CAREER_PILOT_ONBOARDING_DESCRIPTION =
  "Analise seu currículo, compare com uma vaga real e organize os próximos passos da sua carreira.";

export const CAREER_PILOT_PRIVACY_NOTICE =
  "Nenhuma candidatura será enviada e seus dados não serão armazenados sem sua autorização.";

export const CAREER_PILOT_CTA_LABEL = "Começar análise";

export const CAREER_PILOT_WORKSPACE_ID = "career-pilot-workspace";

export const CAREER_PILOT_EXAMPLE_BUTTON_LABEL = "Preencher com exemplo";

export const CAREER_PILOT_JOURNEY_STEPS: { intent: CareerChatIntent; label: string }[] = [
  { intent: "analyze_resume", label: "Analisar currículo" },
  { intent: "analyze_ats_compatibility", label: "Comparar com uma vaga" },
  { intent: "plan_career_strategy", label: "Criar plano de carreira" },
];

export const CAREER_PILOT_ACTION_LABELS: Record<
  Extract<
    CareerChatIntent,
    "analyze_resume" | "analyze_ats_compatibility" | "plan_career_strategy"
  >,
  string
> = {
  analyze_resume: "Analisar currículo",
  analyze_ats_compatibility: "Comparar com uma vaga",
  plan_career_strategy: "Criar plano de carreira",
};

export const CAREER_PILOT_CHAT_TITLE = "Análise de carreira";

export const CAREER_PILOT_CHAT_DESCRIPTION =
  "Informe seus dados abaixo para receber recomendações revisáveis — nenhuma ação é executada automaticamente.";

export const CAREER_PILOT_CONSENT_LABEL =
  "Entendo que as sugestões são apenas para revisão e nenhuma candidatura será enviada.";

export const CAREER_PILOT_SEND_LABEL = "Analisar";

export const CAREER_PILOT_ACTION_LABEL = "Tipo de análise";

export const CAREER_PILOT_MESSAGE_LABEL = "Contexto da análise (opcional)";

export const CAREER_PILOT_DEFAULT_MESSAGE = "Quero melhorar meu posicionamento profissional.";

export const CAREER_PILOT_EMPTY_RESUME_HINT =
  "Informe ao menos uma experiência ou habilidade do seu currículo para iniciar a análise.";

export const CAREER_PILOT_EMPTY_ATS_HINT =
  "Informe experiências ou habilidades do currículo e os requisitos da vaga para comparar.";

export const CAREER_PILOT_EMPTY_STRATEGY_HINT =
  "Informe os cargos-alvo que deseja perseguir para montar o plano.";

export const CAREER_PILOT_EXAMPLE_FIELDS: CareerSpecialistFields = {
  resumeBullets:
    "Desenvolvi APIs REST em Node.js para integração com parceiros\nReduzi tempo de deploy em 30% com pipelines CI/CD\nLiderei squad de 4 pessoas em projeto de migração cloud",
  resumeSkills: "TypeScript, Node.js, PostgreSQL, AWS",
  jobRequirements:
    "3+ anos com backend\nExperiência com TypeScript\nConhecimento em cloud (AWS ou GCP)\nInglês intermediário",
  targetRoles: "Engenheiro de Software Backend, Desenvolvedor Node.js",
  availability: "10h/semana",
};

export const CAREER_PILOT_INTENTS = [
  "analyze_resume",
  "analyze_ats_compatibility",
  "plan_career_strategy",
] as const satisfies readonly CareerChatIntent[];

export type CareerPilotIntent = (typeof CAREER_PILOT_INTENTS)[number];

export function isCareerPilotIntent(intent: CareerChatIntent): intent is CareerPilotIntent {
  return (CAREER_PILOT_INTENTS as readonly CareerChatIntent[]).includes(intent);
}
