/**
 * Adapters do módulo financeiro (infraestrutura).
 * Prisma, auth types, cookies, analytics, observabilidade.
 */
export * from "./prisma/prismaFinanceiro";
export * from "./auth/authContext";
export * from "./cookies/householdCookie";
export * from "./analytics/financeAnalytics";
export * from "./observability";
export * from "./metrics/financeMetrics";
export * from "./productAnalytics";
