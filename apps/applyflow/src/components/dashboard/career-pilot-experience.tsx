"use client";

import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowSection } from "@/components/ui/ApplyFlowSection";
import type { CareerChatIntent } from "@devflow/career-core";
import { useCallback, useState } from "react";
import { CareerChatWorkspace } from "./career-chat-workspace";
import { CareerJourneyStepper } from "./career-journey-stepper";
import { CareerProductHeader } from "./career-product-header";
import {
  CAREER_PILOT_EXAMPLE_BUTTON_LABEL,
  CAREER_PILOT_EXAMPLE_FIELDS,
  CAREER_PILOT_EXAMPLE_HINT,
  CAREER_PILOT_WORKSPACE_ID,
  type CareerPilotIntent,
} from "./career-pilot-content";

export function CareerPilotExperience() {
  const [activeIntent, setActiveIntent] = useState<CareerChatIntent>("analyze_resume");
  const [completedIntents, setCompletedIntents] = useState<Set<CareerPilotIntent>>(new Set());
  const [exampleKey, setExampleKey] = useState(0);

  const handleIntentSelect = useCallback((intent: CareerPilotIntent) => {
    setActiveIntent(intent);
  }, []);

  const handleAnalysisComplete = useCallback((intent: CareerPilotIntent) => {
    setCompletedIntents((current) => {
      if (current.has(intent)) {
        return current;
      }
      const next = new Set(current);
      next.add(intent);
      return next;
    });
  }, []);

  return (
    <ApplyFlowSection
      id="career-suite-piloto"
      title="Career Suite"
      description="Entenda seu currículo, compare com uma vaga e transforme os achados em um plano de ação."
      className="mx-auto max-w-4xl"
    >
      <div className="space-y-6">
        <CareerProductHeader />

        <CareerJourneyStepper
          activeIntent={activeIntent}
          completedIntents={completedIntents}
          onSelectIntent={handleIntentSelect}
        />

        <div id={CAREER_PILOT_WORKSPACE_ID} className="scroll-mt-24 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <ApplyFlowButton
              type="button"
              variant="ghost"
              size="sm"
              className="w-full sm:w-auto"
              data-testid="career-pilot-example-button"
              onClick={() => setExampleKey((current) => current + 1)}
            >
              {CAREER_PILOT_EXAMPLE_BUTTON_LABEL}
            </ApplyFlowButton>
            <p className="text-sm text-[color:var(--af-text-muted)]">{CAREER_PILOT_EXAMPLE_HINT}</p>
          </div>

          <CareerChatWorkspace
            key={exampleKey}
            careerBundle={null}
            selectedSignalIds={[]}
            availableSignals={[]}
            pilotPresentation
            pilotIntent={activeIntent}
            onPilotActionChange={setActiveIntent}
            onPilotAnalysisComplete={handleAnalysisComplete}
            initialSpecialistFields={exampleKey > 0 ? CAREER_PILOT_EXAMPLE_FIELDS : undefined}
          />
        </div>
      </div>
    </ApplyFlowSection>
  );
}
