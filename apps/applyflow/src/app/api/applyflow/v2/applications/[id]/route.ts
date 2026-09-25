import { parseApplicationIfMatch, parsePatchApplicationBody } from "@/lib/persistence-v2/applications/application-dto";
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
  return withApplyFlowApplicationsAccount(async (account) => {
    const { id } = await context.params;
    const application = await applyFlowApplicationService.get(account.id, id);
    return applicationJson(application, 200);
  });
}

export async function PATCH(request: Request, context: ApplicationRouteContext) {
  return withApplyFlowApplicationsAccount(async (account) => {
    const { id } = await context.params;
    const expectedVersion = parseApplicationIfMatch(request.headers.get("if-match"));
    const body = parsePatchApplicationBody(await readApplicationJsonBody(request));
    const application = await applyFlowApplicationService.patch(account.id, id, expectedVersion, body);
    return applicationJson(application, 200);
  });
}
