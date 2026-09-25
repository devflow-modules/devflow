import { parseJobIfMatch, parsePatchJobBody } from "@/lib/persistence-v2/jobs/job-dto";
import { jobJson, readJsonBody, withApplyFlowJobsAccount } from "@/lib/persistence-v2/jobs/job-http";
import { applyFlowJobService } from "@/lib/persistence-v2/jobs/job-service";

type JobRouteContext = {
  params: Promise<{ id: string }>;
};

async function jobId(context: JobRouteContext): Promise<string> {
  const { id } = await context.params;
  return id;
}

export async function GET(_request: Request, context: JobRouteContext) {
  return withApplyFlowJobsAccount(async (account) => {
    const job = await applyFlowJobService.get(account.id, await jobId(context));
    return jobJson(job, 200);
  });
}

export async function PATCH(request: Request, context: JobRouteContext) {
  return withApplyFlowJobsAccount(async (account) => {
    const expectedVersion = parseJobIfMatch(request.headers.get("if-match"));
    const body = parsePatchJobBody(await readJsonBody(request));
    const job = await applyFlowJobService.patch(account.id, await jobId(context), expectedVersion, body);
    return jobJson(job, 200);
  });
}
