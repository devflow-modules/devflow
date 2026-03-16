import { NextResponse } from "next/server";
import { listAgentsByTenant, createAgent } from "@/modules/agents";
import type { AgentStatus } from "@/lib/db/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id");
  if (!tenantId) {
    return NextResponse.json({ error: "tenant_id required" }, { status: 400 });
  }
  try {
    const agents = await listAgentsByTenant(tenantId);
    return NextResponse.json(agents);
  } catch (e) {
    console.error("[api/agents]", e);
    return NextResponse.json({ error: "Failed to list agents" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: { tenant_id?: string; name?: string; email?: string; status?: AgentStatus };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { tenant_id, name, email, status } = body;
  if (!tenant_id || !name) {
    return NextResponse.json({ error: "tenant_id, name required" }, { status: 400 });
  }
  try {
    const agent = await createAgent({
      tenant_id,
      name,
      email: email ?? null,
      status: status ?? "offline",
    });
    return NextResponse.json(agent);
  } catch (e) {
    console.error("[api/agents]", e);
    return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });
  }
}
