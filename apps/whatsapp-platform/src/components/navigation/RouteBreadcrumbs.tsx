"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { getBreadcrumbs } from "@/lib/navigation/nav-matrix";
import { shellHomeHref } from "@/lib/roles";
import { useSessionRole } from "./SessionRoleContext";

/**
 * Trilho global — integrado visualmente antes do conteúdo da página (AppShell).
 */
export function RouteBreadcrumbs() {
  const pathname = usePathname() ?? "";
  const { role } = useSessionRole();

  const items = useMemo(() => {
    const homeHref = shellHomeHref(role);
    const homeLabel = homeHref === "/inbox" ? "Inbox" : "Painel";
    return getBreadcrumbs(pathname, { href: homeHref, label: homeLabel });
  }, [pathname, role]);

  if (items.length <= 1) return null;

  return (
    <nav
      aria-label="Trilho de navegação"
      className="mb-6 flex flex-wrap items-start justify-between gap-x-4 gap-y-2"
    >
      <ol className="flex min-w-0 max-w-full flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5 text-sm text-slate-500 [scrollbar-width:thin]">
        {items.map((crumb, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${crumb.href}-${i}`} className="flex min-w-0 max-w-[min(100%,14rem)] shrink-0 items-center gap-1.5 sm:max-w-[min(100%,18rem)]">
              {i > 0 ? (
                <span className="text-slate-300" aria-hidden>
                  /
                </span>
              ) : null}
              {last ? (
                <span
                  className={`truncate font-medium text-slate-800 ${crumb.sensitive ? "rounded-md bg-amber-50 px-1.5 py-0.5 text-amber-950 ring-1 ring-amber-200/80" : ""}`}
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className={`truncate transition hover:text-[var(--df-brand-700)] ${crumb.sensitive ? "text-amber-800/90" : ""}`}
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
      <span
        className="hidden shrink-0 pt-0.5 text-[10px] font-medium tabular-nums text-slate-400 lg:inline"
        title="Abrir navegação rápida"
      >
        ⌘K · Ctrl+K
      </span>
    </nav>
  );
}
