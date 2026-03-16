import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieOption = { name: string; value: string; options?: Record<string, unknown> };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

const protectedPaths = [
  "/ferramentas/financeiro/dashboard",
  "/ferramentas/financeiro/sources",
  "/ferramentas/financeiro/expenses",
  "/ferramentas/financeiro/rules",
  "/ferramentas/financeiro/settings",
  "/ferramentas/financeiro/onboarding",
];
const isProtected = (pathname: string) =>
  protectedPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));

export async function updateSession(request: NextRequest) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieOption[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  if (!user && isProtected(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/ferramentas/financeiro/auth";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
