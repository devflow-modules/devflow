import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  FINANCEIRO_AUTH_PATH,
  FINANCEIRO_BASE_PATH,
  FINANCEIRO_DEMO_PATH,
} from "@devflow/financeiro-routes";
import { sanitizeFinanceiroNextPath } from "@/lib/auth/safeFinanceiroNextPath";

type CookieOption = { name: string; value: string; options?: Record<string, unknown> };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

/** Rotas públicas sob o prefixo do produto; todo o resto exige sessão. */
function isFinanceiroPublicPath(pathname: string): boolean {
  if (pathname === FINANCEIRO_BASE_PATH || pathname === `${FINANCEIRO_BASE_PATH}/`) return true;
  if (pathname === FINANCEIRO_DEMO_PATH || pathname.startsWith(`${FINANCEIRO_DEMO_PATH}/`))
    return true;
  if (pathname === FINANCEIRO_AUTH_PATH || pathname.startsWith(`${FINANCEIRO_AUTH_PATH}/`))
    return true;
  return false;
}

function isFinanceiroProtectedRoute(pathname: string): boolean {
  if (!pathname.startsWith(`${FINANCEIRO_BASE_PATH}/`)) return false;
  return !isFinanceiroPublicPath(pathname);
}

function redirectToFinanceiroAuth(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = FINANCEIRO_AUTH_PATH;
  url.searchParams.delete("next");
  const safe = sanitizeFinanceiroNextPath(request.nextUrl.pathname);
  if (safe) url.searchParams.set("next", safe);
  return NextResponse.redirect(url);
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const needsAuth = isFinanceiroProtectedRoute(pathname);

  if (!supabaseUrl || !supabaseKey) {
    if (needsAuth) return redirectToFinanceiroAuth(request);
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

  if (!user && needsAuth) {
    return redirectToFinanceiroAuth(request);
  }

  return supabaseResponse;
}
