import { describe, expect, it } from "vitest";

import { technologyIdentities, textMentionsTechnology } from "../technology-identity.js";

describe("technology identity", () => {
  it("rejects substring collisions", () => {
    expect(textMentionsTechnology("JavaScript, React, TypeScript", "Java")).toBe(false);
    expect(textMentionsTechnology("Java", "JavaScript")).toBe(false);
    expect(textMentionsTechnology("Integração com ReceitaWS", "AWS")).toBe(false);
    expect(textMentionsTechnology("Node.js services", "Next.js")).toBe(false);
    expect(textMentionsTechnology("React components", "React Native")).toBe(false);
    expect(textMentionsTechnology("PostgreSQL", "SQL Server")).toBe(false);
    expect(textMentionsTechnology("Docker", "Kubernetes")).toBe(false);
    expect(textMentionsTechnology("ExpressVPN", "Express")).toBe(false);
    expect(technologyIdentities("ReceitaWS").has("aws")).toBe(false);
    expect(technologyIdentities("JavaScript").has("java")).toBe(false);
  });

  it("accepts explicit aliases and punctuated names", () => {
    expect(textMentionsTechnology("Amazon Web Services", "AWS")).toBe(true);
    expect(textMentionsTechnology("AWS", "Amazon Web Services")).toBe(true);
    expect(textMentionsTechnology("React.js", "React")).toBe(true);
    expect(textMentionsTechnology("NodeJS", "Node.js")).toBe(true);
    expect(textMentionsTechnology("Postgres", "PostgreSQL")).toBe(true);
    expect(textMentionsTechnology("NextJS", "Next.js")).toBe(true);
    expect(textMentionsTechnology("GitHub Actions", "GitHub Actions")).toBe(true);
    expect(textMentionsTechnology("C Sharp", "C#")).toBe(true);
    expect(textMentionsTechnology("dotnet", ".NET")).toBe(true);
    expect(textMentionsTechnology("REST API", "REST")).toBe(true);
    expect(textMentionsTechnology("C++", "C++")).toBe(true);
  });

  it("keeps token boundaries across case, punctuation and line breaks", () => {
    expect(textMentionsTechnology("JAVA; javascript\nAWS", "Java")).toBe(true);
    expect(textMentionsTechnology("JAVA; javascript\nAWS", "JavaScript")).toBe(true);
    expect(textMentionsTechnology("(React), TypeScript.", "React")).toBe(true);
    expect(textMentionsTechnology("aws", "AWS")).toBe(true);
    expect(textMentionsTechnology("", "AWS")).toBe(false);
    expect(textMentionsTechnology("AWS", "")).toBe(false);
    expect(textMentionsTechnology("Kafka streams", "Kafka")).toBe(true);
    expect(textMentionsTechnology("Kafkaesque novel", "Kafka")).toBe(false);
  });

  it("does not treat React Native as React", () => {
    expect(technologyIdentities("React Native").has("react")).toBe(false);
    expect(technologyIdentities("React Native").has("react-native")).toBe(true);
    expect(textMentionsTechnology("React Native", "React")).toBe(false);
  });
});
