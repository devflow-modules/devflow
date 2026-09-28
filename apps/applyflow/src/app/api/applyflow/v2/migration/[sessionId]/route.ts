import { NextResponse } from "next/server";

import {
  migrationErrorResponse,
  withApplyFlowMigrationAccount,
} from "@/lib/persistence-v2/migration/migration-http";
import { applyFlowMigrationService } from "@/lib/persistence-v2/migration/migration-service";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

/**
 * Own-account migration session recovery/proof read.
 * Allowed in offering / active / read_only; denied in v1 and paused.
 * Ownership is enforced by the service via account.id from the session.
 */
export async function GET(_request: Request, context: RouteContext) {
  return withApplyFlowMigrationAccount("migration_session_read", async (account) => {
    try {
      const { sessionId } = await context.params;
      if (!sessionId || typeof sessionId !== "string" || sessionId.trim().length === 0) {
        return NextResponse.json({ error: "migration_session_not_found" }, { status: 404 });
      }
      const session = await applyFlowMigrationService.getSession(account.id, sessionId.trim());
      return NextResponse.json(session, { status: 200 });
    } catch (error) {
      return migrationErrorResponse(error);
    }
  });
}

export async function POST() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}
