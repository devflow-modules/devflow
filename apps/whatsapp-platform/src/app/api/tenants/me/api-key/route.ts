import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getAuthFromRequest } from "@/modules/auth";
import { prisma } from "@/lib/prisma";
import { canAccessDeveloperSettings } from "@/lib/permissions";
import { requireFeatureOr403 } from "@/modules/billing/featureGate";

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autorizado", code: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!canAccessDeveloperSettings(auth.payload.role)) {
    return NextResponse.json(
      { success: false, error: "Acesso negado", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const blocked = await requireFeatureOr403(auth.payload.tenantId, "WEBHOOKS_API", auth.payload);
  if (blocked) return blocked;

  const apiKey = `wa_${randomBytes(32).toString("hex")}`;

  await prisma.tenant.update({
    where: { id: auth.payload.tenantId },
    data: { apiKey },
  });

  return NextResponse.json({ apiKey });
}
