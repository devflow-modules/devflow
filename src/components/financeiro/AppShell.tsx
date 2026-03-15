"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/financeiro/cn";
import { btnGhostLight, focusRingLight, labelCaps } from "@/lib/financeiro/primitives";
import { Sidebar } from "@/components/financeiro/Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("financeiro.sidebar.collapsed");
      if (stored != null) setIsCollapsed(stored === "true");
    } catch {
      // ignora leitura do storage
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("financeiro.sidebar.collapsed", String(isCollapsed));
    } catch {
      // ignora escrita do storage
    }
  }, [isCollapsed]);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

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
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-card/95 px-4 py-3 backdrop-blur sm:hidden">
          <button
            type="button"
            className={cn(btnGhostLight, labelCaps, focusRingLight)}
            onClick={() => setIsMobileOpen(true)}
            aria-label="Abrir menu"
          >
            Menu
          </button>
          <p className={cn("text-xs uppercase tracking-[0.4em]", "text-muted-foreground")}>Navegação</p>
        </div>
        {children}
      </div>
    </div>
  );
}
