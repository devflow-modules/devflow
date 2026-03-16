/**
 * Módulo tenants — criação, configuração e settings por tenant.
 */
export const TENANTS_MODULE = "tenants";
export { findTenantByPhoneNumberId, getTenantById, listTenants, countTenants } from "./tenantsRepository";
export { resolveTenantByPhoneNumberId } from "./tenantService";
export type { ResolvedTenant } from "./tenantService";
