import Link from "next/link";

import { ApplyFlowButton, applyFlowButtonClass } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import { ApplyFlowSection } from "@/components/ui/ApplyFlowSection";

import { DASHBOARD_NEXT_STEP_TITLE, DASHBOARD_NEXT_STEPS } from "./dashboard-work-content";
import type { DashboardNextStepId } from "./dashboard-work-state";

export function DashboardNextStep({ step, href }: { step: DashboardNextStepId; href?: string }) {
  const copy = DASHBOARD_NEXT_STEPS[step];
  const target = href ?? copy.href;
  const isHash = target.startsWith("#");

  return (
    <ApplyFlowSection title={DASHBOARD_NEXT_STEP_TITLE}>
      <ApplyFlowCard padding="md">
        <p className="text-sm text-[color:var(--af-text)]">{copy.body}</p>
        {isHash ? (
          <ApplyFlowButton
            type="button"
            variant="primary"
            size="md"
            className="mt-3"
            onClick={() =>
              document.getElementById(target.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
          >
            {copy.action}
          </ApplyFlowButton>
        ) : (
          <Link href={target} className={`${applyFlowButtonClass({ variant: "primary", size: "md" })} mt-3`}>
            {copy.action}
          </Link>
        )}
      </ApplyFlowCard>
    </ApplyFlowSection>
  );
}
