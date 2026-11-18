import type { DashboardNextStepId } from "./dashboard-work-state";

export const DASHBOARD_NEXT_STEP_TITLE = "Próximo passo";
export const DASHBOARD_RESUME_TITLE = "Meu currículo";
export const DASHBOARD_RESUME_DESCRIPTION = "O currículo padrão é o que o ApplyFlow usa para avaliar vagas.";
export const DASHBOARD_RESUME_MANAGE = "Gerenciar currículos";
export const DASHBOARD_JOBS_TITLE = "Vagas";
export const DASHBOARD_JOBS_DESCRIPTION = "Cola o anúncio completo. A avaliação é local e não envia a candidatura.";
export const DASHBOARD_APPLICATIONS_TITLE = "Candidaturas";
export const DASHBOARD_APPLICATIONS_DESCRIPTION =
  "Só entram envios confirmados. Uma vaga salva ainda não é uma candidatura.";
export const DASHBOARD_APPLICATIONS_EMPTY = "Ainda não há candidaturas registradas.";
export const DASHBOARD_DATA_TITLE = "Dados e cópias";
export const DASHBOARD_DATA_DESCRIPTION =
  "Importe um histórico da extensão, carregue a demo fictícia ou limpe os dados deste navegador.";
export const DASHBOARD_PREPARE_INTERVIEW = "Preparar entrevista";
export const DASHBOARD_PREPARE_INTERVIEW_HINT =
  "Transfere o CareerBundle desta candidatura para o Interview Lab e abre a prática. Não envia nada ao empregador.";
export const DASHBOARD_OPEN_INTERVIEW_LAB_HINT =
  "Abre o Interview Lab. Não transfere o CareerBundle — use Preparar entrevista ou Prepare in Interview Lab para enviar os dados.";
export const DASHBOARD_MARK_SENT = "Marcar como enviada";
export const DASHBOARD_ANALYTICS_HINT = "Gráficos e padrões detalhados estão em Analytics.";
export const DASHBOARD_DERIVED_APPLICATION_HINT =
  "Envio confirmado na vaga · data e ações detalhadas indisponíveis";

export const DASHBOARD_NEXT_STEPS: Record<
  DashboardNextStepId,
  { body: string; action: string; href: string }
> = {
  resume: {
    body: "Cadastre seu perfil para avaliar vagas com aderência.",
    action: "Cadastrar perfil",
    href: "#resume-library",
  },
  job: {
    body: "Busque ou cole o anúncio da vaga. Ainda não é uma candidatura.",
    action: "Descobrir vagas",
    href: "/dashboard/discover",
  },
  analyze: {
    body: "Há vaga salva e ainda sem envio registrado. Abra a oportunidade para preparar e candidatar.",
    action: "Abrir próxima vaga",
    href: "/dashboard/opportunities",
  },
  track: {
    body: "Acompanhe os envios confirmados e a próxima ação de cada candidatura.",
    action: "Ver candidaturas",
    href: "/dashboard/applications",
  },
};
