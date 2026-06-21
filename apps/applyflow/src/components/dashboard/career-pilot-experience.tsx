"use client";

import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowSection } from "@/components/ui/ApplyFlowSection";
import type { CareerChatIntent } from "@devflow/career-core";
import { useState } from "react";
import { CareerChatWorkspace } from "./career-chat-workspace";
import { CareerPilotJourney } from "./career-pilot-journey";
import { CareerPilotOnboarding } from "./career-pilot-onboarding";
import {
  CAREER_PILOT_EXAMPLE_BUTTON_LABEL,
  CAREER_PILOT_EXAMPLE_FIELDS,
  CAREER_PILOT_WORKSPACE_ID,
} from "./career-pilot-content";

export function CareerPilotExperience() {
  const [activeIntent, setActiveIntent] = useState<CareerChatIntent>("analyze_resume");
  const [exampleKey, setExampleKey] = useState(0);

  return (
    <ApplyFlowSection
      id="career-suite-piloto"
      eyebrow="Piloto fechado"
      title="Career Suite"
      description="Siga as três etapas abaixo para revisar currículo, compatibilidade com uma vaga e plano de ação."
    >
      <div className="space-y-5">
        <CareerPilotOnboarding />

        <CareerPilotJourney activeIntent={activeIntent} />

        <div id={CAREER_PILOT_WORKSPACE_ID} className="scroll-mt-24 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <ApplyFlowButton
              type="button"
              variant="outlineBrand"
              size="sm"
              data-testid="career-pilot-example-button"
              onClick={() => setExampleKey((current) => current + 1)}
            >
              {CAREER_PILOT_EXAMPLE_BUTTON_LABEL}
            </ApplyFlowButton>
            <p className="text-[11px] text-[color:var(--af-text-muted)]">
              Exemplo fictício — substitua pelos seus dados reais.
            </p>
          </div>

          <CareerChatWorkspace
            key={exampleKey}
            careerBundle={null}
            selectedSignalIds={[]}
            availableSignals={[]}
            pilotPresentation
            initialSpecialistFields={
              exampleKey > 0 ? CAREER_PILOT_EXAMPLE_FIELDS : undefined
            }
            onPilotActionChange={setActiveIntent}
          />
        </div>
      </div>
    </ApplyFlowSection>
  );
}
