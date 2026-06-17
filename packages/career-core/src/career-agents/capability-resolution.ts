import {
  CAREER_AGENT_ALLOWED_CAPABILITIES,
  CAREER_AGENT_CAPABILITIES_BY_AGENT,
  CAREER_AGENT_FORBIDDEN_CAPABILITIES,
} from "./capabilities.js";
import type { CareerAgentAllowedCapability } from "./capabilities.js";
import type { CareerAgentKind } from "./types.js";

export function resolveAllowedCapabilitiesForAgent(
  agent: CareerAgentKind,
): CareerAgentAllowedCapability[] {
  return [...CAREER_AGENT_CAPABILITIES_BY_AGENT[agent]];
}

export function resolveBlockedCapabilitiesForAgent(agent: CareerAgentKind): string[] {
  const allowed = new Set<string>(CAREER_AGENT_CAPABILITIES_BY_AGENT[agent]);
  return CAREER_AGENT_FORBIDDEN_CAPABILITIES.filter((capability) => !allowed.has(capability));
}

export function isCareerAgentCapabilityAllowed(
  agent: CareerAgentKind,
  capability: string,
): capability is CareerAgentAllowedCapability {
  return (CAREER_AGENT_CAPABILITIES_BY_AGENT[agent] as readonly string[]).includes(capability);
}

export function listAllAllowedCapabilities(): CareerAgentAllowedCapability[] {
  return [...CAREER_AGENT_ALLOWED_CAPABILITIES];
}
