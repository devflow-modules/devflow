import { FINANCEIRO_BASE_PATH } from "../constants";

/** Labels curtos para histórico de acesso e sidebar. */
export function getFinanceiroRouteLabel(pathname: string): string {
  if (pathname === `${FINANCEIRO_BASE_PATH}/dashboard`) return "Dashboard";
  if (pathname === `${FINANCEIRO_BASE_PATH}/expenses`) return "Lançamentos";
  if (pathname === `${FINANCEIRO_BASE_PATH}/sources`) return "Fontes";
  if (pathname === `${FINANCEIRO_BASE_PATH}/rules`) return "Regras";
  if (pathname === `${FINANCEIRO_BASE_PATH}/settings`) return "Configurações";
  if (pathname === `${FINANCEIRO_BASE_PATH}/onboarding`) return "Onboarding";
  if (pathname.startsWith(`${FINANCEIRO_BASE_PATH}/`)) return "Financeiro";
  return "Financeiro";
}
