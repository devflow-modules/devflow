import { NextResponse } from "next/server";

import { isApplyFlowPersistenceV2Enabled } from "../feature-flag";
import {
  ApplyFlowAuthError,
  ApplyFlowPersistenceDisabledError,
  requireApplyFlowAccount,
  type ApplyFlowAccountRecord,
} from "../require-applyflow-account";
import { ApplyFlowJobServiceError } from "./job-errors";
import { jobVersionEtag, type JobResponse } from "./job-dto";

export function jobJson(job: JobResponse, status: number): NextResponse {
  return NextResponse.json(job, {
    status,
    headers: { ETag: jobVersionEtag(job.version) },
  });
}

export function jobErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApplyFlowPersistenceDisabledError) {
    return NextResponse.json({ error: "persistence_v2_disabled" }, { status: 404 });
  }
  if (error instanceof ApplyFlowAuthError) {
    if (error.code === "auth_not_configured") {
      return NextResponse.json({ error: "auth_not_configured" }, { status: 503 });
    }
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (error instanceof ApplyFlowJobServiceError) {
    switch (error.code) {
      case "invalid_payload":
        return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
      case "invalid_if_match":
        return NextResponse.json({ error: "invalid_if_match" }, { status: 400 });
      case "empty_patch":
        return NextResponse.json({ error: "empty_patch" }, { status: 400 });
      case "not_found":
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      case "job_already_exists":
        return NextResponse.json({ error: "job_already_exists" }, { status: 409 });
      case "version_conflict":
        return NextResponse.json({ error: "version_conflict" }, { status: 409 });
      default:
        return NextResponse.json({ error: "internal_error" }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}

export async function withApplyFlowJobsAccount(
  action: (account: ApplyFlowAccountRecord) => Promise<NextResponse>,
): Promise<NextResponse> {
  if (!isApplyFlowPersistenceV2Enabled()) {
    return NextResponse.json({ error: "persistence_v2_disabled" }, { status: 404 });
  }
  try {
    const account = await requireApplyFlowAccount();
    return await action(account);
  } catch (error) {
    return jobErrorResponse(error);
  }
}

export async function readJsonBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (!text.trim()) {
    throw new ApplyFlowJobServiceError("invalid_payload");
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApplyFlowJobServiceError("invalid_payload");
  }
}
