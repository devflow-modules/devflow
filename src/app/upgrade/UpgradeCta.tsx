"use client";

import { trackUpgradeClicked } from "@/modules/billing/billingAnalytics";

export function UpgradeCta() {
  return (
    <button
      type="button"
      onClick={() => trackUpgradeClicked({})}
      className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
    >
      Upgrade (em breve)
    </button>
  );
}
