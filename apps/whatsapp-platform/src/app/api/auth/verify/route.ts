import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  const { payload } = auth;
  return NextResponse.json({
    valid: true,
    user: {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      tenantId: payload.tenantId,
    },
  });
}
