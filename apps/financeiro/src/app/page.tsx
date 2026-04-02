import { FINANCEIRO_BASE_PATH } from "@devflow/financeiro-routes";
import { redirect } from "next/navigation";

export default function FinanceiroHome() {
  redirect(FINANCEIRO_BASE_PATH);
}
