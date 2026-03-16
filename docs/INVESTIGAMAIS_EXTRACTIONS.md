# Investiga+ — Extractions to shared packages

## Current state

No Investiga+-specific logic was extracted to shared packages. Per blueprint:

- **Do not** extract CNPJ-specific logic, profile bonus rules, or Investiga+ DB queries into packages.
- **Candidates** for future extraction (if reused by other products): generic email/CPF validators, generic HTTP retry helpers. These remain in the app for now:
  - `lib/validators/cpf.ts` — isValidCpf, formatCpfDigits
  - `lib/validators/email.ts` — zod schema + isValidEmail

If another app in the monorepo needs the same validators, they can be moved to e.g. `packages/config` or a small `packages/validators` and consumed by investigamais.
