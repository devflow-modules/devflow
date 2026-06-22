import type { CareerChatIntent } from "@devflow/career-core";
import type { CareerSpecialistFields } from "./career-chat-workspace";
import type { CareerPilotSimpleInputs } from "./career-pilot-simple-inputs";

export const CAREER_PILOT_EYEBROW = "Piloto Career Suite";

export const CAREER_PILOT_ONBOARDING_TITLE =
  "Transforme seu currículo e suas vagas em um plano de ação";

export const CAREER_PILOT_ONBOARDING_DESCRIPTION =
  "Analise seu posicionamento, compare oportunidades reais e organize as próximas decisões da sua carreira.";

export const CAREER_PILOT_PRIVACY_NOTICE =
  "Nenhuma candidatura será enviada. Seus dados não são armazenados sem autorização.";

export const CAREER_PILOT_CTA_LABEL = "Começar pelo currículo";

export const CAREER_PILOT_WORKSPACE_ID = "career-pilot-workspace";

export const CAREER_PILOT_EXAMPLE_BUTTON_LABEL = "Preencher com exemplo";

export const CAREER_PILOT_EXAMPLE_HINT = "Exemplo fictício — substitua pelos seus dados reais.";

export type CareerPilotJourneyStep = {
  intent: Extract<
    CareerChatIntent,
    "analyze_resume" | "analyze_ats_compatibility" | "plan_career_strategy"
  >;
  label: string;
  shortLabel: string;
  description: string;
};

export const CAREER_PILOT_JOURNEY_STEPS: CareerPilotJourneyStep[] = [
  {
    intent: "analyze_resume",
    label: "Analisar currículo",
    shortLabel: "Currículo",
    description: "Entenda seu posicionamento",
  },
  {
    intent: "analyze_ats_compatibility",
    label: "Comparar com uma vaga",
    shortLabel: "Vaga",
    description: "Compare com uma oportunidade real",
  },
  {
    intent: "plan_career_strategy",
    label: "Criar plano de carreira",
    shortLabel: "Plano de carreira",
    description: "Organize seus próximos passos",
  },
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

export const CAREER_PILOT_WORKFLOW_COPY: Record<
  Extract<
    CareerChatIntent,
    "analyze_resume" | "analyze_ats_compatibility" | "plan_career_strategy"
  >,
  { title: string; description: string }
> = {
  analyze_resume: {
    title: "Análise do currículo",
    description: "Descreva suas experiências e habilidades para receber recomendações revisáveis.",
  },
  analyze_ats_compatibility: {
    title: "Comparar com uma vaga",
    description: "Use uma vaga real para entender aderência e lacunas do seu perfil.",
  },
  plan_career_strategy: {
    title: "Plano de carreira",
    description: "Defina objetivos e disponibilidade para organizar um plano de ação.",
  },
};

export const CAREER_PILOT_RESULT_COMPLETION: Record<
  Extract<
    CareerChatIntent,
    "analyze_resume" | "analyze_ats_compatibility" | "plan_career_strategy"
  >,
  string
> = {
  analyze_resume: "Análise do currículo concluída",
  analyze_ats_compatibility: "Compatibilidade com a vaga calculada",
  plan_career_strategy: "Plano de carreira organizado",
};

export const CAREER_PILOT_CHAT_TITLE = "Sua análise";

export const CAREER_PILOT_CHAT_DESCRIPTION =
  "Preencha os campos abaixo. Nenhuma ação é executada automaticamente.";

export const CAREER_PILOT_CONSENT_LABEL =
  "Entendo que as sugestões são apenas para revisão e nenhuma candidatura será enviada.";

export const CAREER_PILOT_SEND_LABEL = "Executar análise";

export const CAREER_PILOT_ACTION_LABEL = "Escolha o foco da análise";

export const CAREER_PILOT_MESSAGE_LABEL = "Contexto adicional (opcional)";

export const CAREER_PILOT_DEFAULT_MESSAGE = "Quero melhorar meu posicionamento profissional.";

export const CAREER_PILOT_EMPTY_RESUME_HINT =
  "Cole um trecho suficiente do currículo para realizar a análise.";

export const CAREER_PILOT_EMPTY_ATS_HINT =
  "Cole o currículo e a descrição da vaga que deseja comparar.";

export const CAREER_PILOT_EMPTY_STRATEGY_HINT =
  "Informe seu objetivo profissional para montar o plano.";

export const CAREER_PILOT_ERROR_TITLE = "Não foi possível concluir a análise.";

export const CAREER_PILOT_ERROR_DESCRIPTION =
  "Revise os dados e tente novamente. Se o problema continuar, registre o horário da tentativa.";

export const CAREER_PILOT_EXAMPLE_FIELDS: CareerSpecialistFields = {
  resumeBullets:
    "Desenvolvi APIs REST em Node.js para integração com parceiros\nReduzi tempo de deploy em 30% com pipelines CI/CD\nLiderei squad de 4 pessoas em projeto de migração cloud",
  resumeSkills: "TypeScript, Node.js, PostgreSQL, AWS",
  jobRequirements:
    "3+ anos com backend\nExperiência com TypeScript\nConhecimento em cloud (AWS ou GCP)\nInglês intermediário",
  targetRoles: "Engenheiro de Software Backend, Desenvolvedor Node.js",
  availability: "10h/semana",
};

export const CAREER_PILOT_EXAMPLE_SIMPLE_INPUTS: CareerPilotSimpleInputs = {
  targetRole: "Engenheiro de Software Backend",
  resumeText: `Maria Souza — Desenvolvedora de Software

Experiência profissional
TechCorp (2021–presente) — Desenvolvedora Backend
Desenvolvi APIs REST em Node.js para integração com parceiros externos.
Reduzi o tempo de deploy em 30% com pipelines CI/CD no GitHub Actions.
Liderei um squad de 4 pessoas em projeto de migração para AWS.

Competências: TypeScript, Node.js, PostgreSQL, AWS, Docker, Git`,
  jobDescription: `Engenheiro de Software Backend — Empresa SaaS

Requisitos:
- 3+ anos de experiência com backend
- Experiência com TypeScript
- Conhecimento em cloud (AWS ou GCP)
- Inglês intermediário
- Experiência com APIs REST`,
  careerGoal:
    "Conseguir uma vaga como Engenheiro de Software Backend Sênior nos próximos 90 dias.",
  weeklyAvailability: "10 horas por semana",
  constraints: "Trabalho remoto, empresas SaaS e contratação CLT",
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
