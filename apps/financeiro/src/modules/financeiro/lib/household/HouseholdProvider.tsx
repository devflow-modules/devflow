"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { FINANCEIRO_AUTH_PATH, FINANCEIRO_BASE_PATH } from "@devflow/financeiro-routes";

export type Household = {
  id: string;
  name: string;
  slug: string;
  role?: "OWNER" | "MEMBER";
};

type HouseholdContextValue = {
  household: Household | null;
  households: Household[];
  setHousehold: (value: Household | null) => void;
  isLoading: boolean;
  refetchMe: () => Promise<void>;
  activeMembershipRole: "OWNER" | "MEMBER" | null;
};

const HouseholdContext = createContext<HouseholdContextValue | undefined>(undefined);

const protectedPaths = [
  `${FINANCEIRO_BASE_PATH}/dashboard`,
  `${FINANCEIRO_BASE_PATH}/contas`,
  `${FINANCEIRO_BASE_PATH}/sources`,
  `${FINANCEIRO_BASE_PATH}/expenses`,
  `${FINANCEIRO_BASE_PATH}/rules`,
  `${FINANCEIRO_BASE_PATH}/settings`,
];
const isProtected = (path: string) =>
  protectedPaths.some((p) => path === p || path.startsWith(p + "/"));

export const HouseholdProvider = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const [household, setHouseholdState] = useState<Household | null>(null);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMembershipRole, setActiveMembershipRole] = useState<"OWNER" | "MEMBER" | null>(null);

  const refetchMe = useCallback(async () => {
    try {
      const res = await fetch("/api/me");
      const payload = await res.json();

      if (!res.ok) {
        if (res.status === 401 && isProtected(pathname)) {
          window.location.href = FINANCEIRO_AUTH_PATH;
          return;
        }
        setHouseholdState(null);
        setHouseholds([]);
        return;
      }

      const list = payload.data?.households ?? [];
      const active = payload.data?.activeHousehold ?? null;
      const role = payload.data?.activeMembershipRole ?? null;

      setHouseholds(list);
      setActiveMembershipRole(role);

      if (active) {
        setHouseholdState(active);
      } else if (list.length > 0) {
        setHouseholdState(list[0]);
      } else {
        setHouseholdState(null);
        setActiveMembershipRole(null);
        if (isProtected(pathname) && pathname !== `${FINANCEIRO_BASE_PATH}/onboarding`) {
          window.location.href = `${FINANCEIRO_BASE_PATH}/onboarding`;
        }
      }
    } catch {
      setHouseholdState(null);
      setHouseholds([]);
      setActiveMembershipRole(null);
    } finally {
      setIsLoading(false);
    }
  }, [pathname]);

  useEffect(() => {
    refetchMe();
  }, [refetchMe]);

  const setHousehold = useCallback((value: Household | null) => {
    setHouseholdState(value);
    if (value) {
      fetch("/api/me/active-household", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId: value.id }),
      }).then(() => refetchMe());
    }
  }, [refetchMe]);

  const value = useMemo(
    () => ({ household, households, setHousehold, isLoading, refetchMe, activeMembershipRole }),
    [household, households, setHousehold, isLoading, refetchMe, activeMembershipRole]
  );

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
};

export const useHousehold = () => {
  const context = useContext(HouseholdContext);
  if (!context) {
    throw new Error("useHousehold must be used inside HouseholdProvider");
  }
  return context;
};
