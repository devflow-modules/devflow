import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getAuthFromRequest } from "@/modules/auth";
import { prisma } from "@/lib/prisma";
import { permissionsMessages } from "@/lib/permissionsMessages";
import { isTenantManager } from "@/lib/roles";

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  if (!isTenantManager(auth.payload.role)) {
    return NextResponse.json(
      { error: permissionsMessages.adminOnly, code: "FORBIDDEN_ROLE" },
      { status: 403 }
    );
  }

  const apiKey = `wa_${randomBytes(32).toString("hex")}`;

  await prisma.tenant.update({
    where: { id: auth.payload.tenantId },
    data: { apiKey },
  });

  return NextResponse.json({ apiKey });
}
