import { z } from "zod";

const STORAGE_KEY = "financeiro_last_action_v1";

const schema = z.object({
  kind: z.string().min(1).max(64),
  title: z.string().min(1).max(200),
  detail: z.string().max(300).optional(),
  href: z.string().min(1).max(500),
  at: z.string().min(1),
});

export type FinanceiroStoredLastAction = z.infer<typeof schema>;

export function getFinanceiroLastAction(): FinanceiroStoredLastAction | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    const r = schema.safeParse(parsed);
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

function notifyOperationalRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("financeiro-operational-refresh"));
}

export function setFinanceiroLastAction(payload: FinanceiroStoredLastAction): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    notifyOperationalRefresh();
  } catch {
    // storage cheio ou privado
  }
}

export function clearFinanceiroLastAction(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
