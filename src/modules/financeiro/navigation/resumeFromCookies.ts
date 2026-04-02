import {
  FINANCEIRO_DASHBOARD_PATH,
  FINANCEIRO_LAST_ROUTE_COOKIE,
} from "@devflow/financeiro-routes";
import { normalizeResumeTargetPath } from "./lastRoute";

type CookieGetter = { get(name: string): { value: string } | undefined };

export function resolveFinanceiroResumeFromCookies(cookieStore: CookieGetter): {
  targetPath: string;
  hasLastRoute: boolean;
} {
  const raw = cookieStore.get(FINANCEIRO_LAST_ROUTE_COOKIE)?.value ?? null;
  const targetPath = normalizeResumeTargetPath(raw, FINANCEIRO_DASHBOARD_PATH);
  const hasLastRoute =
    Boolean(raw?.trim()) && targetPath !== FINANCEIRO_DASHBOARD_PATH;
  return { targetPath, hasLastRoute };
}
