export type DashboardWorkspace = "overview" | "discover" | "opportunities" | "applications";

export function resolveDashboardWorkspace(pathname: string): DashboardWorkspace {
  if (pathname.startsWith("/dashboard/applications")) return "applications";
  if (pathname.startsWith("/dashboard/opportunities")) return "opportunities";
  if (pathname.startsWith("/dashboard/discover")) return "discover";
  return "overview";
}
