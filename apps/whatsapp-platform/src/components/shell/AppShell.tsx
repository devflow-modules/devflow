"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./AppSidebar";
import { SupportProvider } from "@/components/support/SupportProvider";

export function AppShell({ children }: { children: ReactNode }) {
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
    <SupportProvider>
    <div className="flex min-h-screen bg-slate-50/90">
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[1px] lg:hidden"
          aria-label="Fechar menu"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(17.5rem,88vw)] shrink-0 flex-col border-r border-slate-100/90 bg-white shadow-[4px_0_32px_rgba(15,23,42,0.04)] transition-transform duration-200 ease-out lg:static lg:z-0 lg:w-60 lg:max-w-none lg:shadow-none lg:transition-none ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <AppSidebar onNavigate={() => setMobileNavOpen(false)} />
      </div>
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-slate-100 bg-white/90 px-3 backdrop-blur-md sm:px-4 lg:hidden">
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
          <Link href="/dashboard" className="min-w-0 truncate text-sm font-semibold tracking-tight text-slate-900">
            WhatsApp Platform
          </Link>
        </header>
        <main className="min-h-0 flex-1">
          {inboxFullBleed ? (
            <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col overflow-hidden lg:h-[100dvh]">
              {children}
            </div>
          ) : (
            <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-12">{children}</div>
          )}
        </main>
      </div>
    </div>
    </SupportProvider>
  );
}
