import { NextResponse } from "next/server";

import { enforceSameOriginMutatingRequest } from "@/lib/http/same-origin-guard";
import { parseCreateJobBody } from "@/lib/persistence-v2/jobs/job-dto";
import { jobJson, readJsonBody, withApplyFlowJobsAccount } from "@/lib/persistence-v2/jobs/job-http";
import { applyFlowJobService } from "@/lib/persistence-v2/jobs/job-service";

export async function GET() {
  return withApplyFlowJobsAccount("read", async (account) => {
    const jobs = await applyFlowJobService.list(account.id);
    return NextResponse.json({ jobs });
  });
}

export async function POST(request: Request) {
  const originBlock = enforceSameOriginMutatingRequest(request);
  if (originBlock) return originBlock;

  return withApplyFlowJobsAccount("write", async (account) => {
    const body = parseCreateJobBody(await readJsonBody(request));
    const job = await applyFlowJobService.create(account.id, body);
    return jobJson(job, 201);
  });
}
