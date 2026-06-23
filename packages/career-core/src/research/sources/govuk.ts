/** Curated excerpt — GOV.UK Service Manual (moderated usability testing). Version pinned for auditability. */
export const GOVUK_MODERATED_USABILITY_SOURCE = {
  id: "govuk-moderated-usability",
  version: "2026-06-22",
  title: "GOV.UK Service Manual — Using moderated usability testing",
  url: "https://www.gov.uk/service-manual/user-research/using-moderated-usability-testing",
  principles: [
    "Observe real users performing specific tasks in a controlled session.",
    "Use moderated testing in alpha, beta and live to uncover issues automated checks miss.",
    "Let participants attempt tasks with minimal guidance; intervene only when necessary.",
    "Separate what happened from why it might have happened.",
    "Do not lead participants to the 'correct' answer or click target.",
  ],
  moderatorGuidance: [
    "Ask open questions about expectations and intent.",
    "Encourage thinking aloud without coaching the interface.",
    "Record observable behaviour, not assumptions about ability.",
  ],
} as const;
