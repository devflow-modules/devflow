import type { ApplyFlowApplication } from "./application-types.js";
import type { Contact, ContactInteraction } from "./contact-types.js";
import type { FollowUpPlan } from "./follow-up-plan.js";

export type DueFollowUpBucket = "today" | "upcoming" | "overdue";

export type DueFollowUp = {
  contactId: string;
  jobId?: string;
  dueAt: string;
  bucket: DueFollowUpBucket;
  action: string;
  message?: string;
};

const DAY_MS = 86_400_000;

function startOfDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function bucketFor(dueAt: Date, now: Date): DueFollowUpBucket {
  const due = startOfDay(dueAt);
  const today = startOfDay(now);
  if (due < today) return "overdue";
  if (due === today) return "today";
  return "upcoming";
}

function lastInteractionAt(contact: Contact, interactions: readonly ContactInteraction[]): number | undefined {
  const times = interactions
    .filter((item) => item.contactId === contact.id)
    .map((item) => Date.parse(item.occurredAt))
    .filter((n) => Number.isFinite(n));
  if (contact.lastContactAt) {
    const t = Date.parse(contact.lastContactAt);
    if (Number.isFinite(t)) times.push(t);
  }
  if (times.length === 0) return undefined;
  return Math.max(...times);
}

function shouldStop(contact: Contact, application?: ApplyFlowApplication): boolean {
  if (
    contact.repliedAt ||
    contact.status === "closed" ||
    contact.status === "replied" ||
    contact.status === "REPLIED" ||
    contact.status === "CONVERSATION" ||
    contact.status === "CLOSED"
  ) {
    return true;
  }
  if (application?.status === "rejected" || application?.status === "accepted") return true;
  return false;
}

/**
 * Deterministic due queue. Does not send messages.
 */
export function getDueFollowUps(input: {
  now: Date;
  contacts: readonly Contact[];
  interactions: readonly ContactInteraction[];
  applications?: readonly ApplyFlowApplication[];
  plan: FollowUpPlan;
}): DueFollowUp[] {
  const apps = new Map((input.applications ?? []).map((item) => [item.id, item]));
  const out: DueFollowUp[] = [];

  for (const contact of input.contacts) {
    const application = contact.applicationId
      ? apps.get(contact.applicationId)
      : contact.jobId
        ? apps.get(contact.jobId)
        : undefined;
    if (shouldStop(contact, application)) continue;
    const origin = lastInteractionAt(contact, input.interactions);
    const base = origin ?? Date.parse(contact.createdAt);
    if (!Number.isFinite(base)) continue;

    const exact = input.plan.steps.filter((step) => step.targetContactType === contact.type);
    const steps = exact.length ? exact : input.plan.steps;
    const completed = input.interactions.filter(
      (item) =>
        item.contactId === contact.id &&
        (item.type === "connection_request" || item.type === "message" || item.type === "follow_up"),
    ).length;
    const used = steps[Math.min(completed, Math.max(0, steps.length - 1))];
    if (!used) continue;

    const due = new Date(base + used.offsetDays * DAY_MS);
    const explicitFollowUp = contact.followUpAt ?? contact.nextActionAt;
    if (explicitFollowUp) {
      const explicit = new Date(explicitFollowUp);
      if (Number.isFinite(explicit.getTime())) {
        out.push({
          contactId: contact.id,
          jobId: contact.jobId,
          dueAt: explicit.toISOString(),
          bucket: bucketFor(explicit, input.now),
          action: used.action,
          message: used.message,
        });
        continue;
      }
    }

    out.push({
      contactId: contact.id,
      jobId: contact.jobId,
      dueAt: due.toISOString(),
      bucket: bucketFor(due, input.now),
      action: used.action,
      message: used.message,
    });
  }

  return out.sort((a, b) => a.dueAt.localeCompare(b.dueAt) || a.contactId.localeCompare(b.contactId));
}

export function groupDueFollowUps(items: readonly DueFollowUp[]): Record<DueFollowUpBucket, DueFollowUp[]> {
  return {
    today: items.filter((item) => item.bucket === "today"),
    upcoming: items.filter((item) => item.bucket === "upcoming"),
    overdue: items.filter((item) => item.bucket === "overdue"),
  };
}
