import { NextResponse } from "next/server";

import { isApplyFlowPersistenceV2Enabled } from "../feature-flag";
import {
  ApplyFlowAuthError,
  ApplyFlowPersistenceDisabledError,
  requireApplyFlowAccount,
  type ApplyFlowAccountRecord,
} from "../require-applyflow-account";
import { ApplyFlowMigrationServiceError } from "./migration-errors";

export function migrationErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApplyFlowPersistenceDisabledError) {
    return NextResponse.json({ error: "persistence_v2_disabled" }, { status: 404 });
  }
  if (error instanceof ApplyFlowAuthError) {
    if (error.code === "auth_not_configured") {
      return NextResponse.json({ error: "auth_not_configured" }, { status: 503 });
    }
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
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
  action: (account: ApplyFlowAccountRecord) => Promise<NextResponse>,
): Promise<NextResponse> {
  if (!isApplyFlowPersistenceV2Enabled()) {
    return NextResponse.json({ error: "persistence_v2_disabled" }, { status: 404 });
  }
  try {
    const account = await requireApplyFlowAccount();
    return await action(account);
  } catch (error) {
    return migrationErrorResponse(error);
  }
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
