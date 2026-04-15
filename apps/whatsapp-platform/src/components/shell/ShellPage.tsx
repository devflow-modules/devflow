import type { ReactNode } from "react";
import { NavigationOrientationHint } from "@/components/navigation/NavigationOrientationHint";
import { RouteBreadcrumbs } from "@/components/navigation/RouteBreadcrumbs";

/**
 * Área de conteúdo scrollável dentro do `AppShell` (viewport fixo).
 * Mantém breadcrumbs e hint no mesmo scroll que o corpo da página.
 */
export function ShellPage({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-12">
          <RouteBreadcrumbs />
          <NavigationOrientationHint />
          {children}
        </div>
      </div>
    </div>
  );
}
