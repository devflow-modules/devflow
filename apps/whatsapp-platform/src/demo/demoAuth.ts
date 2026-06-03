import type { AuthResult } from "@/modules/auth";
import type { JwtPayload, UserRole } from "@/modules/auth/authService";
import type { TenantSnapshot } from "@/lib/tenant-session";
import {
  DEMO_PHONE_NUMBER_ID,
  DEMO_TENANT_ID,
  DEMO_TENANT_NAME,
  DEMO_USER_MANAGER_ID,
} from "./constants";

const DEMO_SESSION_ID = "demo-session-showcase";

export function getDemoJwtPayload(role: UserRole = "manager"): JwtPayload {
  return {
    sub: role === "platform_admin" ? "demo-user-admin" : DEMO_USER_MANAGER_ID,
    email: "demo.manager@showcase.devflow.local",
    name: "Ana Gestora (demo)",
    role,
    tenantId: DEMO_TENANT_ID,
    jti: DEMO_SESSION_ID,
    iat: Math.floor(Date.now() / 1000) - 3600,
    exp: Math.floor(Date.now() / 1000) + 86400 * 30,
  };
}

export function getDemoAuthResult(role: UserRole = "manager"): AuthResult {
  const payload = getDemoJwtPayload(role);
  return {
    payload,
    token: "demo-showcase-token",
    sessionId: DEMO_SESSION_ID,
  };
}

export function getDemoTenantSnapshot(): TenantSnapshot {
  return {
    authenticated: true,
    tenantId: DEMO_TENANT_ID,
    tenantName: DEMO_TENANT_NAME,
    phoneConnected: true,
    promptReady: true,
    apiKeyReady: true,
    activationComplete: true,
    primaryBusinessDisplayNumber: "+55 11 90000-0000",
    primaryBusinessPhoneNumberId: DEMO_PHONE_NUMBER_ID,
    primaryLineStatus: "ACTIVE",
  };
}
