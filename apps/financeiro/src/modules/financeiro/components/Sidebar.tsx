"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useHousehold } from "@/modules/financeiro/lib/household/HouseholdProvider";
import { cn } from "@/modules/financeiro/lib/cn";
import { focusRingLight, labelCaps } from "@/modules/financeiro/lib/primitives";

const BASE = "/ferramentas/financeiro";

type NavItem = {
  href: string;
  label: string;
  short: string;
};

type SidebarProps = {
  pathname: string;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
};

const FULL_ITEMS: NavItem[] = [
  { href: `${BASE}/dashboard`, label: "Dashboard", short: "D" },
  { href: `${BASE}/sources`, label: "Fontes", short: "F" },
  { href: `${BASE}/expenses`, label: "Despesas", short: "E" },
  { href: `${BASE}/rules`, label: "Regras", short: "R" },
  { href: `${BASE}/settings`, label: "Configurações", short: "C" },
];

const MEMBER_ITEMS: NavItem[] = [
  { href: `${BASE}/dashboard`, label: "Resumo", short: "R" },
  { href: `${BASE}/expenses`, label: "Lançamentos", short: "L" },
  { href: `${BASE}/settings`, label: "Conta", short: "C" },
];

export function Sidebar({
  pathname,
  isCollapsed,
  onToggleCollapsed,
  isMobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const { household, activeMembershipRole } = useHousehold();
  const isMember = activeMembershipRole === "MEMBER";

  const items = useMemo(() => {
    const list = isMember ? [...MEMBER_ITEMS] : [...FULL_ITEMS];
    const shouldShowOnboarding = !household || pathname === `${BASE}/onboarding`;
    if (shouldShowOnboarding) {
      list.push({ href: `${BASE}/onboarding`, label: "Onboarding", short: "O" });
    }
    return list;
  }, [household, pathname, isMember]);

  const overlayClasses = isMobileOpen
    ? "opacity-100"
    : "pointer-events-none opacity-0";

  const asideClasses = [
    "fixed inset-y-0 left-0 z-40 flex h-full flex-col border-r border-slate-200 bg-white shadow-sm",
    "transition-transform duration-200 ease-out",
    isCollapsed ? "w-20" : "w-64",
    isMobileOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0",
  ].join(" ");

  const labelClasses = isCollapsed ? "sr-only" : "block";
  const headerTextClasses = isCollapsed ? "sr-only" : "block";

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-slate-900/50 transition-opacity duration-200 sm:hidden ${overlayClasses}`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside className={asideClasses} aria-label="Menu principal">
        <div className="flex items-center justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <p className={cn("text-xs uppercase tracking-[0.4em]", "text-muted-foreground", headerTextClasses)}>Financeiro</p>
            <p className={cn("truncate text-lg font-semibold text-foreground", headerTextClasses)}>Casa</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={cn("hidden rounded-xl border border-slate-200 px-2 py-2 text-foreground transition hover:bg-slate-50 sm:inline-flex", labelCaps, focusRingLight)}
              onClick={onToggleCollapsed}
              aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
            >
              {isCollapsed ? ">>" : "<<"}
            </button>
            <button
              type="button"
              className={cn("rounded-xl border border-slate-200 px-2 py-2 text-foreground transition hover:bg-slate-50 sm:hidden", labelCaps, focusRingLight)}
              onClick={onCloseMobile}
              aria-label="Fechar menu"
            >
              X
            </button>
          </div>
        </div>

        <div className="px-4">
          <div className="rounded-2xl border border-slate-200 bg-card p-3">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Casa ativa</p>
            <p className={cn("mt-2 truncate text-sm text-foreground", headerTextClasses)}>
              {household?.name ?? "Nenhuma casa ativa"}
            </p>
            {!isMember && (
              <>
                <p className={cn("mt-1 text-xs text-muted-foreground", headerTextClasses)}>
                  {household?.slug ? `slug: ${household.slug}` : "Complete o onboarding"}
                </p>
                <p className={cn("mt-2 text-xs text-muted-foreground", headerTextClasses)}>
                  Cargo: {activeMembershipRole ?? "—"}
                </p>
              </>
            )}
          </div>
        </div>

        <nav className="mt-4 flex-1 space-y-1 px-3">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition-colors",
                  isActive ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-slate-100",
                  focusRingLight
                )}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {item.short}
                </span>
                <span className={labelClasses}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-4 pb-4">
          <div className="rounded-2xl border border-slate-200 bg-card p-3">
            <p className={cn("text-xs text-muted-foreground", headerTextClasses)}>
              {isMember
                ? "Use Resumo e Lançamentos no dia a dia. Conta para trocar casa ou sair."
                : "OWNER pode gerenciar convites, metas e membros."}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
