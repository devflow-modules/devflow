import { NextResponse } from "next/server";
import { z } from "zod";

import { coerceImportedApplicationStatus } from "@devflow/applyflow-core";

import { enforceSameOriginMutatingRequest } from "@/lib/http/same-origin-guard";
import {
  applicationVersionEtag,
} from "@/lib/persistence-v2/applications/application-dto";
import {
  readApplicationJsonBody,
  withApplyFlowApplicationsAccount,
} from "@/lib/persistence-v2/applications/application-http";
import { ApplyFlowApplicationServiceError } from "@/lib/persistence-v2/applications/application-errors";
import { applyFlowApplicationService } from "@/lib/persistence-v2/applications/application-service";

type ApplicationRouteContext = {
  params: Promise<{ id: string }>;
};

const lifecycleBodySchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    status: z.string().trim().min(1),
    notes: z.string().trim().max(4000).nullable().optional(),
  })
  .strict();

function parseLifecycleBody(raw: unknown): {
  expectedVersion: number;
  status: NonNullable<ReturnType<typeof coerceImportedApplicationStatus>>;
  notes?: string | null;
} {
  const parsed = lifecycleBodySchema.safeParse(raw);
  if (!parsed.success) {
    throw new ApplyFlowApplicationServiceError("invalid_payload");
  }
  const status = coerceImportedApplicationStatus(parsed.data.status);
  if (!status) {
    throw new ApplyFlowApplicationServiceError("invalid_payload");
  }
  return {
    expectedVersion: parsed.data.expectedVersion,
    status,
    ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
  };
}

/**
 * Atomic Application ↔ linked Job lifecycle transition (same Postgres transaction).
 */
export async function POST(request: Request, context: ApplicationRouteContext) {
  const originBlock = enforceSameOriginMutatingRequest(request);
  if (originBlock) return originBlock;

  return withApplyFlowApplicationsAccount("write", async (account) => {
    const { id } = await context.params;
    const body = parseLifecycleBody(await readApplicationJsonBody(request));
    const result = await applyFlowApplicationService.transitionLifecycle(
      account.id,
      id,
      body.expectedVersion,
      { status: body.status, notes: body.notes },
    );

    return NextResponse.json(
      {
        application: result.application,
        job: result.job,
        jobSynced: result.jobSynced,
      },
      {
        status: 200,
        headers: { ETag: applicationVersionEtag(result.application.version) },
      },
    );
  });
}
