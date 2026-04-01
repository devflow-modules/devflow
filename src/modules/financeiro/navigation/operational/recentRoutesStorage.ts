import { z } from "zod";
import { getFinanceiroRouteLabel } from "./routeLabels";
import { isPersistableFinanceiroInternalPath } from "../lastRoute";

const STORAGE_KEY = "financeiro_recent_routes_v1";
const MAX = 5;

const entrySchema = z.object({
  path: z.string().min(1).max(500),
  label: z.string().min(1).max(120),
  at: z.string().min(1),
});

const listSchema = z.array(entrySchema);

export type FinanceiroRecentRouteEntry = z.infer<typeof entrySchema>;

export function getFinanceiroRecentRoutes(): FinanceiroRecentRouteEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    const r = listSchema.safeParse(parsed);
    return r.success ? r.data.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function recordFinanceiroRecentRoute(pathname: string): void {
  if (typeof window === "undefined") return;
  if (!isPersistableFinanceiroInternalPath(pathname)) return;

  const label = getFinanceiroRouteLabel(pathname);
  const at = new Date().toISOString();
  const next: FinanceiroRecentRouteEntry = { path: pathname, label, at };

  try {
    const prev = getFinanceiroRecentRoutes();
    const deduped = prev.filter((e) => e.path !== pathname);
    const merged = [next, ...deduped].slice(0, MAX);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // ignore
  }
}
