import { redirect } from "next/navigation";
import {
  FINANCEIRO_BASE_PATH,
  FINANCEIRO_DEMO_PATH,
  resolveFinanceiroAppUrl,
} from "@devflow/financeiro-routes";

/**
 * Demo canónica no app Financeiro. Sem lógica de painel no portal.
 * Fallback: landing do produto no próprio portal se env ausente.
 */
export default function FinanceiroDemoRedirectPage() {
  const canonical = resolveFinanceiroAppUrl(FINANCEIRO_DEMO_PATH);
  if (canonical) {
    redirect(canonical.toString());
  }
  redirect(FINANCEIRO_BASE_PATH);
}
