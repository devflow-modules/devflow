import { redirect } from "next/navigation";
import { FINANCEIRO_DASHBOARD_PATH } from "@devflow/financeiro-routes";

/**
 * Rota estável para o cutover do portal (`/ferramentas/financeiro/demo`).
 * Encaminha para o dashboard; middleware trata sessão (auth se necessário).
 */
export default function FinanceiroDemoPage() {
  redirect(FINANCEIRO_DASHBOARD_PATH);
}
