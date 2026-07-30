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
import { RailIcon } from "./rail-icons";

function railLinkSensitive(href: string): boolean {
  return (
    href.includes("/settings/") ||
    href.includes("ai-analytics") ||
    href.includes("/billing") ||
    href.startsWith("/dashboard/ai")
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
      <RailIcon href={item.href} />
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
            <RailIcon href="/distribuir" />
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
