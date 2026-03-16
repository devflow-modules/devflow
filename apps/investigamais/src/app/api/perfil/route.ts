import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { getProfile, updateProfile, formatName, profileCompletionPercentage } from "@/modules/users";
import { trackProfileUpdated } from "@/modules/analytics";
import { z } from "zod";
import { hasSupabaseConfig } from "@/lib/supabase-server";

const updateSchema = z.object({
  nome: z.string().max(255).optional(),
  telefone: z.string().max(50).optional(),
  nascimento: z.string().optional(),
  cidade: z.string().max(100).optional(),
  uf: z.string().max(2).optional(),
  genero: z.string().max(20).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabaseConfig()) return NextResponse.json({ error: "Serviço indisponível" }, { status: 503 });
  const user = await getProfile(auth.payload.sub);
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  return NextResponse.json({
    ...user,
    senha_hash: undefined,
    nomeFormatado: formatName(user.nome),
    completionPercentage: profileCompletionPercentage(user),
  });
}

export async function PUT(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabaseConfig()) return NextResponse.json({ error: "Serviço indisponível" }, { status: 503 });
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  const { user, bonusConcedido } = await updateProfile({ userId: auth.payload.sub, ...parsed.data });
  trackProfileUpdated();
  return NextResponse.json({
    user: { ...user, senha_hash: undefined },
    bonusConcedido,
    nomeFormatado: formatName(user.nome),
    completionPercentage: profileCompletionPercentage(user),
  });
}
