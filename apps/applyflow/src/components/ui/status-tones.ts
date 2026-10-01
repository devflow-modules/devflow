import type { ApplyFlowBadgeTone } from "@/components/ui/ApplyFlowBadge";
import type { ApplyFlowApplicationStatus, JobMatchDecision } from "@devflow/applyflow-core";

/** Match Engine advisory decision → badge tone (not Application status). */
export function matchDecisionTone(decision: JobMatchDecision): ApplyFlowBadgeTone {
  if (decision === "apply") return "success";
  if (decision === "stretch") return "warning";
  if (decision === "needs_info") return "warning";
  return "danger";
}

/** Persisted Application lifecycle status → badge tone. */
export function applicationStatusTone(status: ApplyFlowApplicationStatus): ApplyFlowBadgeTone {
  switch (status) {
    case "accepted":
    case "hired":
      return "success";
    case "rejected":
    case "ignored":
      return "danger";
    case "interview":
      return "brand";
    case "technical_test":
      return "intel";
    case "waiting_response":
      return "warning";
    case "applied":
    case "reviewing":
    default:
      return "neutral";
  }
}

/** Application readiness checklist item state. */
export function readinessTone(state: "ready" | "attention" | "missing"): ApplyFlowBadgeTone {
  if (state === "ready") return "success";
  if (state === "attention") return "warning";
  return "neutral";
}

/** Job Decision V2 recommendation vocabulary (distinct from Match Engine). */
export function applicationDecisionTone(
  decision: "apply_high" | "apply_normal" | "apply_stretch" | "needs_info" | "skip" | string,
): ApplyFlowBadgeTone {
  if (decision === "apply_high") return "success";
  if (decision === "apply_normal") return "brand";
  if (decision === "apply_stretch") return "warning";
  if (decision === "needs_info") return "warning";
  return "danger";
}

/** Skill evidence match row status inside Job Decision. */
export function evidenceMatchTone(status: string): ApplyFlowBadgeTone {
  if (status === "proven") return "success";
  if (status === "partial") return "warning";
  if (status === "gap") return "danger";
  return "neutral";
}

/** Networking outreach status (Application-scoped contacts). */
export function networkingStatusTone(
  status: "IDEA" | "DRAFT" | "SENT" | "FOLLOW_UP_DUE" | "REPLIED" | "CONVERSATION" | "CLOSED" | string,
): ApplyFlowBadgeTone {
  if (status === "REPLIED" || status === "CONVERSATION") return "success";
  if (status === "SENT") return "brand";
  if (status === "FOLLOW_UP_DUE") return "warning";
  if (status === "CLOSED") return "neutral";
  return "intel";
}
