"use client";

import Link from "next/link";
import type { NavItem } from "./nav-config";
import { navIsActive } from "@/lib/navigation/nav-active";
import { ROUTE_META } from "@/lib/navigation/nav-matrix";
import { shellHomeHref, showDistribuirInShellNav } from "@/lib/roles";
import type { UserRole } from "@/modules/auth";
import { useSupport } from "@/components/support/SupportProvider";
import { Button } from "@/components/ui/button";
import {
  DF_NAV_SENSITIVE_DIVIDER_RAIL,
  DF_NAV_SENSITIVE_IDLE,
} from "./nav-sensitive-classes";

function railLinkSensitive(href: string): boolean {
  return (
    href.includes("/settings/") ||
    href.includes("ai-analytics") ||
    href.includes("/billing") ||
    href.startsWith("/dashboard/ai")
  );
}

function iconForHref(href: string) {
  if (href === "/distribuir") {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <circle cx="12" cy="12" r="9" strokeWidth={1.75} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l2 2" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 12h4m0 0l-2-2m2 2l-2 2" />
      </svg>
    );
  }
  if (href.startsWith("/dashboard/whatsapp")) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    );
  }
  if (href === "/dashboard") {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    );
  }
  if (href.startsWith("/inbox")) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    );
  }
  if (href.startsWith("/conversations")) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    );
  }
  if (href.startsWith("/automation")) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    );
  }
  if (href.startsWith("/billing")) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    );
  }
  if (href.startsWith("/settings")) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    );
  }
  if (href.startsWith("/dashboard/ai")) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    );
  }
  if (href.startsWith("/agents")) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    );
  }
  if (href.startsWith("/queues")) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 10h16M4 14h10M4 18h10" />
      </svg>
    );
  }
  if (href.startsWith("/admin")) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

function RailNavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = navIsActive(pathname, item.href);
  const sensitive = railLinkSensitive(item.href);
  return (
    <Link
      href={item.href}
      title={item.label}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      onClick={() => onNavigate?.()}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
        active
          ? "bg-[var(--df-brand-50)] text-[var(--df-brand-900)] ring-1 ring-[var(--df-brand-200)]/90 shadow-sm"
          : sensitive
            ? DF_NAV_SENSITIVE_IDLE
            : "text-[var(--df-text-secondary)] hover:bg-[var(--df-brand-100)]/20 hover:text-[var(--df-text-primary)]"
      }`}
    >
      {iconForHref(item.href)}
    </Link>
  );
}

export function SidebarRail({
  pathname,
  sessionRole,
  operationNav,
  automationNav,
  accountNav,
  teamNav,
  platformNav,
  onNavigate,
  onExpand,
}: {
  pathname: string;
  sessionRole: UserRole | string | null;
  operationNav: NavItem[];
  automationNav: NavItem[];
  accountNav: NavItem[];
  teamNav: NavItem[];
  platformNav: NavItem[];
  onNavigate?: () => void;
  onExpand: () => void;
}) {
  const home = shellHomeHref(sessionRole);
  const { openSupport } = useSupport();
  const showDistribuir = showDistribuirInShellNav(sessionRole);
  const distribuirLabel = ROUTE_META["/distribuir"].label;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/login";
  }

  return (
    <aside
      className="df-page flex h-full w-full min-w-0 flex-col bg-[var(--df-bg-elevated)]"
      aria-label="Navegação compacta"
      data-testid="sidebar-rail"
    >
      <div className="flex flex-col items-center gap-2 border-b border-[var(--df-border-brand)] px-1 py-3">
        <Link
          href={home}
          title="Início"
          aria-label="Início"
          data-testid="sidebar-rail-home"
          onClick={() => onNavigate?.()}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--df-brand-600)] text-[10px] font-bold text-white shadow-sm transition hover:bg-[var(--df-brand-700)]"
        >
          DF
        </Link>
        <Button
          variant="ghost"
          type="button"
          data-testid="sidebar-rail-expand"
          onClick={onExpand}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--df-text-muted)] transition hover:bg-[var(--df-brand-100)]/20 hover:text-[var(--df-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--df-brand-500)] focus-visible:ring-offset-2"
          aria-label="Expandir menu lateral"
          title="Expandir menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </Button>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col items-center gap-1.5 overflow-y-auto overflow-x-hidden px-1 py-3">
        {operationNav.map((item) => (
          <RailNavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
        ))}
        {automationNav.length > 0 ? (
          <>
            <div className="my-1 h-px w-6 bg-[var(--df-border-brand)]/80" aria-hidden />
            {automationNav.map((item) => (
              <RailNavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
            ))}
          </>
        ) : null}
        {accountNav.length > 0 ? (
          <>
            <div className="my-1 h-px w-6 bg-[var(--df-border-brand)]/80" aria-hidden />
            {accountNav.map((item) => (
              <RailNavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
            ))}
          </>
        ) : null}
        {teamNav.length > 0 ? (
          <>
            <div className="my-1 h-px w-6 bg-[var(--df-border-brand)]/80" aria-hidden />
            {teamNav.map((item) => (
              <RailNavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
            ))}
          </>
        ) : null}
        {platformNav.length > 0 ? (
          <>
            <div
              className={DF_NAV_SENSITIVE_DIVIDER_RAIL}
              aria-hidden
              data-testid="sidebar-rail-sensitive-divider"
            />
            {platformNav.map((item) => (
              <RailNavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
            ))}
          </>
        ) : null}
      </nav>

      <div className="flex flex-col items-center gap-1.5 border-t border-[var(--df-border-brand)] px-1 py-3">
        {showDistribuir ? (
          <Link
            href="/distribuir"
            data-testid="sidebar-rail-distribuir"
            title={distribuirLabel}
            aria-label={distribuirLabel}
            onClick={() => onNavigate?.()}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
              navIsActive(pathname, "/distribuir")
                ? "bg-[var(--df-brand-50)] text-[var(--df-brand-900)] ring-1 ring-[var(--df-brand-200)]/90 shadow-sm"
                : "text-[var(--df-text-secondary)] hover:bg-[var(--df-brand-100)]/20 hover:text-[var(--df-text-primary)]"
            }`}
          >
            {iconForHref("/distribuir")}
          </Link>
        ) : null}
        <Button
          variant="secondary"
          type="button"
          data-testid="sidebar-rail-support"
          onClick={() => openSupport()}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--df-border-brand)] bg-[var(--df-bg-elevated)] text-[var(--df-text-secondary)] shadow-sm transition hover:bg-[var(--df-brand-100)]/20 hover:text-[var(--df-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--df-brand-500)] focus-visible:ring-offset-2"
          aria-label="Precisa de ajuda?"
          title="Precisa de ajuda?"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </Button>
        <Link
          href="/login"
          data-testid="sidebar-rail-login-other"
          title="Entrar (outra conta)"
          aria-label="Entrar (outra conta)"
          onClick={() => onNavigate?.()}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--df-text-muted)] transition hover:bg-[var(--df-brand-100)]/20 hover:text-[var(--df-text-primary)]"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </Link>
        <Button
          variant="secondary"
          type="button"
          data-testid="sidebar-rail-logout"
          onClick={() => void logout()}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--df-danger-text)] transition hover:bg-[var(--df-danger-bg)]"
          aria-label="Terminar sessão"
          title="Terminar sessão"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </Button>
      </div>
    </aside>
  );
}
