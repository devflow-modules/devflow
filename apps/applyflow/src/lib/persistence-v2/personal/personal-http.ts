import { NextResponse } from "next/server";

import { enforceSameOriginMutatingRequest } from "@/lib/http/same-origin-guard";
import {
  applyFlowAuthErrorResponse,
  applyFlowV2HttpAccessErrorResponse,
  withApplyFlowV2HttpAccess,
  type ApplyFlowV2HttpCapability,
} from "@/lib/persistence-v2/http-access";
import type { ApplyFlowAccountRecord } from "@/lib/persistence-v2/require-applyflow-account";

import { PersonalServiceError } from "./services";

export function personalErrorResponse(error: unknown): NextResponse {
  const access = applyFlowV2HttpAccessErrorResponse(error);
  if (access) return access;
  const auth = applyFlowAuthErrorResponse(error);
  if (auth) return auth;
  if (error instanceof PersonalServiceError) {
    switch (error.code) {
      case "invalid_payload":
      case "import_not_confirmed":
        return NextResponse.json({ error: error.code }, { status: 400 });
      case "not_found":
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      case "version_conflict":
      case "duplicate":
      case "import_conflict":
        return NextResponse.json({ error: error.code }, { status: 409 });
      default:
        return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }
  }
  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}

export async function withPersonalAccount(
  request: Request,
  capability: ApplyFlowV2HttpCapability,
  action: (account: ApplyFlowAccountRecord) => Promise<NextResponse>,
): Promise<NextResponse> {
  const hasBearer = Boolean(request.headers.get("authorization")?.startsWith("Bearer "));
  if ((capability === "write" || capability === "migration") && !hasBearer) {
    const originBlock = enforceSameOriginMutatingRequest(request);
    if (originBlock) return originBlock;
  }
  return withApplyFlowV2HttpAccess(
    capability,
    (account) => action(account),
    personalErrorResponse,
    request,
  );
}
