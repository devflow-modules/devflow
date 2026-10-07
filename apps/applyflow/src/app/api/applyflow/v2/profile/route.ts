import { NextResponse } from "next/server";

import { applyFlowPersonalStore } from "@/lib/persistence-v2/personal/prisma-store";
import { withPersonalAccount, personalErrorResponse } from "@/lib/persistence-v2/personal/personal-http";
import { createPersonalProfileService } from "@/lib/persistence-v2/personal/services";

const profiles = createPersonalProfileService(applyFlowPersonalStore);

export async function GET(request: Request) {
  return withPersonalAccount(request, "read", async (account) => {
    const profile = await profiles.read(account.id);
    return NextResponse.json({ profile });
  });
}

export async function PUT(request: Request) {
  return withPersonalAccount(request, "write", async (account) => {
    try {
      const body = (await request.json()) as { library?: unknown; expectedVersion?: number };
      const saved = await profiles.save(account.id, body.library, body.expectedVersion);
      return NextResponse.json(saved);
    } catch (error) {
      return personalErrorResponse(error);
    }
  });
}
