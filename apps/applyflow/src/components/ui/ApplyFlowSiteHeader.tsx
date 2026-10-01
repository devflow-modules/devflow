"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

function navLinkClass(active: boolean): string {
  return cn(
    "rounded-md px-2 py-1.5 transition-colors",
    "hover:bg-[color:var(--af-surface-muted)] hover:text-[color:var(--af-text)]",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--af-brand)]",
    active
      ? "bg-[color:var(--af-surface-muted)] font-medium text-[color:var(--af-text)]"
      : "text-[color:var(--af-text-muted)]",
  );
}

function isDashboardActive(pathname: string): boolean {
  if (pathname === "/dashboard") return true;
  if (pathname.startsWith("/dashboard/jobs")) return true;
  return false;
}

export function ApplyFlowSiteHeader({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname() ?? "/";

  return (
    <header className="sticky top-0 z-20 border-b border-[color:var(--af-border)] bg-[color:var(--af-bg)]/88 backdrop-blur-xl backdrop-saturate-150">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500/35 to-transparent" />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:gap-4 sm:px-5 sm:py-4">
        <Link
          href="/"
          className="shrink-0 text-base font-semibold tracking-tight text-emerald-400 transition-colors hover:text-emerald-300 sm:text-lg"
        >
          ApplyFlow
        </Link>
        <nav
          aria-label="Principal"
          className="flex max-w-[min(100%,28rem)] flex-wrap items-center justify-end gap-x-1 gap-y-1 text-sm sm:max-w-none sm:gap-x-4"
        >
          <Link href="/" className={navLinkClass(pathname === "/")} aria-current={pathname === "/" ? "page" : undefined}>
            Início
          </Link>
          <Link
            href="/dashboard"
            className={navLinkClass(isDashboardActive(pathname))}
            aria-current={isDashboardActive(pathname) ? "page" : undefined}
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/analytics"
            className={navLinkClass(pathname.startsWith("/dashboard/analytics"))}
            aria-current={pathname.startsWith("/dashboard/analytics") ? "page" : undefined}
          >
            Analytics
          </Link>
          <Link
            href="/documentacao"
            className={navLinkClass(pathname.startsWith("/documentacao"))}
            aria-current={pathname.startsWith("/documentacao") ? "page" : undefined}
          >
            Documentação
          </Link>
          {signedIn ? (
            <Link
              href="/account"
              className={navLinkClass(pathname.startsWith("/account"))}
              aria-current={pathname.startsWith("/account") ? "page" : undefined}
              data-testid="nav-account"
            >
              Account
            </Link>
          ) : (
            <Link
              href="/login"
              className={navLinkClass(pathname.startsWith("/login"))}
              aria-current={pathname.startsWith("/login") ? "page" : undefined}
              data-testid="nav-sign-in"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
