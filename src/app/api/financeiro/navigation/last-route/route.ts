import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/modules/financeiro/lib/supabase/server";
import { FINANCEIRO_LAST_ROUTE_COOKIE } from "@/modules/financeiro/navigation/constants";
import {
  isPersistableFinanceiroInternalPath,
  normalizeResumeTargetPath,
} from "@/modules/financeiro/navigation/lastRoute";

const bodySchema = z.object({
  path: z.string().min(1).max(2048),
});

const COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const pathname = parsed.data.path;
  if (!isPersistableFinanceiroInternalPath(pathname)) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const safe = normalizeResumeTargetPath(pathname);
  if (safe !== pathname) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(FINANCEIRO_LAST_ROUTE_COOKIE, encodeURIComponent(pathname), {
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
