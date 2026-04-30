"use client";

import Link from "next/link";
import { useSessionRole } from "@/components/navigation/SessionRoleContext";
import { canAccessPlatformAdmin } from "@/lib/permissions";

export function PlatformAdminContextBanner() {
  const { role, tenantId } = useSessionRole();
  if (!canAccessPlatformAdmin(role)) return null;

  return (
    <div
      className="df-feedback-info border-b border-[var(--df-info-border)] px-3 py-2 text-xs sm:px-4 sm:text-sm"
      data-testid="platform-admin-context-banner"
      role="status"
    >
      <p className="font-semibold">Modo Plataforma</p>
      <p className="mt-0.5">
        Você está gerenciando um tenant.
        {tenantId ? ` Tenant atual: ${tenantId}.` : ""}
      </p>
      <Link
        href="/admin/tenants"
        className="mt-1 inline-block font-semibold text-[var(--df-brand-700)] underline-offset-2 hover:underline"
      >
        Ver tenants
      </Link>
    </div>
  );
}
