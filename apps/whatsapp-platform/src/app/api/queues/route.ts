import { NextResponse } from "next/server";
import { listQueuesByTenant, createQueue } from "@/modules/queues";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id");
  if (!tenantId) {
    return NextResponse.json({ error: "tenant_id required" }, { status: 400 });
  }
  try {
    const queues = await listQueuesByTenant(tenantId);
    return NextResponse.json(queues);
  } catch (e) {
    console.error("[api/queues]", e);
    return NextResponse.json({ error: "Failed to list queues" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: { tenant_id?: string; name?: string; slug?: string; max_size?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { tenant_id, name, slug, max_size } = body;
  if (!tenant_id || !name || !slug) {
    return NextResponse.json({ error: "tenant_id, name, slug required" }, { status: 400 });
  }
  try {
    const queue = await createQueue({ tenant_id, name, slug, max_size: max_size ?? null });
    return NextResponse.json(queue);
  } catch (e) {
    console.error("[api/queues]", e);
    return NextResponse.json({ error: "Failed to create queue" }, { status: 500 });
  }
}
