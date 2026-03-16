import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    user: {
      id: auth.payload.sub,
      email: auth.payload.email,
      cpf: auth.payload.cpf,
      nome: auth.payload.nome,
      role: auth.payload.role,
    },
  });
}
