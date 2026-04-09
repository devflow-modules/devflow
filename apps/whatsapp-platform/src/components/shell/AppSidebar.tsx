"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { SupportHelpButton } from "@/components/support/SupportHelpButton";
import { useNavPreferences } from "@/components/navigation/useNavPreferences";
import { useSessionRole } from "@/components/navigation/SessionRoleContext";
import {
  NAV_OPERATION,
  primaryNavForRole,
  secondaryNavForRole,
  type NavItem,
} from "./nav-config";
import { ROUTE_META } from "@/lib/navigation/nav-matrix";
import { isOperator, isPlatformAdmin, shellHomeHref } from "@/lib/roles";
function NavLink({
  href,
  label,
  active,
  sensitive,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  sensitive?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={() => onNavigate?.()}
      className={`block rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-[var(--df-brand-50)]/90 text-[var(--df-brand-800)]"
          : sensitive
            ? "text-amber-900/90 hover:bg-amber-50 hover:text-amber-950"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      {label}
    </Link>
  );
}

function CollapsibleNavSection({
  sectionId,
  title,
  defaultSensitive,
  children,
}: {
  sectionId: string;
  title: string;
  defaultSensitive?: boolean;
  children: ReactNode;
}) {
  const { prefs, setSectionCollapsed } = useNavPreferences();
  const collapsed = prefs.collapsedSections[sectionId] ?? false;

  return (
    <div className={defaultSensitive ? "rounded-xl ring-1 ring-amber-100/90 bg-amber-50/20" : ""}>
      <button
        type="button"
        onClick={() => setSectionCollapsed(sectionId, !collapsed)}
        className={`mb-2 flex w-full items-center justify-between gap-2 px-3 py-1 text-left text-[11px] font-semibold uppercase tracking-[0.1em] ${
          defaultSensitive ? "text-amber-800/90" : "text-slate-400/90"
        }`}
        aria-expanded={!collapsed}
      >
        <span>{title}</span>
        <span className="text-slate-400" aria-hidden>
          {collapsed ? "▸" : "▾"}
        </span>
      </button>
      {!collapsed ? <div className="space-y-0.5">{children}</div> : null}
    </div>
  );
}

function navIsActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/dashboard/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? "";
  const { role: sessionRole } = useSessionRole();

  const primaryNav = primaryNavForRole(sessionRole);
  const secondaryNav = secondaryNavForRole(sessionRole);

  const platformNav: NavItem[] = useMemo(() => {
    if (!sessionRole || !isPlatformAdmin(sessionRole)) return [];
    return [
      { href: "/admin/metrics", label: ROUTE_META["/admin/metrics"].label },
      { href: "/admin/billing", label: ROUTE_META["/admin/billing"].label },
      { href: "/admin/agents", label: ROUTE_META["/admin/agents"].label },
      { href: "/admin/conversations", label: ROUTE_META["/admin/conversations"].label },
    ];
  }, [sessionRole]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/login";
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-100/90 bg-white">
      <div className="border-b border-slate-100/90 px-4 py-6">
        <Link href={shellHomeHref(sessionRole)} className="block" onClick={() => onNavigate?.()}>
          <span className="text-sm font-semibold tracking-tight text-slate-950">WhatsApp Platform</span>
          <span className="mt-1 block text-xs text-slate-500">DevFlow Labs</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-4">
        <CollapsibleNavSection sectionId="principal" title="Principal">
          <div className="space-y-0.5">
            {primaryNav.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                active={navIsActive(pathname, item.href)}
                sensitive={item.href.includes("/settings/") || item.href.includes("ai-analytics")}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </CollapsibleNavSection>

        {secondaryNav.length > 0 ? (
          <CollapsibleNavSection sectionId="conta" title="Conta e canais" defaultSensitive>
            <div className="space-y-0.5">
              {secondaryNav.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  active={navIsActive(pathname, item.href)}
                  sensitive
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </CollapsibleNavSection>
        ) : null}

        <div className="border-t border-slate-200/80 pt-3" aria-hidden />

        <CollapsibleNavSection sectionId="operacao" title="Operação">
          <div className="space-y-0.5">
            {NAV_OPERATION.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                active={navIsActive(pathname, item.href)}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </CollapsibleNavSection>

        {platformNav.length > 0 ? (
          <CollapsibleNavSection sectionId="plataforma" title="Plataforma (interno)" defaultSensitive>
            <div className="mb-2 border-t-2 border-amber-200/70 pt-3" aria-hidden />
            <p className="mb-2 px-3 text-[10px] leading-snug text-amber-800/80">
              Ferramentas de equipa DevFlow — não confundir com o tenant do cliente.
            </p>
            <div className="space-y-0.5">
              {platformNav.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  active={navIsActive(pathname, item.href)}
                  sensitive
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </CollapsibleNavSection>
        ) : null}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <SupportHelpButton variant="sidebar" className="mb-3" />
        {sessionRole && (isOperator(sessionRole) || isPlatformAdmin(sessionRole)) ? (
          <Link
            href="/admin/distribuir"
            className="mb-2 block rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
            onClick={() => onNavigate?.()}
          >
            {ROUTE_META["/admin/distribuir"].label}
          </Link>
        ) : null}
        <Link
          href="/login"
          className="mb-2 block rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-slate-50"
          onClick={() => onNavigate?.()}
        >
          Entrar (outra conta)
        </Link>
        <button
          type="button"
          onClick={() => void logout()}
          className="w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50"
        >
          Terminar sessão
        </button>
      </div>
    </aside>
  );
}
