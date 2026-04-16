"use client";

import type { ReactNode } from "react";
import { NavigationOrientationHint } from "@/components/navigation/NavigationOrientationHint";
import { RouteBreadcrumbs } from "@/components/navigation/RouteBreadcrumbs";
import { useShellLayoutOptional } from "./ShellLayoutContext";

/**
 * Área de conteúdo scrollável dentro do `AppShell` (viewport fixo).
 * Mantém breadcrumbs e hint no mesmo scroll que o corpo da página.
 * Com menu lateral recuado (rail), alarga ligeiramente o contentor para aproveitar a largura sem perder legibilidade.
 */
export function ShellPage({ children }: { children: ReactNode }) {
  const shell = useShellLayoutOptional();
  const wideContent = Boolean(shell?.sidebarCollapsed);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div
          className={`mx-auto w-full px-4 py-8 transition-[max-width,padding] duration-300 ease-out sm:px-6 sm:py-10 ${
            wideContent
              ? "max-w-7xl lg:px-10 lg:py-12 xl:max-w-[88rem] xl:px-12 2xl:max-w-[96rem]"
              : "max-w-6xl lg:px-10 lg:py-12"
          }`}
        >
          <RouteBreadcrumbs />
          <NavigationOrientationHint />
          {children}
        </div>
      </div>
    </div>
  );
}
