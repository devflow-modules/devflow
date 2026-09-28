import { NextResponse } from "next/server";

import {
  applyFlowAuthErrorResponse,
  applyFlowV2HttpAccessErrorResponse,
  withApplyFlowV2HttpAccess,
  type ApplyFlowV2HttpCapability,
} from "../http-access";
import type { ApplyFlowAccountRecord } from "../require-applyflow-account";
import { ApplyFlowJobServiceError } from "./job-errors";
import { jobVersionEtag, type JobResponse } from "./job-dto";

export function jobJson(job: JobResponse, status: number): NextResponse {
  return NextResponse.json(job, {
    status,
    headers: { ETag: jobVersionEtag(job.version) },
  });
}

export function jobErrorResponse(error: unknown): NextResponse {
  const access = applyFlowV2HttpAccessErrorResponse(error);
  if (access) return access;
  const auth = applyFlowAuthErrorResponse(error);
  if (auth) return auth;
  if (error instanceof ApplyFlowJobServiceError) {
    switch (error.code) {
      case "invalid_payload":
        return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
      case "invalid_expected_version":
        return NextResponse.json({ error: "invalid_expected_version" }, { status: 400 });
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
  capability: Extract<ApplyFlowV2HttpCapability, "read" | "write">,
  action: (account: ApplyFlowAccountRecord) => Promise<NextResponse>,
): Promise<NextResponse> {
  return withApplyFlowV2HttpAccess(capability, async (account) => action(account), jobErrorResponse);
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
