import { NextResponse } from "next/server";

import { applyFlowPersonalStore } from "@/lib/persistence-v2/personal/prisma-store";
import { withPersonalAccount } from "@/lib/persistence-v2/personal/personal-http";
import { createPersonalAnalyticsService } from "@/lib/persistence-v2/personal/services";

const analytics = createPersonalAnalyticsService(applyFlowPersonalStore);

export async function GET(request: Request) {
  return withPersonalAccount(request, "read", async (account) => {
    return NextResponse.json(await analytics.read(account.id));
  });
}
