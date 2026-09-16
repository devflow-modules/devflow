import type { ContactType } from "./contact-types.js";
import type { NetworkingPlan } from "./networking-plan.js";

export const FOLLOW_UP_ACTIONS = ["connect", "message", "follow_up", "stop"] as const;
export type FollowUpAction = (typeof FOLLOW_UP_ACTIONS)[number];

export type FollowUpStep = {
  offsetDays: number;
  targetContactType: ContactType;
  action: FollowUpAction;
  message?: string;
  condition: string;
};

export type FollowUpStrategy = {
  id: string;
  offsetsDays: number[];
};

export const DEFAULT_FOLLOW_UP_STRATEGY: FollowUpStrategy = {
  id: "default-t0-2-5-10",
  offsetsDays: [0, 2, 5, 10],
};

export type FollowUpPlan = {
  strategyId: string;
  steps: FollowUpStep[];
  stopConditions: string[];
};

export function buildFollowUpPlan(input: {
  networking: NetworkingPlan;
  strategy?: FollowUpStrategy;
}): FollowUpPlan {
  const strategy = input.strategy ?? DEFAULT_FOLLOW_UP_STRATEGY;
  const first = input.networking.firstContact;
  const steps: FollowUpStep[] = strategy.offsetsDays.map((offsetDays, index) => ({
    offsetDays,
    targetContactType: first,
    action: index === 0 ? "connect" : index >= 3 ? "follow_up" : "message",
    message: index === 0 ? input.networking.connectionRequest : input.networking.followUpMessage,
    condition: index === 0 ? "no prior contact" : "no reply and role still open",
  }));

  return {
    strategyId: strategy.id,
    steps,
    stopConditions: input.networking.stopConditions,
  };
}
