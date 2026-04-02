/**
 * Registro de governança de rotas — app na raiz (`src/app`).
 * Policy: docs/architecture/ROUTING_POLICY.md
 * Matriz: docs/site/MATRIZ-DECISAO-ROTAS.md
 *
 * Usado pelo middleware em desenvolvimento para avisos; não altera respostas em produção.
 */

export type RouteGovernanceOwner =
  | "portal"
  | "financeiro-app"
  | "whatsapp-app"
  | "investigamais-app"
  | "internal";

/** 1 = estável no portal; 2 = migração em curso; 3 = remoção legado */
export type RouteGovernancePhase = 1 | 2 | 3;

export type RouteGovernanceEntry = {
  owner: RouteGovernanceOwner;
  phase: RouteGovernancePhase;
  migrationNote?: string;
};

function normalizePath(pathname: string): string {
  if (pathname !== "/" && pathname.endsWith("/")) return pathname.slice(0, -1) || "/";
  return pathname || "/";
}

/**
 * Retorna metadado de governança para o pathname atual (somente contexto raiz).
 * `null` = não catalogado (ex.: `[slug]` dinâmico, assets).
 */
export function getRouteGovernance(pathname: string): RouteGovernanceEntry | null {
  const path = normalizePath(pathname);

  if (path.startsWith("/_next") || path.startsWith("/favicon")) return null;

  // Financeiro: demo e landing pública = portal Fase 1
  if (path === "/ferramentas/financeiro" || path.startsWith("/ferramentas/financeiro/demo")) {
    return { owner: "portal", phase: 1 };
  }
  if (path.startsWith("/ferramentas/financeiro")) {
    return {
      owner: "financeiro-app",
      phase: 3,
      migrationNote:
        "Portal não serve operação Financeiro — só landing/demo; app em apps/financeiro (Bloco C)",
    };
  }

  if (path === "/billing" || path === "/upgrade") {
    return {
      owner: "financeiro-app",
      phase: 3,
      migrationNote:
        "Na raiz: redirect para apps/financeiro quando NEXT_PUBLIC_FINANCEIRO_APP_URL definido; UI canónica no app",
    };
  }

  if (path.startsWith("/dashboard/whatsapp")) {
    return {
      owner: "whatsapp-app",
      phase: 2,
      migrationNote: "Preferir apps/whatsapp-platform no host do produto",
    };
  }

  if (
    path === "/login" ||
    path.startsWith("/forgot-password") ||
    path.startsWith("/reset-password")
  ) {
    return {
      owner: "whatsapp-app",
      phase: 2,
      migrationNote: "JWT na raiz — documentar domínio; alinhar com whatsapp-platform",
    };
  }

  if (path.startsWith("/api/auth")) {
    return {
      owner: "whatsapp-app",
      phase: 2,
      migrationNote: "Auth JWT — dono operacional whatsapp-platform",
    };
  }

  if (
    path.startsWith("/api/me") ||
    path.startsWith("/api/expenses") ||
    path.startsWith("/api/incomes") ||
    path.startsWith("/api/households") ||
    path.startsWith("/api/rules") ||
    path.startsWith("/api/sources") ||
    path.startsWith("/api/cycles") ||
    path.startsWith("/api/payment-days") ||
    path.startsWith("/api/invites") ||
    path.startsWith("/api/personal-allocation-goals") ||
    path.startsWith("/api/income-allocation-goals") ||
    path.startsWith("/api/dashboard/")
  ) {
    return {
      owner: "financeiro-app",
      phase: 3,
      migrationNote: "Não servido na raiz (Bloco D) — canônico em apps/financeiro",
    };
  }

  if (path.startsWith("/api/billing/webhook")) {
    return {
      owner: "financeiro-app",
      phase: 2,
      migrationNote: "Webhook Stripe na raiz — apontar URL no Stripe ao host definitivo quando cortar",
    };
  }

  if (path.startsWith("/api/billing")) {
    return {
      owner: "financeiro-app",
      phase: 3,
      migrationNote: "Checkout/customer-portal só no app (Bloco D); webhook permanece em /api/billing/webhook se necessário",
    };
  }

  if (path.startsWith("/api/whatsapp") || path.startsWith("/api/webhook/whatsapp")) {
    return {
      owner: "whatsapp-app",
      phase: 2,
      migrationNote: "Onboard/webhook — whatsapp-platform",
    };
  }

  if (path.startsWith("/api/admin/conversations") || path.includes("/api/admin/whatsapp")) {
    return { owner: "whatsapp-app", phase: 2 };
  }

  if (path.startsWith("/api/financeiro")) {
    return {
      owner: "portal",
      phase: 1,
      migrationNote: "Leads/navegação — revisar permanência no portal pós-cutover",
    };
  }

  if (path.startsWith("/api/tools") || path.startsWith("/api/health")) {
    return { owner: "portal", phase: 1 };
  }

  if (path.startsWith("/api/analytics")) {
    return { owner: "portal", phase: 1 };
  }

  if (path.startsWith("/api/admin")) {
    return {
      owner: "internal",
      phase: 2,
      migrationNote: "Definir dono por rota (métricas / produto)",
    };
  }

  if (
    path === "/" ||
    path.startsWith("/produtos") ||
    path.startsWith("/precos") ||
    path === "/pricing" ||
    path.startsWith("/como-funciona") ||
    path.startsWith("/contato") ||
    path.startsWith("/sobre") ||
    path.startsWith("/projetos") ||
    path.startsWith("/blog") ||
    path.startsWith("/demo") ||
    path.startsWith("/cookies") ||
    path.startsWith("/termos") ||
    path.startsWith("/privacidade") ||
    path.startsWith("/ferramentas")
  ) {
    return { owner: "portal", phase: 1 };
  }

  if (
    path.startsWith("/automacao-whatsapp") ||
    path.startsWith("/software-atendimento-whatsapp") ||
    path.startsWith("/chatbot-whatsapp")
  ) {
    return { owner: "portal", phase: 1 };
  }

  return null;
}

/** Mensagem para console em dev (Fase > 1). */
export function formatGovernanceDevWarning(pathname: string, g: RouteGovernanceEntry): string {
  return `[${g.owner}] Fase ${g.phase}${g.migrationNote ? ` — ${g.migrationNote}` : ""} (path: ${pathname})`;
}

export function shouldEmitGovernanceDevWarning(g: RouteGovernanceEntry): boolean {
  return g.phase > 1;
}
