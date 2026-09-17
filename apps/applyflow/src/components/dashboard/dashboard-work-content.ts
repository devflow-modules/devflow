import type { DashboardNextStepId } from "./dashboard-work-state";

export const DASHBOARD_NEXT_STEP_TITLE = "Próximo passo";
export const DASHBOARD_RESUME_TITLE = "Meu currículo";
export const DASHBOARD_RESUME_DESCRIPTION = "O currículo padrão é o que o ApplyFlow usa para avaliar vagas.";
export const DASHBOARD_RESUME_MANAGE = "Gerenciar currículos";
export const DASHBOARD_JOBS_TITLE = "Vagas";
export const DASHBOARD_JOBS_DESCRIPTION = "Cola o anúncio completo. A avaliação é local e não envia a candidatura.";
export const DASHBOARD_APPLICATIONS_TITLE = "Candidaturas";
export const DASHBOARD_APPLICATIONS_DESCRIPTION =
  "Só entram vagas que registaste. Uma vaga salva ainda não é uma candidatura.";
export const DASHBOARD_APPLICATIONS_EMPTY = "Ainda não há candidaturas registadas.";
export const DASHBOARD_DATA_TITLE = "Dados e cópias";
export const DASHBOARD_DATA_DESCRIPTION =
  "Importa um histórico da extensão, carrega a demo fictícia, ou limpa os dados deste browser.";
export const DASHBOARD_PREPARE_INTERVIEW = "Preparar entrevista";
export const DASHBOARD_PREPARE_INTERVIEW_HINT =
  "Transfere o CareerBundle desta candidatura para o Interview Lab e abre a prática. Não envia nada ao empregador.";
export const DASHBOARD_OPEN_INTERVIEW_LAB_HINT =
  "Abre o Interview Lab. Não transfere o CareerBundle — use Preparar entrevista ou Prepare in Interview Lab para enviar os dados.";
export const DASHBOARD_MARK_SENT = "Marcar como enviada";
export const DASHBOARD_ANALYTICS_HINT = "Gráficos e padrões detalhados estão em Analytics.";

export const DASHBOARD_NEXT_STEPS: Record<
  DashboardNextStepId,
  { body: string; action: string; href: string }
> = {
  resume: {
    body: "Cadastra o teu perfil para poderes avaliar vagas.",
    action: "Cadastrar perfil",
    href: "#resume-library",
  },
  job: {
    body: "Cola o anúncio da vaga. Ainda não estás a candidatar-te.",
    action: "Adicionar vaga",
    href: "#job-inbox",
  },
  analyze: {
    body: "Tens uma vaga salva e nenhuma candidatura. Analisa a vaga antes de registar o envio.",
    action: "Analisar vaga",
    href: "#job-inbox",
  },
  track: {
    body: "Regista só o que aconteceu de verdade e acompanha as candidaturas.",
    action: "Ver candidaturas",
    href: "#applications",
  },
};
