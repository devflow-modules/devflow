import type { NextRequest } from "next/server";
import { runSuggestDealPost } from "@/modules/inbox/threadDealSuggestHttp";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return runSuggestDealPost(request, id);
}
