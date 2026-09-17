import { describe, expect, it } from "vitest";

import { splitRequiredPreferredSkills } from "../copilot-job-match.js";
import { evaluateJobDecisionV2 } from "../evaluate-job-decision-v2.js";
import { extractJobRequirements } from "../extract-job-requirements.js";
import { extractJobIntelligence } from "../job-intelligence.js";
import { TEMPO_ORIGINAL_DESCRIPTION } from "./dog-001-tempo-requirements.test.js";

function skillsOf(text: string) {
  return extractJobIntelligence(text).detectedSkills;
}

function req(text: string, pattern: RegExp) {
  return extractJobRequirements(text).find(
    (item) => pattern.test(item.label) || pattern.test(item.skillHint ?? "") || pattern.test(item.extractedText ?? ""),
  );
}

describe("DOG-001 — alcance de preferred/required", () => {
  it("na Tempo original, preferred entre parênteses não rebaixa Edge Functions", () => {
    const split = splitRequiredPreferredSkills(TEMPO_ORIGINAL_DESCRIPTION, skillsOf(TEMPO_ORIGINAL_DESCRIPTION));
    expect(split.preferred).not.toEqual(expect.arrayContaining(["Supabase Edge Functions"]));
    expect(split.required).toEqual(expect.arrayContaining(["Supabase Edge Functions"]));
    expect(split.knockout).not.toEqual(expect.arrayContaining(["Supabase Edge Functions"]));

    const years = req(TEMPO_ORIGINAL_DESCRIPTION, /full-stack experience/i);
    expect(years?.minYears).toBe(2);
    expect(years?.importance).not.toBe("nice_to_have");
    expect(years?.mandatory).not.toBe(true);

    const edge = req(TEMPO_ORIGINAL_DESCRIPTION, /edge function/i);
    expect(edge?.importance).toBe("important");
    expect(edge?.mandatory).toBeFalsy();
    expect(edge?.importance).not.toBe("nice_to_have");
  });

  it("preferência entre parênteses fica no item de experiência e não no item seguinte", () => {
    const text = `Qualifications
- 2+ years experience as a full-stack developer (startup/product experience preferred).
- Working experience with Supabase Edge Functions.
- Fluent in English`;
    const split = splitRequiredPreferredSkills(text, skillsOf(text));
    expect(split.required).toEqual(expect.arrayContaining(["Supabase Edge Functions"]));
    expect(split.preferred).not.toContain("Supabase Edge Functions");
    expect(req(text, /full-stack/i)?.minYears).toBe(2);
    expect(req(text, /edge function/i)?.importance).toBe("important");
  });

  it("trocar a ordem dos itens não muda a classificação", () => {
    const a = `Qualifications
- 2+ years experience as a full-stack developer (startup/product experience preferred).
- Working experience with Supabase Edge Functions.`;
    const b = `Qualifications
- Working experience with Supabase Edge Functions.
- 2+ years experience as a full-stack developer (startup/product experience preferred).`;
    const splitA = splitRequiredPreferredSkills(a, skillsOf(a));
    const splitB = splitRequiredPreferredSkills(b, skillsOf(b));
    expect(splitA.required.sort()).toEqual(splitB.required.sort());
    expect(splitA.preferred.sort()).toEqual(splitB.preferred.sort());
    expect(req(a, /edge function/i)?.importance).toBe(req(b, /edge function/i)?.importance);
    expect(req(a, /edge function/i)?.mandatory).toBe(req(b, /edge function/i)?.mandatory);
  });

  it("Edge Functions preferred é diferencial; Edge Functions required é knockout", () => {
    const preferredText = `Qualifications
- React
- Supabase Edge Functions preferred`;
    const requiredText = `Qualifications
- React
- Supabase Edge Functions required`;
    const preferred = req(preferredText, /edge function/i);
    const required = req(requiredText, /edge function/i);
    expect(preferred?.importance).toBe("nice_to_have");
    expect(preferred?.mandatory).toBeFalsy();
    expect(required?.importance).toBe("fundamental");
    expect(required?.mandatory).toBe(true);

    const preferredSplit = splitRequiredPreferredSkills(preferredText, skillsOf(preferredText));
    const requiredSplit = splitRequiredPreferredSkills(requiredText, skillsOf(requiredText));
    expect(preferredSplit.preferred).toContain("Supabase Edge Functions");
    expect(requiredSplit.required).toContain("Supabase Edge Functions");
    expect(requiredSplit.knockout).toContain("Supabase Edge Functions");
  });

  it("requisito listado sem linguagem de knockout não vira mandatory", () => {
    const text = `Qualifications
- Working experience with Supabase Edge Functions
- Experience with React`;
    const edge = req(text, /edge function/i);
    expect(edge?.importance).toBe("important");
    expect(edge?.mandatory).toBeFalsy();
    const decision = evaluateJobDecisionV2({
      jobText: text,
      evidence: [],
      jobId: "job_listed_edge",
    });
    const edgeMatch = decision.matches.find((item) => /edge function/i.test(item.requirement.label));
    expect(edgeMatch?.status).toBe("unknown");
    expect(edgeMatch?.requirement.mandatory).toBeFalsy();
    const mandatoryGate = decision.gates.find((gate) => gate.type === "mandatory_skill");
    expect(mandatoryGate?.result).not.toBe("fail");
    expect(mandatoryGate?.reason).toMatch(/not confirmation|unconfirmed|listed/i);
  });

  it("Nice to have como cabeçalho de secção continua a separar Docker/Jest", () => {
    const text = `Requirements:
- React
- TypeScript
Nice to have:
- Docker
- Jest`;
    const split = splitRequiredPreferredSkills(text, skillsOf(text));
    expect(split.required).toEqual(expect.arrayContaining(["React", "TypeScript"]));
    expect(split.preferred).toEqual(expect.arrayContaining(["Docker", "Jest"]));
    expect(split.preferred).not.toContain("React");
  });
});
