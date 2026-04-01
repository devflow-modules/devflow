"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/modules/financeiro/lib/cn";
import { btnGhostLight, focusRingLight, labelCaps } from "@/modules/financeiro/lib/primitives";
import { Sidebar } from "@/modules/financeiro/components/Sidebar";
import { QuickAddModal } from "@/modules/financeiro/components/QuickAddModal";
import { DemoPresentationBar } from "@/modules/financeiro/components/DemoPresentationBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("financeiro.sidebar.collapsed");
      if (stored != null) setIsCollapsed(stored === "true");
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("financeiro.sidebar.collapsed", String(isCollapsed));
    } catch { /* noop */ }
  }, [isCollapsed]);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setQuickAddOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const contentPadding = isCollapsed ? "sm:pl-20" : "sm:pl-64";

  return (
    <div className="min-h-screen">
      <Sidebar
        pathname={pathname}
        isCollapsed={isCollapsed}
        onToggleCollapsed={() => setIsCollapsed((prev) => !prev)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      <div className={`flex min-h-screen flex-col ${contentPadding}`}>
        {/* Mobile header */}
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-card/95 px-4 py-3 backdrop-blur sm:hidden">
          <button
            type="button"
            className={cn(btnGhostLight, labelCaps, focusRingLight)}
            onClick={() => setIsMobileOpen(true)}
            aria-label="Abrir menu"
          >
            Menu
          </button>
          <p className={cn("text-xs uppercase tracking-[0.4em]", "text-muted-foreground flex-1")}>
            Navegação
          </p>
          <button
            type="button"
            onClick={() => setQuickAddOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            + Lançar
          </button>
        </div>

        <DemoPresentationBar pathname={pathname} />

        {/* Desktop quick-add FAB */}
        <button
          type="button"
          onClick={() => setQuickAddOpen(true)}
          title="Lançar rápido (⌘K)"
          className="fixed bottom-6 right-6 z-40 hidden items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95 sm:flex"
        >
          <span className="text-lg leading-none">+</span>
          <span>Lançar</span>
          <kbd className="ml-1 rounded border border-primary-foreground/30 px-1.5 py-0.5 text-[10px] font-mono opacity-75">
            ⌘K
          </kbd>
        </button>

        {children}
      </div>

      <QuickAddModal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
    </div>
  );
}
