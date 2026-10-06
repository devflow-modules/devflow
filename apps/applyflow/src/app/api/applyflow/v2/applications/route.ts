import { NextResponse } from "next/server";

import { enforceSameOriginMutatingRequest } from "@/lib/http/same-origin-guard";
import { parseCreateApplicationBody } from "@/lib/persistence-v2/applications/application-dto";
import {
  applicationJson,
  readApplicationJsonBody,
  withApplyFlowApplicationsAccount,
} from "@/lib/persistence-v2/applications/application-http";
import { applyFlowApplicationService } from "@/lib/persistence-v2/applications/application-service";

export async function GET(request: Request) {
  return withApplyFlowApplicationsAccount(
    "read",
    async (account) => {
      const applications = await applyFlowApplicationService.list(account.id);
      return NextResponse.json({ applications });
    },
    request,
  );
}

export async function POST(request: Request) {
  const hasBearer = Boolean(request.headers.get("authorization")?.startsWith("Bearer "));
  if (!hasBearer) {
    const originBlock = enforceSameOriginMutatingRequest(request);
    if (originBlock) return originBlock;
  }

  return withApplyFlowApplicationsAccount(
    "write",
    async (account) => {
      const body = parseCreateApplicationBody(await readApplicationJsonBody(request));
      const application = await applyFlowApplicationService.create(account.id, body);
      return applicationJson(application, 201);
    },
    request,
  );
}
