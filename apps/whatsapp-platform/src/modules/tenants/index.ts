/**
 * Módulo tenants — criação, configuração e settings por tenant.
 */
export const TENANTS_MODULE = "tenants";
export { getTenantById, listTenants, countTenants } from "./tenantsRepository";
export { resolveTenantByPhoneNumberId } from "@/modules/whatsapp/tenantResolutionService";
export type { ResolvedTenant } from "@/modules/whatsapp/tenantResolutionService";
