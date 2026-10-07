import type { Contact, ContactConfidence, OutreachStatus } from "./contact-types.js";
import { effectiveOutreachStatus } from "./outreach-lifecycle.js";
import type { ApplyFlowJob } from "./job-match-types.js";
import type { NetworkingStrategy } from "./networking-strategy.js";
import { readJobNetworkingMeta } from "./networking-strategy.js";

export const NETWORKING_QUEUE_FILTERS = [
  "all",
  "ready",
  "sent",
  "replied",
  "follow_up",
  "no_contact",
] as const;

export type NetworkingQueueFilter = (typeof NETWORKING_QUEUE_FILTERS)[number];

export type NetworkingQueueItem = {
  jobId: string;
  company?: string;
  title: string;
  matchScore: number;
  /** True when match score must not be overwritten by hydrate/reevaluate. */
  manualMatchOverride: boolean;
  priority: number;
  strategy?: NetworkingStrategy;
  contact?: Contact;
  contactName?: string;
  outreachStatus?: OutreachStatus;
  contactConfidence?: ContactConfidence;
  hasContact: boolean;
};

const CONFIDENCE_RANK: Record<ContactConfidence, number> = {
  very_high: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function primaryContactForJob(jobId: string, contacts: readonly Contact[], now: Date): Contact | undefined {
  const scoped = contacts.filter(
    (contact) => !contact.archivedAt && contact.jobId === jobId,
  );
  if (scoped.length === 0) return undefined;
  return [...scoped].sort((a, b) => {
    const byConfidence =
      (CONFIDENCE_RANK[b.contactConfidence ?? "low"] ?? 0) -
      (CONFIDENCE_RANK[a.contactConfidence ?? "low"] ?? 0);
    if (byConfidence !== 0) return byConfidence;
    const statusRank = (contact: Contact) => {
      const status = effectiveOutreachStatus(contact, now);
      if (status === "FOLLOW_UP_DUE") return 5;
      if (status === "MESSAGE_PREPARED") return 4;
      if (status === "IDENTIFIED") return 3;
      if (status === "SENT") return 2;
      return 1;
    };
    const byStatus = statusRank(b) - statusRank(a);
    if (byStatus !== 0) return byStatus;
    return a.id.localeCompare(b.id);
  })[0];
}

function matchesFilter(item: NetworkingQueueItem, filter: NetworkingQueueFilter): boolean {
  if (filter === "all") return true;
  if (filter === "no_contact") return !item.hasContact;
  if (!item.hasContact || !item.outreachStatus) return false;
  if (filter === "ready") return item.outreachStatus === "MESSAGE_PREPARED" || item.outreachStatus === "IDENTIFIED";
  if (filter === "sent") return item.outreachStatus === "SENT";
  if (filter === "replied") {
    return item.outreachStatus === "REPLIED" || item.outreachStatus === "CONVERSATION";
  }
  if (filter === "follow_up") return item.outreachStatus === "FOLLOW_UP_DUE";
  return true;
}

/**
 * Derived networking queue. Sort: opportunity priority → match score → contact confidence.
 * Does not send messages.
 */
export function selectNetworkingQueue(
  jobs: readonly ApplyFlowJob[],
  contacts: readonly Contact[],
  options: {
    filter?: NetworkingQueueFilter;
    now?: Date;
  } = {},
): NetworkingQueueItem[] {
  const filter = options.filter ?? "all";
  const now = options.now ?? new Date();
  const items: NetworkingQueueItem[] = jobs.map((job) => {
    const networking = readJobNetworkingMeta(job.jobContext);
    const contact = primaryContactForJob(job.id, contacts, now);
    const outreachStatus = contact ? effectiveOutreachStatus(contact, now) : undefined;
    return {
      jobId: job.id,
      company: job.company,
      title: job.title,
      matchScore: job.jobMatch.score,
      manualMatchOverride: networking?.manualMatchOverride === true,
      priority: networking?.priority ?? Number.POSITIVE_INFINITY,
      strategy: networking?.strategy,
      contact,
      contactName: contact?.name,
      outreachStatus,
      contactConfidence: contact?.contactConfidence,
      hasContact: Boolean(contact),
    };
  });

  const filtered = items.filter((item) => matchesFilter(item, filter));
  return filtered.sort((a, b) => {
    const byPriority = a.priority - b.priority;
    if (byPriority !== 0) return byPriority;
    const byScore = b.matchScore - a.matchScore;
    if (byScore !== 0) return byScore;
    const byConfidence =
      (CONFIDENCE_RANK[b.contactConfidence ?? "low"] ?? 0) -
      (CONFIDENCE_RANK[a.contactConfidence ?? "low"] ?? 0);
    if (byConfidence !== 0) return byConfidence;
    return a.jobId.localeCompare(b.jobId);
  });
}

export function networkingIndicatorLabel(item: Pick<NetworkingQueueItem, "hasContact" | "outreachStatus" | "strategy">): string {
  if (!item.hasContact) {
    return item.strategy === "apply_only" ? "No contact" : "No contact";
  }
  switch (item.outreachStatus) {
    case "MESSAGE_PREPARED":
    case "IDENTIFIED":
      return item.strategy === "apply_first_then_message" ? "Apply first" : "Ready";
    case "SENT":
      return "Sent";
    case "FOLLOW_UP_DUE":
      return "Follow-up";
    case "REPLIED":
    case "CONVERSATION":
      return "Replied";
    case "CLOSED":
      return "Closed";
    default:
      return "Networking";
  }
}
