"use client";

import { useEffect, useRef } from "react";
import { trackPlanViewed } from "@/modules/billing/billingAnalytics";

export function PricingViewTracker() {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    trackPlanViewed({});
  }, []);
  return null;
}
