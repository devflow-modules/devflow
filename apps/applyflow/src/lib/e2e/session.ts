import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { assertE2ESecretMatches, isApplyFlowE2ERuntimeAllowed } from "./runtime-guard";

export const APPLYFLOW_E2E_SESSION_COOKIE = "af_e2e_session";
export const APPLYFLOW_E2E_AUTH_SUB = "e2e_applyflow_auth_sub";

/** Allowed E2E auth subjects: fixed default or e2e_applyflow_<slug>. */
const E2E_AUTH_SUB_RE = /^e2e_applyflow_[a-z0-9_]{1,48}$/;

type E2ESessionPayload = {
  sub: string;
  exp: number;
};

export function isAllowedE2EAuthSub(sub: string): boolean {
  return sub === APPLYFLOW_E2E_AUTH_SUB || E2E_AUTH_SUB_RE.test(sub);
}

function signPayload(payload: E2ESessionPayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifySigned(token: string, secret: string): E2ESessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as E2ESessionPayload;
    if (!parsed?.sub || typeof parsed.exp !== "number") return null;
    if (!isAllowedE2EAuthSub(parsed.sub)) return null;
    if (Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function createE2ESessionToken(
  env: NodeJS.ProcessEnv = process.env,
  authSub: string = APPLYFLOW_E2E_AUTH_SUB,
): string | null {
  if (!isApplyFlowE2ERuntimeAllowed(env)) return null;
  if (!isAllowedE2EAuthSub(authSub)) return null;
  const secret = env.APPLYFLOW_E2E_SECRET?.trim();
  if (!secret) return null;
  return signPayload(
    { sub: authSub, exp: Date.now() + 60 * 60 * 1000 },
    secret,
  );
}

export async function readE2ESessionAuthSub(
  env: NodeJS.ProcessEnv = process.env,
): Promise<string | null> {
  if (!isApplyFlowE2ERuntimeAllowed(env)) return null;
  const secret = env.APPLYFLOW_E2E_SECRET?.trim();
  if (!secret) return null;
  const jar = await cookies();
  const raw = jar.get(APPLYFLOW_E2E_SESSION_COOKIE)?.value;
  if (!raw) return null;
  const payload = verifySigned(raw, secret);
  return payload?.sub ?? null;
}

export function authorizeE2ESessionMutation(
  secretHeader: string | null,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return assertE2ESecretMatches(secretHeader, env);
}
