import { NextResponse } from "next/server";

import { applyFlowPersonalStore } from "@/lib/persistence-v2/personal/prisma-store";
import { personalErrorResponse, withPersonalAccount } from "@/lib/persistence-v2/personal/personal-http";
import { createPersonalResponsesService } from "@/lib/persistence-v2/personal/services";

const responses = createPersonalResponsesService(applyFlowPersonalStore);

export async function GET(request: Request) {
  return withPersonalAccount(request, "read", async (account) => {
    return NextResponse.json({ responses: await responses.list(account.id) });
  });
}

export async function PUT(request: Request) {
  return withPersonalAccount(request, "write", async (account) => {
    try {
      const body = (await request.json()) as { detection?: unknown; expectedVersion?: number };
      const saved = await responses.save(account.id, body.detection, body.expectedVersion);
      return NextResponse.json(saved);
    } catch (error) {
      return personalErrorResponse(error);
    }
  });
}

export async function POST(request: Request) {
  return withPersonalAccount(request, "write", async (account) => {
    try {
      const body = (await request.json()) as {
        detections?: unknown[];
        versions?: Record<string, number>;
      };
      if (!Array.isArray(body.detections)) {
        return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
      }
      const saved = [];
      for (const detection of body.detections) {
        const parsed = detection as { id?: string };
        const expectedVersion =
          parsed.id && body.versions ? body.versions[parsed.id] : undefined;
        saved.push(await responses.save(account.id, detection, expectedVersion));
      }
      return NextResponse.json({ responses: saved });
    } catch (error) {
      return personalErrorResponse(error);
    }
  });
}
