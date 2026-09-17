import {
  historicalDecisionsFromSnapshots,
  outcomeFromApplication,
  type ApplicationOutcome,
  type ApplyFlowApplicationV2Envelope,
  type ApplyFlowJob,
  type CandidateProfile,
  type CareerAnalyticsInput,
  type Contact,
  type ContactInteraction,
  type HistoricalDecisionRecord,
} from "@devflow/applyflow-core";

export function historicalDecisionsFromJobs(input: {
  jobs: readonly ApplyFlowJob[];
  applications: readonly ApplyFlowApplicationV2Envelope[];
  outcomes?: readonly ApplicationOutcome[];
  profile?: CandidateProfile;
}): HistoricalDecisionRecord[] {
  void input.jobs;
  void input.profile;
  return historicalDecisionsFromSnapshots({
    applications: input.applications,
    outcomes: input.outcomes ?? [],
  });
}

export function buildCareerAnalyticsInput(input: {
  applications: readonly ApplyFlowApplicationV2Envelope[];
  jobs?: readonly ApplyFlowJob[];
  outcomes?: readonly ApplicationOutcome[];
  events?: CareerAnalyticsInput["events"];
  efforts?: CareerAnalyticsInput["efforts"];
  contacts?: readonly Contact[];
  interactions?: readonly ContactInteraction[];
  profile?: CandidateProfile;
  now?: Date;
}): CareerAnalyticsInput {
  const outcomes =
    input.outcomes && input.outcomes.length
      ? input.outcomes
      : input.applications.map((application) =>
          outcomeFromApplication(application, { contacts: input.contacts, interactions: input.interactions }),
        );
  return {
    applications: input.applications,
    jobs: input.jobs,
    outcomes,
    events: input.events,
    efforts: input.efforts,
    contacts: input.contacts,
    interactions: input.interactions,
    decisions: historicalDecisionsFromJobs({
      jobs: input.jobs ?? [],
      applications: input.applications,
      outcomes,
      profile: input.profile,
    }),
    now: input.now,
  };
}
