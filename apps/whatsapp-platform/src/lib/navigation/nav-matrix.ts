import type { UserRole } from "@/modules/auth";
import { isOperator, isPlatformAdmin } from "@/lib/roles";

/** Secções da sidebar (colapsáveis + plataforma separada). */
export type NavSectionId = "principal" | "conta" | "operacao" | "plataforma";

export type RouteMeta = {
  label: string;
  /** Para breadcrumbs: caminho do pai (null = raiz lógica do produto). */
  parent: string | null;
  section: NavSectionId;
  /** Roles que podem ver este destino na navegação / command palette. */
  roles: readonly UserRole[];
  /** Área administrativa do tenant (visual discreto). */
  sensitive?: boolean;
  /** Só staff da plataforma (comando interno). */
  platformOnly?: boolean;
};

/** Metadados por caminho canónico (sem query). */
export const ROUTE_META: Record<string, RouteMeta> = {
  "/dashboard": {
    label: "Painel",
    parent: null,
    section: "principal",
    roles: ["manager", "platform_admin"],
  },
  "/dashboard/whatsapp": {
    label: "Ligação WhatsApp",
    parent: "/dashboard",
    section: "conta",
    roles: ["manager", "platform_admin"],
    sensitive: true,
  },
  "/dashboard/billing": {
    label: "Cobrança",
    parent: "/dashboard",
    section: "conta",
    roles: ["manager", "platform_admin"],
    sensitive: true,
  },
  "/dashboard/ai": {
    label: "IA — operação",
    parent: "/dashboard",
    section: "conta",
    roles: ["manager", "platform_admin"],
    sensitive: true,
  },
  "/inbox": {
    label: "Inbox",
    parent: null,
    section: "principal",
    roles: ["operator", "manager", "platform_admin"],
  },
  "/automation": {
    label: "Automações",
    parent: null,
    section: "principal",
    roles: ["operator", "manager", "platform_admin"],
  },
  "/conversations": {
    label: "Conversas",
    parent: null,
    section: "principal",
    roles: ["operator", "manager", "platform_admin"],
  },
  "/settings/ai-analytics": {
    label: "Análises de IA",
    parent: "/settings",
    section: "conta",
    roles: ["manager", "platform_admin"],
    sensitive: true,
  },
  "/settings": {
    label: "Configurações",
    parent: null,
    section: "conta",
    roles: ["manager", "platform_admin"],
    sensitive: true,
  },
  "/settings/ai": {
    label: "IA de atendimento",
    parent: "/settings",
    section: "conta",
    roles: ["manager", "platform_admin"],
    sensitive: true,
  },
  "/settings/billing": {
    label: "Plano no espaço de trabalho",
    parent: "/settings",
    section: "conta",
    roles: ["manager", "platform_admin"],
  },
  "/settings/developer": {
    label: "API e integrações",
    parent: "/settings",
    section: "conta",
    roles: ["manager", "platform_admin"],
    sensitive: true,
  },
  "/billing": {
    label: "Cobrança",
    parent: null,
    section: "conta",
    roles: ["manager", "platform_admin"],
  },
  "/agents": {
    label: "Equipe",
    parent: null,
    section: "operacao",
    roles: ["operator", "manager", "platform_admin"],
  },
  "/queues": {
    label: "Filas operacionais",
    parent: null,
    section: "operacao",
    roles: ["operator", "manager", "platform_admin"],
  },
  "/admin/metrics": {
    label: "Métricas internas",
    parent: null,
    section: "plataforma",
    roles: ["platform_admin"],
    platformOnly: true,
    sensitive: true,
  },
  "/admin/billing": {
    label: "Billing interno",
    parent: null,
    section: "plataforma",
    roles: ["platform_admin"],
    platformOnly: true,
    sensitive: true,
  },
  "/admin/agents": {
    label: "Agentes (plataforma)",
    parent: null,
    section: "plataforma",
    roles: ["platform_admin"],
    platformOnly: true,
    sensitive: true,
  },
  "/admin/conversations": {
    label: "Conversas (plataforma)",
    parent: null,
    section: "plataforma",
    roles: ["platform_admin"],
    platformOnly: true,
    sensitive: true,
  },
  "/admin/distribuir": {
    label: "Distribuir próxima",
    parent: null,
    section: "operacao",
    roles: ["operator", "manager", "platform_admin"],
  },
  "/onboarding": {
    label: "Ativação da conta",
    parent: null,
    section: "conta",
    roles: ["manager", "platform_admin"],
    sensitive: true,
  },
};

export type BreadcrumbItem = {
  href: string;
  label: string;
  sensitive?: boolean;
};

function normalizePath(path: string): string {
  const p = path.split("?")[0] ?? path;
  if (p.length > 1 && p.endsWith("/")) return p.slice(0, -1);
  return p || "/";
}

