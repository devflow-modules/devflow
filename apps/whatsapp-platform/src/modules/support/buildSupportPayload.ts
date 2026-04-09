import type { JwtPayload } from "@/modules/auth/authService";
import type { SupportCategory, SupportDiagnostics, SupportPayload } from "./supportTypes";

export type BuildSupportPayloadInput = {
  debugId: string;
  payload: JwtPayload;
  category: SupportCategory;
  description: string;
  pathname: string;
  userAgent: string;
  environment: string;
  capturedAtIso: string;
  diagnostics: SupportDiagnostics;
};

/**
 * Monta o payload canónico do relatório (usado no handler e nos testes).
 * Não inclui tokens nem credenciais.
 */
export function buildSupportPayload(input: BuildSupportPayloadInput): SupportPayload {
  const { debugId, payload, category, description, pathname, userAgent, environment, capturedAtIso, diagnostics } =
    input;
  return {
    debugId,
    userId: payload.sub,
    email: payload.email,
    tenantId: payload.tenantId,
    role: payload.role,
    category,
    description: description.trim(),
    pathname: pathname.trim() || "/",
    capturedAtIso,
    userAgent: userAgent.trim().slice(0, 2000),
    environment,
    diagnostics: { ...diagnostics },
  };
}
