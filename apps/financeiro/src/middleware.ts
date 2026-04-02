import { type NextRequest } from "next/server";
import { updateSession } from "@/modules/financeiro/lib/supabase/middleware-client";

/**
 * Sessão Supabase no edge — escopo só deste app (não reutiliza middleware do portal).
 * Matcher alinhado ao padrão Supabase + Next para refrescar cookies em rotas dinâmicas.
 */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
