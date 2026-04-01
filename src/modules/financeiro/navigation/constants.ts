/** Base path do produto Financeiro no app raiz */
export const FINANCEIRO_BASE_PATH = "/ferramentas/financeiro";

export const FINANCEIRO_DASHBOARD_PATH = `${FINANCEIRO_BASE_PATH}/dashboard`;

/** Cookie: última rota interna persistida (lido no servidor no redirect) */
export const FINANCEIRO_LAST_ROUTE_COOKIE = "financeiro_last_internal_path";

/** Cookie: evento de analytics pós-redirect (não httpOnly — consumido no cliente) */
export const FINANCEIRO_NAV_EVENT_COOKIE = "financeiro_nav_event";

/** Query string para ver a landing pública mesmo autenticado (demo / suporte) */
export const FINANCEIRO_STAY_PUBLIC_PARAM = "stay";
