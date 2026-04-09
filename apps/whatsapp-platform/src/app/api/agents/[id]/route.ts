import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthFromRequest } from "@/modules/auth";
import { isTenantManager } from "@/lib/roles";
import { upsertAgentOperationalStatus } from "@/modules/inbox/operationsAgentsService";

export const dynamic = "force-dynamic";

const STATUS_VALUES = ["available", "busy", "offline"] as const;

const patchSchema = z.object({
  status: z.enum(STATUS_VALUES),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id: userId } = await params;
  const isSelf = auth.payload.sub === userId;
  if (!isSelf && !isTenantManager(auth.payload.role)) {
    return NextResponse.json(
      { error: "Apenas pode alterar o seu próprio estado ou ser gestor do tenant" },
      { status: 403 }
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "status inválido (available | busy | offline)" }, { status: 400 });
  }

  const ok = await upsertAgentOperationalStatus(auth.payload.tenantId, userId, parsed.data.status);
  if (!ok) {
    return NextResponse.json({ error: "Utilizador não encontrado neste tenant" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: { userId, status: parsed.data.status } });
}

export async function DELETE(
  _request: NextRequest,
  _context: { params: Promise<{ id: string }> }
) {
  return NextResponse.json(
    { error: "Utilizadores não são removidos por esta rota — use a gestão de equipa / configurações." },
    { status: 405 }
  );
}
