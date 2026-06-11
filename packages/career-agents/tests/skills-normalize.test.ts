import { describe, expect, it } from "vitest";

import {
  dedupeSkills,
  extractKnownSkills,
  resolveCanonicalSkillName,
  toCareerSkill,
} from "../src/shared/normalize.js";
import { SKILL_CATEGORY_MAP } from "../src/shared/skills.js";

describe("skill aliases and categories", () => {
  it("maps aliases to canonical skill names", () => {
    expect(resolveCanonicalSkillName("nextjs")).toBe("Next.js");
    expect(resolveCanonicalSkillName("next js")).toBe("Next.js");
    expect(resolveCanonicalSkillName("nodejs")).toBe("Node.js");
    expect(resolveCanonicalSkillName("node")).toBe("Node.js");
    expect(resolveCanonicalSkillName("ts")).toBe("TypeScript");
    expect(resolveCanonicalSkillName("postgres")).toBe("PostgreSQL");
    expect(resolveCanonicalSkillName("tailwindcss")).toBe("Tailwind CSS");
    expect(resolveCanonicalSkillName("chakra")).toBe("Chakra UI");
    expect(resolveCanonicalSkillName("framer")).toBe("Framer Motion");
    expect(resolveCanonicalSkillName("gh actions")).toBe("GitHub Actions");
    expect(resolveCanonicalSkillName("oauth2")).toBe("OAuth");
  });

  it("extracts canonical skills from compound phrases", () => {
    const text = "Experience with REST API, GraphQL API, JWT auth and OAuth2 flows.";
    const skills = extractKnownSkills(text).map((s) => s.name);
    expect(skills).toEqual(expect.arrayContaining(["REST", "GraphQL", "JWT", "OAuth"]));
  });

  it("dedupes aliases to a single canonical skill", () => {
    const skills = dedupeSkills([
      toCareerSkill("nextjs"),
      toCareerSkill("Next.js"),
      toCareerSkill("next js"),
    ]);
    expect(skills).toHaveLength(1);
    expect(skills[0]?.name).toBe("Next.js");
  });

  it("assigns expected categories", () => {
    expect(SKILL_CATEGORY_MAP["React"]).toBe("frontend");
    expect(SKILL_CATEGORY_MAP["Node.js"]).toBe("backend");
    expect(SKILL_CATEGORY_MAP["Prisma"]).toBe("database");
    expect(SKILL_CATEGORY_MAP["Playwright"]).toBe("testing");
    expect(SKILL_CATEGORY_MAP["Docker"]).toBe("devops");
    expect(SKILL_CATEGORY_MAP["OpenAI"]).toBe("ai");
    expect(SKILL_CATEGORY_MAP["SaaS"]).toBe("product");
    expect(SKILL_CATEGORY_MAP["Liderança"]).toBe("soft-skill");
  });
});
