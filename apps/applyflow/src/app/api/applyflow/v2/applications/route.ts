import { NextResponse } from "next/server";

import { enforceSameOriginMutatingRequest } from "@/lib/http/same-origin-guard";
import { parseCreateApplicationBody } from "@/lib/persistence-v2/applications/application-dto";
import {
  applicationJson,
  readApplicationJsonBody,
  withApplyFlowApplicationsAccount,
} from "@/lib/persistence-v2/applications/application-http";
import { applyFlowApplicationService } from "@/lib/persistence-v2/applications/application-service";

export async function GET() {
  return withApplyFlowApplicationsAccount("read", async (account) => {
    const applications = await applyFlowApplicationService.list(account.id);
    return NextResponse.json({ applications });
  });
}

export async function POST(request: Request) {
  const originBlock = enforceSameOriginMutatingRequest(request);
  if (originBlock) return originBlock;

  return withApplyFlowApplicationsAccount("write", async (account) => {
    const body = parseCreateApplicationBody(await readApplicationJsonBody(request));
    const application = await applyFlowApplicationService.create(account.id, body);
    return applicationJson(application, 201);
  });
}
