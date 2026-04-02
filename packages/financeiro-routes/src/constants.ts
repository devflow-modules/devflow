/** Base path do produto Financeiro (portal e app canónico). */
export const FINANCEIRO_BASE_PATH = "/ferramentas/financeiro";

export const FINANCEIRO_DASHBOARD_PATH = `${FINANCEIRO_BASE_PATH}/dashboard`;

export const FINANCEIRO_EXPENSES_PATH = `${FINANCEIRO_BASE_PATH}/expenses`;

/** Painel de exemplo sem login (dados fictícios) — tipicamente no portal. */
export const FINANCEIRO_DEMO_PATH = `${FINANCEIRO_BASE_PATH}/demo`;

export const FINANCEIRO_AUTH_PATH = `${FINANCEIRO_BASE_PATH}/auth`;

/** Cookie: última rota interna persistida (lido no servidor no redirect). */
export const FINANCEIRO_LAST_ROUTE_COOKIE = "financeiro_last_internal_path";

/** Cookie: evento de analytics pós-redirect (não httpOnly — consumido no cliente). */
export const FINANCEIRO_NAV_EVENT_COOKIE = "financeiro_nav_event";

/** Query string para ver a landing pública mesmo autenticado (demo / suporte). */
export const FINANCEIRO_STAY_PUBLIC_PARAM = "stay";
