"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { recordFinanceiroRecentRoute } from "./recentRoutesStorage";

export function FinanceiroRecentRoutesTracker() {
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    recordFinanceiroRecentRoute(pathname);
  }, [pathname]);

  return null;
}
