import type { ApplicationDecision, CareerUpside, EliminationRisk, HiringProbability, JobDecisionV2 } from "./application-decision-types.js";
import type { ApplyFlowApplication } from "./application-types.js";
import type { ContactStatus } from "./contact-types.js";

export type ApplyFlowApplicationV2Meta = {
  decision?: ApplicationDecision;
  priority?: number;
  hiringProbability?: HiringProbability;
  careerUpside?: CareerUpside;
  eliminationRisk?: EliminationRisk;
  resumeVariant?: string;
  networkingStatus?: ContactStatus;
  nextActionAt?: string;
  /** Link to inbox job. Never used as Outcome.applicationId. */
  sourceJobId?: string;
};

export type ApplyFlowApplicationV2Envelope = ApplyFlowApplication & {
  v2?: ApplyFlowApplicationV2Meta;
};

export function applicationMetaFromDecision(decision: JobDecisionV2, extras?: Partial<ApplyFlowApplicationV2Meta>): ApplyFlowApplicationV2Meta {
  return {
    decision: decision.decision,
    priority: decision.priority,
    hiringProbability: decision.hiringProbability,
    careerUpside: decision.careerUpside,
    eliminationRisk: decision.eliminationRisk,
    ...extras,
  };
}

export function attachApplicationV2Meta(
  application: ApplyFlowApplication,
  meta: ApplyFlowApplicationV2Meta,
): ApplyFlowApplicationV2Envelope {
  return { ...application, v2: meta };
}

export function stripApplicationV2Meta(record: ApplyFlowApplicationV2Envelope): ApplyFlowApplication {
  const { v2: _v2, ...rest } = record;
  return rest;
}
