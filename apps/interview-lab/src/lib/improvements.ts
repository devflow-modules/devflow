import type { ChecklistId, ChecklistState, SessionRecord } from "./types";
import { CHECKLIST_ITEMS } from "./types";

export function buildImprovementBullets(session: SessionRecord, problemTitle: string): string[] {
  const out: string[] = [];

  if (session.passedTests < session.totalTests) {
    out.push("Revisit failing tests: trace inputs, edge cases, and invariants before changing the core idea.");
  }

  const unchecked = CHECKLIST_ITEMS.filter((item) => !session.checklist[item.id]).map((i) => i.label);
  if (unchecked.length > 0) {
    out.push(`Interview checklist gaps: ${unchecked.join("; ")}.`);
  }

  if (session.passedTests === session.totalTests && unchecked.length === 0) {
    out.push("Strong run: next time, narrate trade-offs and alternative approaches out loud for 60 seconds.");
  }

  if (session.elapsedTimeSec < 8 * 60) {
    out.push("Session ended early — consider staying in the chair for the full 25 minutes to build stamina.");
  }

  if (out.length === 0) {
    out.push(`Keep drilling "${problemTitle}" with a fresh variant or a harder constraint.`);
  }

  return out;
}

export function checklistSummary(state: ChecklistState): { id: ChecklistId; done: boolean; label: string }[] {
  return CHECKLIST_ITEMS.map((item) => ({
    id: item.id,
    label: item.label,
    done: state[item.id],
  }));
}