/** Resolve o meta mais específico (match exact ou prefixo mais longo). */
export function matchRouteMeta(pathname: string): { path: string; meta: RouteMeta } | null {
  const n = normalizePath(pathname);
  if (ROUTE_META[n]) return { path: n, meta: ROUTE_META[n] };

  let best: { path: string; meta: RouteMeta; len: number } | null = null;
  for (const [path, meta] of Object.entries(ROUTE_META)) {
    if (n === path || n.startsWith(`${path}/`)) {
      if (!best || path.length > best.len) {
        best = { path, meta, len: path.length };
      }
    }
  }
  return best;
}

/**
 * Breadcrumbs: Início contextual → … → página actual.
 * `home` vem do role (Inbox vs Painel).
 */
export function getBreadcrumbs(
  pathname: string,
  home: { href: string; label: string }
): BreadcrumbItem[] {
  const n = normalizePath(pathname);
  if (n === home.href) {
    return [{ href: home.href, label: home.label }];
  }

  const matched = matchRouteMeta(n);
  if (!matched) {
    return [
      { href: home.href, label: home.label },
      { href: n, label: segmentFallbackLabel(n) },
    ];
  }

  const chain: BreadcrumbItem[] = [];
  const visited = new Set<string>();

  function pushPath(path: string) {
    const key = normalizePath(path);
    if (visited.has(key)) return;
    visited.add(key);
    const m = ROUTE_META[key] ?? {
      label: segmentFallbackLabel(key),
      parent: null,
      section: "principal" as const,
      roles: ["operator", "manager", "platform_admin"] as const,
    };
    chain.unshift({ href: key, label: m.label, sensitive: m.sensitive });
    if (m.parent) pushPath(m.parent);
  }

  pushPath(matched.path);

  const first = chain[0];
  if (first && normalizePath(first.href) !== normalizePath(home.href)) {
    chain.unshift({ href: home.href, label: home.label });
  }

  return dedupeCrumbs(chain);
}

function dedupeCrumbs(items: BreadcrumbItem[]): BreadcrumbItem[] {
  const seen = new Set<string>();
  return items.filter((c) => {
    const k = normalizePath(c.href);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function segmentFallbackLabel(path: string): string {
  const parts = path.split("/").filter(Boolean);
  const last = parts[parts.length - 1] ?? path;
  return last.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Destinos permitidos ao role (navegação + palette). */
export function routeAllowedForRole(href: string, role: UserRole | null): boolean {
  if (!role) return false;
  const n = normalizePath(href);
  const m = matchRouteMeta(n);
  if (!m) return true;
  const { meta } = m;
  if (meta.platformOnly && !isPlatformAdmin(role)) return false;
  return meta.roles.includes(role);
}

/** Grupos macro da paleta (alinhados à sidebar e ao tipo de trabalho). */
export type PaletteGroupId = "operacao" | "gestao" | "configuracao" | "plataforma";

/** Ordem fixa dos grupos na paleta (sidebar mental model). */
export const PALETTE_GROUP_ORDER: PaletteGroupId[] = ["operacao", "gestao", "configuracao", "plataforma"];

export const PALETTE_GROUP_LABEL: Record<PaletteGroupId, string> = {
  operacao: "Operação",
  gestao: "Gestão",
  configuracao: "Configuração",
  plataforma: "Plataforma (interno)",
};

function paletteGroupForRoute(path: string, meta: RouteMeta): PaletteGroupId {
  if (meta.platformOnly) return "plataforma";
  if (path === "/dashboard" || path === "/dashboard/billing" || path === "/billing") return "gestao";
  if (
    path.startsWith("/settings") ||
    path === "/dashboard/whatsapp" ||
    path === "/onboarding"
  ) {
    return "configuracao";
  }
  return "operacao";
}

export type CommandPaletteRoute = {
  href: string;
  label: string;
  groupId: PaletteGroupId;
  groupLabel: string;
};

/** Destinos agrupados para a command palette (labels de produto, sem jargão técnico). */
export function commandPaletteRoutes(role: UserRole | null): CommandPaletteRoute[] {
  if (!role) return [];
  const out: CommandPaletteRoute[] = [];

  for (const [path, meta] of Object.entries(ROUTE_META)) {
    if (!meta.roles.includes(role)) continue;
    if (meta.platformOnly && !isPlatformAdmin(role)) continue;
    if (isOperator(role) && path.startsWith("/dashboard")) continue;
    const groupId = paletteGroupForRoute(path, meta);
    out.push({
      href: path,
      label: meta.label,
      groupId,
      groupLabel: PALETTE_GROUP_LABEL[groupId],
    });
  }

  out.sort((a, b) => {
    const oa = PALETTE_GROUP_ORDER.indexOf(a.groupId);
    const ob = PALETTE_GROUP_ORDER.indexOf(b.groupId);
    if (oa !== ob) return oa - ob;
    return a.label.localeCompare(b.label, "pt");
  });
  return out;
}

/** Matriz legível para testes / futura doc. */
export function navAccessSummary(role: UserRole): Record<string, boolean> {
  const paths = Object.keys(ROUTE_META);
  return Object.fromEntries(paths.map((p) => [p, routeAllowedForRole(p, role)]));
}
