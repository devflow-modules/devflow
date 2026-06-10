import { NextResponse } from "next/server";
import { createDiagnosticoLead } from "@/lib/contato/create-diagnostico-lead";
import { diagnosticoLeadInputSchema } from "@/lib/contato/diagnostico-lead";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rate = checkRateLimit(ip, "contato-diagnostico");
  if (!rate.ok) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente mais tarde." },
      {
        status: 429,
        headers: rate.retryAfter != null ? { "Retry-After": String(rate.retryAfter) } : undefined,
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const parsed = diagnosticoLeadInputSchema.safeParse(body);
  if (!parsed.success) {
    const msg =
      parsed.error.flatten().formErrors[0] ??
      Object.values(parsed.error.flatten().fieldErrors).flat()[0] ??
      "Dados inválidos.";
    return NextResponse.json({ error: typeof msg === "string" ? msg : "Dados inválidos." }, { status: 400 });
  }

  const digits = parsed.data.whatsapp.replace(/\D/g, "");
  if (digits.length < 8) {
    return NextResponse.json({ error: "Informe um WhatsApp válido." }, { status: 400 });
  }

  try {
    const lead = await createDiagnosticoLead(parsed.data);
    return NextResponse.json({ ok: true, id: lead.id }, { status: 201 });
  } catch {
    console.error("[POST /api/contato/diagnostico] persist failed");
    return NextResponse.json(
      { error: "Não foi possível registrar seu pedido. Tente novamente ou continue pelo WhatsApp." },
      { status: 500 }
    );
  }
}
