"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchProtected } from "@/lib/protected-fetch";
import type { UserRole } from "@/modules/auth";

const KNOWN_ROLES = new Set<UserRole>(["operator", "manager", "platform_admin"]);

type SessionRoleState = {
  role: UserRole | null;
  loading: boolean;
};

const SessionRoleContext = createContext<SessionRoleState>({ role: null, loading: true });

export function SessionRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchProtected("/api/auth/verify")
      .then((r) => r.json())
      .then((d: { valid?: boolean; user?: { role?: string } }) => {
        if (cancelled) return;
        const r0 = d.user?.role;
        if (r0 && KNOWN_ROLES.has(r0 as UserRole)) setRole(r0 as UserRole);
        else setRole(null);
      })
      .catch(() => {
        if (!cancelled) setRole(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <SessionRoleContext.Provider value={{ role, loading }}>{children}</SessionRoleContext.Provider>;
}

export function useSessionRole() {
  return useContext(SessionRoleContext);
}
