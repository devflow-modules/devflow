import { describe, expect, it } from "vitest";

import { gustavoProfile } from "../candidate-profile.js";
import { recommendResumeTrack } from "../resume-track-router.js";

describe("recommendResumeTrack", () => {
  it("4. frontend → CV frontend", () => {
    const rec = recommendResumeTrack({
      profile: gustavoProfile,
      jobText: `Senior Frontend Engineer
Remote

We need a frontend specialist in React, TypeScript and CSS. No backend ownership.
`,
    });
    expect(rec.track).toBe("frontend");
    expect(rec.reasons.length).toBeGreaterThan(0);
  });

  it("5. React+Node → CV fullstack", () => {
    const rec = recommendResumeTrack({
      profile: gustavoProfile,
      jobText: `Full Stack Engineer
Remote · CLT

React + TypeScript on the frontend, Node.js APIs and PostgreSQL on the backend.
`,
    });
    expect(rec.track).toBe("fullstack");
    expect(rec.reasons.join(" ")).toMatch(/React|Node|PostgreSQL|API/i);
    expect(["high", "medium", "low"]).toContain(rec.confidence);
  });

  it("6. Product ownership → product_engineer", () => {
    const rec = recommendResumeTrack({
      profile: gustavoProfile,
      jobText: `Product Engineer
Remote SaaS

End-to-end ownership, product discovery, and shipping 0-to-1 SaaS features with React and Node.js.
`,
    });
    expect(rec.track).toBe("product_engineer");
    expect(rec.reasons.join(" ")).toMatch(/Ownership|SaaS|Produto|Discovery|End-to-end/i);
  });

  it("7. Python/RPA → automation_rpa", () => {
    const rec = recommendResumeTrack({
      profile: gustavoProfile,
      jobText: `Automation / RPA Engineer
Remote

Python + RPA + Selenium and Playwright to automate operational workflows.
`,
    });
    expect(rec.track).toBe("automation_rpa");
    expect(rec.reasons.join(" ")).toMatch(/Python|RPA|Selenium|Playwright|Automa/i);
  });

  it("ATS / formulário automatizado prefere ats_master quando o papel não é especialidade clara", () => {
    const rec = recommendResumeTrack({
      profile: gustavoProfile,
      jobText: `Software Engineer
Applicant tracking / ATS screening form. Easy Apply. Generic role, automated screening.
`,
    });
    expect(rec.track).toBe("ats_master");
  });

  it("é determinístico", () => {
    const job = "Full Stack Engineer. React, Node.js, PostgreSQL, APIs.";
    expect(recommendResumeTrack({ profile: gustavoProfile, jobText: job })).toEqual(
      recommendResumeTrack({ profile: gustavoProfile, jobText: job }),
    );
  });
});
