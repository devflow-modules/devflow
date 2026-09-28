import { NextResponse } from "next/server";

import {
  applyFlowAuthErrorResponse,
  applyFlowV2HttpAccessErrorResponse,
  withApplyFlowV2HttpAccess,
  type ApplyFlowV2HttpCapability,
} from "../http-access";
import type { ApplyFlowAccountRecord } from "../require-applyflow-account";
import { ApplyFlowMigrationServiceError } from "./migration-errors";

export function migrationErrorResponse(error: unknown): NextResponse {
  const access = applyFlowV2HttpAccessErrorResponse(error);
  if (access) return access;
  const auth = applyFlowAuthErrorResponse(error);
  if (auth) return auth;
  if (error instanceof ApplyFlowMigrationServiceError) {
    switch (error.code) {
      case "invalid_migration_payload":
        return NextResponse.json(
          {
            error: "invalid_migration_payload",
            ...(error.conflicts ? { conflicts: error.conflicts } : {}),
          },
          { status: 400 },
        );
      case "payload_too_large":
        return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
      case "migration_fingerprint_mismatch":
        return NextResponse.json({ error: "migration_fingerprint_mismatch" }, { status: 400 });
      case "migration_conflict":
        return NextResponse.json(
          {
            error: "migration_conflict",
            ...(error.conflicts ? { conflicts: error.conflicts } : {}),
          },
          { status: 409 },
        );
      case "migration_session_not_found":
        return NextResponse.json({ error: "migration_session_not_found" }, { status: 404 });
      case "migration_session_failed":
        return NextResponse.json(
          {
            error: "migration_session_failed",
            ...(error.conflicts ? { conflicts: error.conflicts } : {}),
          },
          { status: 409 },
        );
      default:
        return NextResponse.json({ error: "internal_error" }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}

export async function withApplyFlowMigrationAccount(
  capability: Extract<ApplyFlowV2HttpCapability, "migration" | "migration_session_read">,
  action: (account: ApplyFlowAccountRecord) => Promise<NextResponse>,
): Promise<NextResponse> {
  return withApplyFlowV2HttpAccess(
    capability,
    async (account) => action(account),
    migrationErrorResponse,
  );
}

export async function readMigrationJsonBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (!text.trim()) {
    throw new ApplyFlowMigrationServiceError("invalid_migration_payload");
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApplyFlowMigrationServiceError("invalid_migration_payload");
  }
}
