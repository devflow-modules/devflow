import { NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { getBillingStatus } from "@/modules/billing";

export async function GET(request: Request) {
  const auth = await getAuthFromRequest(request as import("next/server").NextRequest);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = await getBillingStatus(auth.payload.sub);
  if (!status) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json(status);
}
