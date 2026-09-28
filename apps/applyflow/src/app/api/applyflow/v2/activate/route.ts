import { NextResponse } from "next/server";

import {
  applyFlowAuthErrorResponse,
  applyFlowV2HttpAccessErrorResponse,
  withApplyFlowV2HttpAccess,
} from "@/lib/persistence-v2/http-access";
import {
  ApplyFlowEmptyActivationError,
  parseEmptyActivationBody,
} from "@/lib/persistence-v2/activation/empty-activation-dto";
import { applyFlowEmptyActivationService } from "@/lib/persistence-v2/activation/empty-activation-service";
import { readMigrationJsonBody } from "@/lib/persistence-v2/migration/migration-http";

function activationErrorResponse(error: unknown): NextResponse {
  const access = applyFlowV2HttpAccessErrorResponse(error);
  if (access) return access;
  const auth = applyFlowAuthErrorResponse(error);
  if (auth) return auth;
  if (error instanceof ApplyFlowEmptyActivationError) {
    switch (error.code) {
      case "invalid_activation_payload":
      case "persistence_v2_activation_fingerprint_mismatch":
        return NextResponse.json({ error: error.code }, { status: 400 });
      case "persistence_v2_activation_not_eligible":
        return NextResponse.json({ error: error.code }, { status: 403 });
      case "persistence_v2_activation_not_empty":
      case "persistence_v2_activation_conflict":
        return NextResponse.json({ error: error.code }, { status: 409 });
      case "persistence_v2_activation_paused":
        return NextResponse.json({ error: error.code }, { status: 503 });
      default: {
        const _exhaustive: never = error.code;
        void _exhaustive;
        return NextResponse.json({ error: "internal_error" }, { status: 500 });
      }
    }
  }
  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}

/**
 * Explicit empty-V1 → v2_cloud activation.
 * Does NOT accept client canonicalPersistence. Does NOT activate via normal CRUD.
 */
export async function POST(request: Request) {
  return withApplyFlowV2HttpAccess(
    "activation",
    async (account) => {
      try {
        const body = parseEmptyActivationBody(await readMigrationJsonBody(request));
        // Ignore any forged accountId if a client ever sends one — identity is `account`.
        const proof = await applyFlowEmptyActivationService.activate(account, body);
        return NextResponse.json(proof, { status: 200 });
      } catch (error) {
        return activationErrorResponse(error);
      }
    },
    activationErrorResponse,
  );
}

export async function GET() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}

export async function PATCH() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}
