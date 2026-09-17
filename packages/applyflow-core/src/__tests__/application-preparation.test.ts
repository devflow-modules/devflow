import { describe, expect, it } from "vitest";

import { prepareApplication, prepareField } from "../application-preparation.js";
import { gustavoProfile } from "../candidate-profile.js";
import { EMPTY_ANSWER_BANK, validateCandidateProfile } from "../profile-schema.js";

const JOB = `Senior Full Stack Engineer
Remote

React, TypeScript, Node.js and PostgreSQL.
`;

describe("prepareField / prepareApplication", () => {
  it("8. fato conhecido → PreparedField ready", () => {
    const field = prepareField(
      {
        fieldId: "af_react",
        label: "How many years of experience do you have with React?",
        classificationType: "years_experience:react",
        classificationConfidence: "high",
      },
      gustavoProfile,
    );
    expect(field.suggestedValue).toBe("5");
    expect(field.source).toBe("candidate_fact");
    expect(field.confidence).toBe("high");
    expect(field.status).toBe("ready");
  });

  it("9. fato desconhecido → missing", () => {
    const field = prepareField(
      {
        fieldId: "af_unknown_q",
        label: "What is your hardest challenge leading a 200-person org?",
        classificationType: "cover_letter",
        classificationConfidence: "high",
      },
      validateCandidateProfile({
        ...gustavoProfile,
        answerBank: { ...EMPTY_ANSWER_BANK },
      }),
    );
    expect(field.suggestedValue).toBeUndefined();
    expect(field.status).toBe("missing");
    expect(field.source).toBe("unknown");
  });

  it("10. low confidence → needs_review", () => {
    const field = prepareField(
      {
        fieldId: "af_open",
        label: "Tell us about yourself",
        classificationType: "cover_letter",
        classificationConfidence: "low",
      },
      gustavoProfile,
    );
    expect(field.status).toBe("needs_review");
    expect(field.confidence).toBe("low");
    expect(field.suggestedValue).toBeTruthy();
  });

  it("11. safety gate bloqueado (submit/next) → blocked", () => {
    const submit = prepareField(
      {
        fieldId: "af_submit",
        label: "Submit application",
        classificationType: "submit",
        classificationConfidence: "high",
      },
      gustavoProfile,
    );
    const next = prepareField(
      {
        fieldId: "af_next",
        label: "Next",
        classificationType: "next",
        classificationConfidence: "high",
      },
      gustavoProfile,
    );
    expect(submit.status).toBe("blocked");
    expect(next.status).toBe("blocked");
    expect(submit.reason).toMatch(/Submit|Next|Continue/i);
  });

  it("classificação unknown sem valor → missing", () => {
    const field = prepareField(
      {
        fieldId: "af_unk",
        label: "Favorite color of your first manager?",
        classificationType: "unknown",
        classificationConfidence: "low",
      },
      gustavoProfile,
    );
    expect(field.status).toBe("missing");
  });

  it("prepareApplication agrega match, currículo e resumo de campos", () => {
    const prep = prepareApplication({
      profile: gustavoProfile,
      jobText: JOB,
      fields: [
        {
          fieldId: "1",
          label: "How many years of experience do you have with React?",
          classificationType: "years_experience:react",
          classificationConfidence: "high",
        },
        {
          fieldId: "2",
          label: "Submit",
          classificationType: "submit",
        },
        {
          fieldId: "3",
          label: "Tell us about yourself",
          classificationType: "cover_letter",
          classificationConfidence: "high",
        },
      ],
    });
    expect(prep.match.score).toBeGreaterThan(0);
    expect(prep.resume.track).toBeTruthy();
    expect(prep.summary.total).toBe(3);
    expect(prep.summary.ready).toBeGreaterThanOrEqual(1);
    expect(prep.summary.blocked).toBe(1);
    expect(prep.fields).toHaveLength(3);
  });
});
