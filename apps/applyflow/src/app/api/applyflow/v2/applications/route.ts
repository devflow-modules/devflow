import { NextResponse } from "next/server";

import { parseCreateApplicationBody } from "@/lib/persistence-v2/applications/application-dto";
import {
  applicationJson,
  readApplicationJsonBody,
  withApplyFlowApplicationsAccount,
} from "@/lib/persistence-v2/applications/application-http";
import { applyFlowApplicationService } from "@/lib/persistence-v2/applications/application-service";

export async function GET() {
  return withApplyFlowApplicationsAccount(async (account) => {
    const applications = await applyFlowApplicationService.list(account.id);
    return NextResponse.json({ applications });
  });
}

export async function POST(request: Request) {
  return withApplyFlowApplicationsAccount(async (account) => {
    const body = parseCreateApplicationBody(await readApplicationJsonBody(request));
    const application = await applyFlowApplicationService.create(account.id, body);
    return applicationJson(application, 201);
  });
}
