import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS, type UserRole } from "@/modules/auth";
import { listOperationalAgents } from "@/modules/inbox/operationsAgentsService";
import {
  MANAGER_PROVISIONABLE_ROLES,
  provisionTenantMember,
} from "@/modules/inbox/teamProvisioningService";
import { parseRequestJson } from "@/lib/parse-request-json";

export const dynamic = "force-dynamic";

const provisionSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  role: z.enum(MANAGER_PROVISIONABLE_ROLES).default("operator"),
  /** Ignorado de propósito — tenant vem só da sessão. */
  tenantId: z.string().optional(),
});

/**
 * Agentes operacionais = utilizadores do tenant + `whatsapp_agent_status` + métricas Inbox.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;

  try {
    const agents = await listOperationalAgents(auth!.payload.tenantId);
    return NextResponse.json({ success: true, data: { agents } });
  } catch (e) {
    console.error("[api/agents GET]", e);
    return NextResponse.json({ error: "Falha ao listar agentes" }, { status: 500 });
  }
}

/**
 * Manager provisiona operador/manager no próprio tenant (Client 1).
 * Não confiar em tenantId do body.
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;

  const raw = await parseRequestJson(request);
  if (!raw.ok) {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = provisionSchema.safeParse(raw.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_WHATSAPP_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    request.nextUrl.origin;

  try {
    const result = await provisionTenantMember({
      tenantId: auth!.payload.tenantId,
      actorUserId: auth!.payload.sub,
      actorRole: auth!.payload.role as UserRole,
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      appBaseUrl: baseUrl,
    });

    if (!result.ok) {
      const status =
        result.code === "FORBIDDEN_ROLE"
          ? 403
          : result.code === "INVALID_INPUT"
            ? 400
            : 409;
      return NextResponse.json({ error: result.message, code: result.code }, { status });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          user: result.user,
          emailSent: result.emailSent,
          /** Só quando e-mail falhou/não configurado — manager entrega o link (piloto assistido). */
          activationUrl: result.activationUrl,
        },
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("[api/agents POST]", e);
    return NextResponse.json({ error: "Falha ao adicionar membro" }, { status: 500 });
  }
}
