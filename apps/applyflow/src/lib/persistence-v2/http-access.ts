import { NextResponse } from "next/server";

import {
  resolveApplyFlowPersistenceAccess,
  type ApplyFlowPersistenceAccess,
} from "./resolve-persistence-access";
import {
  ApplyFlowAuthError,
  requireApplyFlowAccount,
  type ApplyFlowAccountRecord,
} from "./require-applyflow-account";

/**
 * HTTP capability enforced after account + resolver.
 * Offering writes/normal CRUD are DENY (fail-closed): server cannot trust
 * a client claim that localStorage is empty; first-write canonicalization
 * belongs to a later slice.
 */
export type ApplyFlowV2HttpCapability =
  | "read"
  | "write"
  | "migration"
  | "migration_session_read"
  | "activation";

export type ApplyFlowV2HttpAccessErrorCode =
  | "persistence_v2_disabled"
  | "persistence_v2_not_eligible"
  | "persistence_v2_read_only"
  | "persistence_v2_paused"
  | "persistence_v2_migration_required"
  | "persistence_v2_migration_not_applicable"
  | "persistence_v2_activation_not_eligible";

export class ApplyFlowV2HttpAccessError extends Error {
  readonly code: ApplyFlowV2HttpAccessErrorCode;
  readonly status: number;
  readonly access: ApplyFlowPersistenceAccess;

  constructor(
    code: ApplyFlowV2HttpAccessErrorCode,
    status: number,
    access: ApplyFlowPersistenceAccess,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "ApplyFlowV2HttpAccessError";
    this.code = code;
    this.status = status;
    this.access = access;
  }
}

function deny(
  code: ApplyFlowV2HttpAccessErrorCode,
  status: number,
  access: ApplyFlowPersistenceAccess,
): never {
  throw new ApplyFlowV2HttpAccessError(code, status, access);
}

/**
 * Maps resolver mode → HTTP capability. Single source of truth for V2 routes.
 *
 * MODE             READ     WRITE                MIGRATION   SESSION_GET   ACTIVATION
 * v1               DENY     DENY                 DENY        DENY          DENY
 * v2_offering      DENY*    DENY (migration req) ALLOW       ALLOW         ALLOW
 * v2_active        ALLOW    ALLOW                DENY        ALLOW         ALLOW (idempotent)
 * v2_read_only     ALLOW    DENY                 DENY        ALLOW         DENY
 * v2_paused        DENY     DENY                 DENY        DENY          DENY
 *
 * *AF-REL-003: offering product Jobs/Applications GET uses capability "read" and is DENY
 * (`persistence_v2_migration_required`). Physical noncanonical staging may still exist;
 * migration/session/activation remain the supported surfaces until canonical promotion.
 */
export function assertApplyFlowV2HttpCapability(
  access: ApplyFlowPersistenceAccess,
  capability: ApplyFlowV2HttpCapability,
): void {
  switch (access.mode) {
    case "v1":
      if (access.reason === "global_disabled") {
        deny("persistence_v2_disabled", 404, access);
      }
      deny("persistence_v2_not_eligible", 403, access);

    case "v2_paused":
      deny("persistence_v2_paused", 503, access);

    case "v2_read_only":
      if (capability === "read" || capability === "migration_session_read") return;
      if (capability === "write") deny("persistence_v2_read_only", 403, access);
      if (capability === "activation") deny("persistence_v2_activation_not_eligible", 403, access);
      deny("persistence_v2_migration_not_applicable", 403, access);

    case "v2_active":
      if (
        capability === "read" ||
        capability === "write" ||
        capability === "migration_session_read" ||
        capability === "activation"
      ) {
        return;
      }
      deny("persistence_v2_migration_not_applicable", 403, access);

    case "v2_offering":
      if (
        capability === "migration" ||
        capability === "migration_session_read" ||
        capability === "activation"
      ) {
        return;
      }
      // product read + write: fail-closed until canonical promotion (AF-REL-003)
      deny("persistence_v2_migration_required", 403, access);

    default: {
      const _exhaustive: never = access;
      void _exhaustive;
      deny("persistence_v2_disabled", 404, access);
    }
  }
}

export function assertApplyFlowV2ReadAccess(access: ApplyFlowPersistenceAccess): void {
  assertApplyFlowV2HttpCapability(access, "read");
}

export function assertApplyFlowV2WriteAccess(access: ApplyFlowPersistenceAccess): void {
  assertApplyFlowV2HttpCapability(access, "write");
}

export function assertApplyFlowV2MigrationAccess(access: ApplyFlowPersistenceAccess): void {
  assertApplyFlowV2HttpCapability(access, "migration");
}

export function assertApplyFlowV2MigrationSessionReadAccess(
  access: ApplyFlowPersistenceAccess,
): void {
  assertApplyFlowV2HttpCapability(access, "migration_session_read");
}

export function applyFlowV2HttpAccessErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof ApplyFlowV2HttpAccessError) {
    return NextResponse.json({ error: error.code }, { status: error.status });
  }
  return null;
}

export function applyFlowAuthErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof ApplyFlowAuthError) {
    if (error.code === "auth_not_configured") {
      return NextResponse.json({ error: "auth_not_configured" }, { status: 503 });
    }
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  return null;
}

/**
 * Authenticate → load account → resolve mode → enforce capability → run action.
 * Account identity always comes from the Supabase session, never from the request.
 */
export async function withApplyFlowV2HttpAccess(
  capability: ApplyFlowV2HttpCapability,
  action: (
    account: ApplyFlowAccountRecord,
    access: ApplyFlowPersistenceAccess,
  ) => Promise<NextResponse>,
  mapError: (error: unknown) => NextResponse,
): Promise<NextResponse> {
  try {
    const account = await requireApplyFlowAccount();
    const access = resolveApplyFlowPersistenceAccess(account);
    assertApplyFlowV2HttpCapability(access, capability);
    return await action(account, access);
  } catch (error) {
    const accessResponse = applyFlowV2HttpAccessErrorResponse(error);
    if (accessResponse) return accessResponse;
    const authResponse = applyFlowAuthErrorResponse(error);
    if (authResponse) return authResponse;
    return mapError(error);
  }
}
