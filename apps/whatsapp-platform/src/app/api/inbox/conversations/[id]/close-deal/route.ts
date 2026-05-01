import type { NextRequest } from "next/server";
import { runCloseDealPost } from "@/modules/inbox/threadDealCloseHttp";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return runCloseDealPost(request, id);
}
