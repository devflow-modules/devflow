"use client";

import { useMemo } from "react";
import { useHousehold } from "@/modules/financeiro/lib/household/HouseholdProvider";
import { getFinanceiroQuickActions } from "@/modules/financeiro/navigation/operational/quickActions";
import { getFinanceiroLastAction } from "@/modules/financeiro/navigation/operational/lastActionStorage";
import { QuickActionsPanel } from "./QuickActionsPanel";
import { ResumeCard } from "./ResumeCard";
import { RecentAccessList } from "./RecentAccessList";
import { useOperationalRefresh } from "./useOperationalRefresh";

export function DashboardOperationalSection() {
  useOperationalRefresh();
  const { activeMembershipRole } = useHousehold();
  const role = activeMembershipRole === "MEMBER" ? "MEMBER" : "OWNER";
  const actions = useMemo(() => getFinanceiroQuickActions(role), [role]);
  const hasLastAction = Boolean(getFinanceiroLastAction());

  return (
    <div className="scroll-mt-24 space-y-3 md:space-y-4" id="painel-operacional">
      <QuickActionsPanel actions={actions} hasLastAction={hasLastAction} source="dashboard" />
      <div className="grid gap-4 lg:grid-cols-2">
        <ResumeCard source="dashboard" />
        <RecentAccessList source="dashboard" />
      </div>
    </div>
  );
}
