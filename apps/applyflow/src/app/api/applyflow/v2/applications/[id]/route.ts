import { enforceSameOriginMutatingRequest } from "@/lib/http/same-origin-guard";
import { parseApplicationPatchRequest } from "@/lib/persistence-v2/applications/application-dto";
import {
  applicationJson,
  readApplicationJsonBody,
  withApplyFlowApplicationsAccount,
} from "@/lib/persistence-v2/applications/application-http";
import { applyFlowApplicationService } from "@/lib/persistence-v2/applications/application-service";

type ApplicationRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: ApplicationRouteContext) {
  return withApplyFlowApplicationsAccount("read", async (account) => {
    const { id } = await context.params;
    const application = await applyFlowApplicationService.get(account.id, id);
    return applicationJson(application, 200);
  });
}

export async function PATCH(request: Request, context: ApplicationRouteContext) {
  const originBlock = enforceSameOriginMutatingRequest(request);
  if (originBlock) return originBlock;

  return withApplyFlowApplicationsAccount("write", async (account) => {
    const { id } = await context.params;
    // Concurrency token is body.expectedVersion — never HTTP If-Match (Vercel 412 risk).
    const { expectedVersion, patch } = parseApplicationPatchRequest(await readApplicationJsonBody(request));
    const application = await applyFlowApplicationService.patch(account.id, id, expectedVersion, patch);
    return applicationJson(application, 200);
  });
}
