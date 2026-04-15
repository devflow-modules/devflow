"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { AppSidebar } from "./AppSidebar";
import { SupportProvider } from "@/components/support/SupportProvider";
import { SessionRoleProvider, useSessionRole } from "@/components/navigation/SessionRoleContext";
import { ShellPage } from "./ShellPage";
import { EvaluationModeRibbon } from "./EvaluationModeRibbon";
import { SessionRoleModePill } from "./SessionRoleModePill";
import { NavCommandPalette } from "@/components/navigation/NavCommandPalette";
import { shellHomeHref } from "@/lib/roles";

function MobileHeaderBrand() {
  const { role } = useSessionRole();
  const href = shellHomeHref(role);
  return (
    <Link href={href} className="min-w-0 truncate text-sm font-semibold tracking-tight text-slate-900">
      WhatsApp Platform
    </Link>
  );
}

function AppShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const inboxFullBleed = pathname === "/inbox" || pathname.startsWith("/inbox/");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMobileNavOpen(false));
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  return (
    <div className="flex h-dvh max-h-dvh w-full min-h-0 overflow-hidden bg-slate-50/90">
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[1px] lg:hidden"
          aria-label="Fechar menu"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-[min(17.5rem,88vw)] shrink-0 flex-col border-r border-slate-100/90 bg-white shadow-[4px_0_32px_rgba(15,23,42,0.04)] transition-transform duration-200 ease-out lg:static lg:z-0 lg:h-full lg:w-60 lg:max-w-none lg:shadow-none lg:transition-none ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <AppSidebar onNavigate={() => setMobileNavOpen(false)} />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-30 flex h-14 shrink-0 items-center gap-2 border-b border-slate-100 bg-white/90 px-3 backdrop-blur-md sm:gap-3 sm:px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--df-brand-500)] focus-visible:ring-offset-2"
            aria-label="Abrir menu de navegação"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <MobileHeaderBrand />
          <SessionRoleModePill variant="header" />
          <span className="ml-auto shrink-0 text-[10px] text-slate-400" title="Paleta de navegação">
            ⌘K
          </span>
        </header>
        <EvaluationModeRibbon />
        <main className="min-h-0 flex-1 overflow-hidden">
          {inboxFullBleed ? (
            <div className="flex h-full min-h-0 flex-col overflow-hidden">{children}</div>
          ) : (
            <ShellPage>{children}</ShellPage>
          )}
        </main>
      </div>
      <NavCommandPalette />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <SupportProvider>
        <SessionRoleProvider>
          <AppShellInner>{children}</AppShellInner>
        </SessionRoleProvider>
      </SupportProvider>
    </QueryProvider>
  );
}
