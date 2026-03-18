"use client";

import { Toaster } from "sonner";
import { HouseholdProvider } from "@/modules/financeiro/lib/household/HouseholdProvider";
import { AppShell } from "@/modules/financeiro/components/AppShell";

export default function FinanceiroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <HouseholdProvider>
      <AppShell>{children}</AppShell>
      <Toaster richColors position="top-center" />
    </HouseholdProvider>
  );
}
