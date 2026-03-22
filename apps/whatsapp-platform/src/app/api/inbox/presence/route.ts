import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { getOnline } from "@/modules/presence";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const tenantId = auth.payload.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = getOnline(tenantId);
  return NextResponse.json({
    success: true,
    data: { users: users.map((u) => ({ userId: u.userId, name: u.name, email: u.email })) },
  });
}
