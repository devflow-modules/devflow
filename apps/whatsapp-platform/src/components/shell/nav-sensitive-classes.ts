/**
 * Admin / config-sensitive chrome in the shell sidebar (expanded + rail).
 * Uses design tokens `--df-admin-*` — do not use Tailwind `amber-*` here.
 */
export const DF_NAV_SENSITIVE_IDLE =
  "text-[var(--df-admin-800)] hover:bg-[var(--df-admin-50)] hover:text-[var(--df-admin-900)]";

export const DF_NAV_SENSITIVE_SECTION =
  "rounded-xl ring-1 ring-[var(--df-admin-200)] bg-[var(--df-admin-50)]";

export const DF_NAV_SENSITIVE_SECTION_TITLE = "text-[var(--df-admin-800)]";

/** Expanded Plataforma divider */
export const DF_NAV_SENSITIVE_DIVIDER_EXPANDED =
  "mb-2 border-t-2 border-[var(--df-admin-200)] pt-3";

/** Compact rail Plataforma divider */
export const DF_NAV_SENSITIVE_DIVIDER_RAIL = "my-1 h-px w-6 bg-[var(--df-admin-200)]";
