/**
 * Domain orchestration — cross-module workflows.
 * E.g. after CNPJ query, update consultation; after profile completion, award bonus.
 * Bonus is handled inside modules/users/profileService.
 */
export const DOMAIN_MODULE = "domain";
