/** Curated excerpt — W3C WAI / WCAG evaluation guidance. Version pinned for auditability. */
export const W3C_WAI_EVALUATION_SOURCE = {
  id: "w3c-wai-evaluation",
  version: "2026-06-22",
  title: "W3C Web Accessibility Initiative — involving users in evaluation",
  url: "https://www.w3.org/WAI/test-evaluate/preliminary/",
  principles: [
    "Involve people with diverse abilities and contexts in evaluation.",
    "Automated tests alone cannot reveal all usability or accessibility barriers.",
    "Combine expert review with task-based sessions where possible.",
    "Document observations with enough context for reproducible follow-up.",
  ],
  evaluationReminders: [
    "Note keyboard, screen reader and cognitive load issues as observable friction.",
    "Do not infer comprehension from silence — ask neutral follow-ups.",
  ],
} as const;

export const WCAG_REFERENCE_SOURCE = {
  id: "wcag-2-2-reference",
  version: "WCAG 2.2",
  title: "Web Content Accessibility Guidelines (WCAG) 2.2",
  url: "https://www.w3.org/TR/WCAG22/",
  principles: [
    "Perceivable — information and UI components must be presentable to users.",
    "Operable — UI components and navigation must be operable.",
    "Understandable — information and operation must be understandable.",
    "Robust — content must be robust enough for assistive technologies.",
  ],
} as const;
