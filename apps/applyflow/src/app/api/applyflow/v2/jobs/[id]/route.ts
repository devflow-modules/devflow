import { parseJobPatchRequest } from "@/lib/persistence-v2/jobs/job-dto";
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
  return withApplyFlowJobsAccount("read", async (account) => {
    const job = await applyFlowJobService.get(account.id, await jobId(context));
    return jobJson(job, 200);
  });
}

export async function PATCH(request: Request, context: JobRouteContext) {
  return withApplyFlowJobsAccount("write", async (account) => {
    // Concurrency token is body.expectedVersion — never HTTP If-Match (Vercel 412 risk).
    const { expectedVersion, patch } = parseJobPatchRequest(await readJsonBody(request));
    const job = await applyFlowJobService.patch(account.id, await jobId(context), expectedVersion, patch);
    return jobJson(job, 200);
  });
}
