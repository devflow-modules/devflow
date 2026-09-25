import { NextResponse } from "next/server";

import { parseMigrationImportBody } from "@/lib/persistence-v2/migration/migration-dto";
import {
  migrationErrorResponse,
  readMigrationJsonBody,
  withApplyFlowMigrationAccount,
} from "@/lib/persistence-v2/migration/migration-http";
import { applyFlowMigrationService } from "@/lib/persistence-v2/migration/migration-service";

export async function POST(request: Request) {
  return withApplyFlowMigrationAccount(async (account) => {
    try {
      const body = parseMigrationImportBody(await readMigrationJsonBody(request));
      const result = await applyFlowMigrationService.importBundle(account.id, body);
      if (result.kind === "completed") {
        return NextResponse.json(result.proof, { status: 200 });
      }
      return NextResponse.json(
        {
          error: "migration_conflict",
          ...result.response,
        },
        { status: 409 },
      );
    } catch (error) {
      return migrationErrorResponse(error);
    }
  });
}

export async function GET() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}
