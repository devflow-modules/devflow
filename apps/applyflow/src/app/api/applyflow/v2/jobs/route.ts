import { NextResponse } from "next/server";

import { parseCreateJobBody } from "@/lib/persistence-v2/jobs/job-dto";
import { jobJson, readJsonBody, withApplyFlowJobsAccount } from "@/lib/persistence-v2/jobs/job-http";
import { applyFlowJobService } from "@/lib/persistence-v2/jobs/job-service";

export async function GET() {
  return withApplyFlowJobsAccount(async (account) => {
    const jobs = await applyFlowJobService.list(account.id);
    return NextResponse.json({ jobs });
  });
}

export async function POST(request: Request) {
  return withApplyFlowJobsAccount(async (account) => {
    const body = parseCreateJobBody(await readJsonBody(request));
    const job = await applyFlowJobService.create(account.id, body);
    return jobJson(job, 201);
  });
}
