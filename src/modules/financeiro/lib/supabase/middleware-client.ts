import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  FINANCEIRO_BASE_PATH,
  FINANCEIRO_NAV_EVENT_COOKIE,
  FINANCEIRO_STAY_PUBLIC_PARAM,
} from "@/modules/financeiro/navigation/constants";
import { resolveFinanceiroResumeFromCookies } from "@/modules/financeiro/navigation/resumeFromCookies";

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

/** Dashboard de demonstração sem login — validação e links compartilháveis */
const isFinanceiroDemoPath = (pathname: string) =>
  pathname === `${FINANCEIRO_BASE_PATH}/demo` || pathname.startsWith(`${FINANCEIRO_BASE_PATH}/demo/`);

const FINANCEIRO_AUTH_ENTRY = `${FINANCEIRO_BASE_PATH}/auth`;

function isFinanceiroPublicEntryPath(pathname: string): boolean {
  return pathname === FINANCEIRO_BASE_PATH || pathname === FINANCEIRO_AUTH_ENTRY;
}

function copySetCookieHeaders(from: NextResponse, to: NextResponse): void {
  const list = from.headers.getSetCookie?.() ?? [];
  for (const c of list) {
    to.headers.append("Set-Cookie", c);
  }
}

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

  const pathname = request.nextUrl.pathname;
  const stay =
    request.nextUrl.searchParams.get(FINANCEIRO_STAY_PUBLIC_PARAM) === "1";

  if (user && isFinanceiroPublicEntryPath(pathname) && !stay) {
    const { targetPath, hasLastRoute } = resolveFinanceiroResumeFromCookies(request.cookies);
    if (targetPath !== pathname) {
      const redirectUrl = new URL(targetPath, request.url);
      const redirectResponse = NextResponse.redirect(redirectUrl);
      copySetCookieHeaders(supabaseResponse, redirectResponse);
      const payload = {
        source_path: pathname,
        target_path: targetPath,
        has_last_route: hasLastRoute,
        redirect_type: pathname === FINANCEIRO_AUTH_ENTRY ? "from_auth" : "from_landing",
      } as const;
      redirectResponse.cookies.set(
        FINANCEIRO_NAV_EVENT_COOKIE,
        encodeURIComponent(JSON.stringify(payload)),
        { path: "/", maxAge: 120, sameSite: "lax", httpOnly: false }
      );
      return redirectResponse;
    }
  }

  if (!user && isProtected(request.nextUrl.pathname) && !isFinanceiroDemoPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/ferramentas/financeiro/auth";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
