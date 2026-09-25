import { NextResponse } from "next/server";

import { isApplyFlowPersistenceV2Enabled } from "../feature-flag";
import {
  ApplyFlowAuthError,
  ApplyFlowPersistenceDisabledError,
  requireApplyFlowAccount,
  type ApplyFlowAccountRecord,
} from "../require-applyflow-account";
import { applicationVersionEtag, type ApplicationResponse } from "./application-dto";
import { ApplyFlowApplicationServiceError } from "./application-errors";

export function applicationJson(application: ApplicationResponse, status: number): NextResponse {
  return NextResponse.json(application, {
    status,
    headers: { ETag: applicationVersionEtag(application.version) },
  });
}

export function applicationErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApplyFlowPersistenceDisabledError) {
    return NextResponse.json({ error: "persistence_v2_disabled" }, { status: 404 });
  }
  if (error instanceof ApplyFlowAuthError) {
    if (error.code === "auth_not_configured") {
      return NextResponse.json({ error: "auth_not_configured" }, { status: 503 });
    }
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (error instanceof ApplyFlowApplicationServiceError) {
    switch (error.code) {
      case "invalid_payload":
        return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
      case "invalid_if_match":
        return NextResponse.json({ error: "invalid_if_match" }, { status: 400 });
      case "invalid_status_transition":
        return NextResponse.json({ error: "invalid_status_transition" }, { status: 400 });
      case "empty_patch":
        return NextResponse.json({ error: "empty_patch" }, { status: 400 });
      case "not_found":
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      case "source_job_not_found":
        return NextResponse.json({ error: "source_job_not_found" }, { status: 404 });
      case "application_already_exists":
        return NextResponse.json({ error: "application_already_exists" }, { status: 409 });
      case "application_already_exists_for_job":
        return NextResponse.json({ error: "application_already_exists_for_job" }, { status: 409 });
      case "version_conflict":
        return NextResponse.json({ error: "version_conflict" }, { status: 409 });
      default:
        return NextResponse.json({ error: "internal_error" }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}

export async function withApplyFlowApplicationsAccount(
  action: (account: ApplyFlowAccountRecord) => Promise<NextResponse>,
): Promise<NextResponse> {
  if (!isApplyFlowPersistenceV2Enabled()) {
    return NextResponse.json({ error: "persistence_v2_disabled" }, { status: 404 });
  }
  try {
    const account = await requireApplyFlowAccount();
    return await action(account);
  } catch (error) {
    return applicationErrorResponse(error);
  }
}

export async function readApplicationJsonBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (!text.trim()) throw new ApplyFlowApplicationServiceError("invalid_payload");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApplyFlowApplicationServiceError("invalid_payload");
  }
}
