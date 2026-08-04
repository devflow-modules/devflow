import { NextRequest, NextResponse } from "next/server";
import {
  getAuthFromRequest,
  requireRole,
  ROLES_MANAGER_PLUS,
} from "@/modules/auth";
import { runTimeElapsedRulesBatch } from "@/modules/automation/timeElapsedRunner";
import { recordPlatformAudit } from "@/lib/platformAuditLog";
import { getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET ?? process.env.BILLING_CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  return bearer === secret;
}

type RunRulesBody = {
  tenantId?: string;
  threadLimit?: number;
};

async function parseBody(request: NextRequest): Promise<RunRulesBody> {
  try {
    const json = (await request.json()) as unknown;
    if (!json || typeof json !== "object" || Array.isArray(json)) return {};
    const o = json as Record<string, unknown>;
    const tenantId =
      typeof o.tenantId === "string" && o.tenantId.trim() ? o.tenantId.trim() : undefined;
    const threadLimit =
      typeof o.threadLimit === "number" && Number.isFinite(o.threadLimit)
        ? o.threadLimit
        : undefined;
    return { tenantId, threadLimit };
  } catch {
    return {};
  }
}

/**
 * Executa regras `TIME_ELAPSED` em lote.
 *
 * Auth:
 * - `Bearer CRON_SECRET` (ou `BILLING_CRON_SECRET`): lote global ou `tenantId` explícito no body (ops).
 * - Sessão `manager` | `platform_admin`: **sempre** o `tenantId` da sessão; `body.tenantId` alienígena → 403.
 *
 * Operator e roles inválidas: rejeitados. Sem sessão e sem cron: 401.
 */
export async function POST(request: NextRequest) {
  const cronOk = authorizeCron(request);
  const body = await parseBody(request);
  const ip = getClientIp(request);

  if (cronOk) {
    try {
      const data = await runTimeElapsedRulesBatch({
        tenantId: body.tenantId,
        threadLimit: body.threadLimit,
      });
      recordPlatformAudit({
        action: "automation.run_rules",
        tenantId: body.tenantId ?? null,
        userId: null,
        resourceType: "automation_time_elapsed",
        ip,
        metadata: {
          via: "cron",
          scope: body.tenantId ? "single_tenant" : "all_tenants",
          tenants: data.tenants,
          threadsScanned: data.threadsScanned,
          rulesWithSuccess: data.rulesWithSuccess,
          result: "ok",
        },
      });
      return NextResponse.json({ success: true, data });
    } catch (e) {
      console.error("[automation/run-rules]", e);
      recordPlatformAudit({
        action: "automation.run_rules",
        tenantId: body.tenantId ?? null,
        userId: null,
        resourceType: "automation_time_elapsed",
        ip,
        metadata: { via: "cron", result: "error" },
      });
      return NextResponse.json({ error: "Erro ao executar regras" }, { status: 500 });
    }
  }

  const session = await getAuthFromRequest(request);
  const denied = requireRole(session, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;

  const sessionTenantId = session!.payload.tenantId?.trim() ?? "";
  if (!sessionTenantId) {
    return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });
  }

  if (body.tenantId && body.tenantId !== sessionTenantId) {
    recordPlatformAudit({
      action: "automation.run_rules",
      tenantId: sessionTenantId,
      userId: session!.payload.sub,
      resourceType: "automation_time_elapsed",
      ip,
      metadata: {
        via: "session",
        role: session!.payload.role,
        result: "forbidden_cross_tenant",
      },
    });
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  try {
    const data = await runTimeElapsedRulesBatch({
      tenantId: sessionTenantId,
      threadLimit: body.threadLimit,
    });
    recordPlatformAudit({
      action: "automation.run_rules",
      tenantId: sessionTenantId,
      userId: session!.payload.sub,
      resourceType: "automation_time_elapsed",
      ip,
      metadata: {
        via: "session",
        role: session!.payload.role,
        scope: "session_tenant",
        tenants: data.tenants,
        threadsScanned: data.threadsScanned,
        rulesWithSuccess: data.rulesWithSuccess,
        result: "ok",
      },
    });
    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error("[automation/run-rules]", e);
    recordPlatformAudit({
      action: "automation.run_rules",
      tenantId: sessionTenantId,
      userId: session!.payload.sub,
      resourceType: "automation_time_elapsed",
      ip,
      metadata: {
        via: "session",
        role: session!.payload.role,
        result: "error",
      },
    });
    return NextResponse.json({ error: "Erro ao executar regras" }, { status: 500 });
  }
}
