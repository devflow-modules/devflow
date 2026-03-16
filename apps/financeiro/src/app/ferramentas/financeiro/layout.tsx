"use client";

import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { Toaster } from "sonner";
import { HouseholdProvider } from "@/modules/financeiro/lib/household/HouseholdProvider";
import { AppShell } from "@/modules/financeiro/components/AppShell";

const APP_ROUTES = [
  "/ferramentas/financeiro/dashboard",
  "/ferramentas/financeiro/sources",
  "/ferramentas/financeiro/expenses",
  "/ferramentas/financeiro/rules",
  "/ferramentas/financeiro/settings",
  "/ferramentas/financeiro/onboarding",
  "/ferramentas/financeiro/invites/accept",
];

function isAppRoute(pathname: string): boolean {
  return APP_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export default function FinanceiroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "/";

  if (isAppRoute(pathname)) {
    return (
      <HouseholdProvider>
        <AppShell>{children}</AppShell>
        <Toaster richColors position="top-center" />
      </HouseholdProvider>
    );
  }

  return <Fragment>{children}</Fragment>;
}
