"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { readVerifyPayload } from "@/lib/api-json-client";
import { fetchProtected } from "@/lib/protected-fetch";
import type { UserRole } from "@/modules/auth";

const KNOWN_ROLES = new Set<UserRole>(["operator", "manager", "platform_admin"]);

type SessionRoleState = {
  role: UserRole | null;
  tenantId: string | null;
  loading: boolean;
};

const SessionRoleContext = createContext<SessionRoleState>({ role: null, tenantId: null, loading: true });

export function SessionRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchProtected("/api/auth/verify")
      .then((r) => r.json())
      .then((raw: unknown) => {
        if (cancelled) return;
        const d = readVerifyPayload(raw);
        const r0 = d.user?.role;
        const t0 = d.user?.tenantId;
        if (r0 && KNOWN_ROLES.has(r0 as UserRole)) setRole(r0 as UserRole);
        else setRole(null);
        setTenantId(typeof t0 === "string" && t0.trim() ? t0 : null);
      })
      .catch(() => {
        if (!cancelled) {
          setRole(null);
          setTenantId(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <SessionRoleContext.Provider value={{ role, tenantId, loading }}>{children}</SessionRoleContext.Provider>;
}

export function useSessionRole() {
  return useContext(SessionRoleContext);
}
