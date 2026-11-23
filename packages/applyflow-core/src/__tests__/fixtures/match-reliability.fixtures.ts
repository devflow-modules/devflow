/**
 * Sanitized, paraphrased posting shapes observed during the ApplyFlow triage of
 * real opportunities. No candidate data, no private URLs, no verbatim postings.
 */

/** Header-only excerpt: page chrome + location + mojibake + source marker. */
export const FDE_PARTIAL_EXCERPT = [
  "page_title Back to jobs tags.new Forward Deployed Engineer (Client-Facing) | LATAM, Remote (US time zones)",
  "Remote - Latin America (Argentina, Colombia, Brazil, Mexico, Chile) Apply",
  "At Acme Devices, we\u00e2\u0080\u0099re helping IT teams equip remote and global teams with laptops and",
  "devices. Our SaaS platform simplifies hardware deployment in 100+ countries.",
  "",
  "[Fonte original: https://example.com/jobs/fde-1]",
].join("\n");

export const FDE_FULL = `Forward Deployed Engineer (Client-Facing)

About the Role
You work directly with our most important clients and build what they need on our platform: integrations, workflows and product features.
Nobody hands you tasks. You talk to the client, decide what is worth building, build it, ship it and check the impact with real numbers.

Required Skills & Experience
- Around 4+ years of building and shipping software that real users depend on. You work across the stack: web apps, APIs and integrations.
- You have led client calls yourself, scoped the work and pushed back when needed.
- You have decided what to build, not only how to build it.
- Fluent English, spoken and written.

Bonus Skills
- Integrations with identity or HR tools.

Location & Travel
This role is fully remote for candidates based in Latin America (for example Argentina, Colombia, Brazil, Mexico or Chile) who work during US business hours.`;

/** Company-scale money figure that is not compensation. */
export const NON_SALARY_MONEY = `Senior Software Engineer

What You'll Bring
- 7+ years of software engineering, with strong command of TypeScript across the full stack (Node.js backend, React frontend)
- Experience designing REST and/or GraphQL APIs with production ownership
- Solid experience with relational databases (PostgreSQL preferred)
- Cloud infrastructure experience (AWS preferred) and modern CI/CD practices

About Us
We help credit unions lend responsibly in an era where the average household grapples with over $155,000 in household debt.
This position is offered on a contractor basis. Remote Flexibility: work remotely from Brazil.`;

export const EXPLICIT_SALARY = `Senior Full Stack Engineer
Strong TypeScript, Node.js and React experience.
Location: Remote (Brazil) · Compensation: $78,000–$90,000 USD per year + equity.`;

/** Partner org chart mentions a manager; the role itself is Senior. */
export const PARTNER_MANAGER_MENTION_TITLE = "Senior Full-Stack Engineer (React/Next.js)";
export const PARTNER_MANAGER_MENTION = `RESPONSIBILITIES
- Design and build the architecture of the new headless front-end.
- Mentor the mid-level engineer and partner with the Core Web engineering manager.
QUALIFICATIONS
- 5+ Years Experience: Senior-level front-end ownership on production systems.
- React & Next.js, TypeScript and Node.js.
- 100% Remote Work from Latin America.`;

export const REMOTE_BRAZIL_SHAPES = [
  "Senior Software Engineer\nLocation: Remote, Brazil\nReact, TypeScript and PostgreSQL.",
  "Senior Software Engineer\nRemote \u2014 Brazil\nReact, TypeScript and PostgreSQL.",
  "Senior Software Engineer\nBrazil Remote\nReact, TypeScript and PostgreSQL.",
  "Senior Software Engineer\nLocation: Remote (Brazil)\nReact, TypeScript and PostgreSQL.",
  "Senior Software Engineer\nBased in any Brazilian city. Remote-first.\nReact, TypeScript and PostgreSQL.",
] as const;

export const REGION_ELIGIBLE_SHAPES = [
  "Senior Software Engineer\nRemote \u2014 LATAM\nReact, TypeScript and PostgreSQL.",
  "Senior Software Engineer\nLocation: Latin America (Remote)\nReact, TypeScript and PostgreSQL.",
  "Senior Software Engineer\nRemote - South America\nReact, TypeScript and PostgreSQL.",
] as const;

export const LATAM_EXCLUDING_BRAZIL = [
  "Senior Software Engineer\nRemote - LATAM (excluding Brazil)\nReact, TypeScript and PostgreSQL.",
  "Senior Software Engineer\nRemote across Latin America, except Brazil.\nReact, TypeScript and PostgreSQL.",
] as const;

export const WORLDWIDE_WITH_EXCLUSION =
  "Senior Software Engineer\nRemote worldwide, except Brazil and India.\nReact, TypeScript and PostgreSQL.";

/** Metadata says remote Brazil; the description requires a hybrid office elsewhere. */
export const CONTRADICTORY_HYBRID = {
  location: "Remote - Brazil",
  text: `Senior Software Engineer
This role is hybrid: three days per week in our Lisbon office.
React, TypeScript and PostgreSQL.`,
};

/** Metadata-only location: the description never names a country. */
export const METADATA_ONLY_BRAZIL = {
  location: "Remote, Brazil",
  text: "Senior Software Engineer\nReact, TypeScript and PostgreSQL. Remote-first team.",
};

export const SENIOR_TITLE = "Senior Software Engineer";
export const STAFF_TITLE = "Staff Product Engineer";
export const SENIORITY_BODY = `What we're looking for
- 5+ years of professional experience building customer-facing software.
- Strong TypeScript and React fundamentals, PostgreSQL and Node.js.
- Remote - Brazil.`;

export const MOJIBAKE = "We\u00e2\u0080\u0099re hiring in S\u00c3\u00a3o Paulo \u00e2\u0080\u0094 caf\u00c3\u00a9 \u00e2\u0080\u009cincluded\u00e2\u0080\u009d.";
export const MOJIBAKE_CP1252 = "We\u00e2\u20ac\u2122re hiring in S\u00c3\u00a3o Paulo.";
export const CLEAN_ACCENTED = "Vaga em São Paulo — café “incluído”. Ação, coração, Ã é válido aqui.";

/** Technical requirements the candidate has no evidence for (unknown, not gap). */
export const UNPROVEN_STACK = `Senior Backend Engineer
Requirements
- 5+ years of professional experience.
- Strong Elixir and Kubernetes experience.
- Remote - Brazil.`;
