import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getAuthFromRequest, requireRole } from "@/modules/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ["admin"], request);
  if (denied) return denied;
  if (!auth) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const apiKey = `wa_${randomBytes(32).toString("hex")}`;

  await prisma.tenant.update({
    where: { id: auth.payload.tenantId },
    data: { apiKey },
  });

  return NextResponse.json({ apiKey });
}
