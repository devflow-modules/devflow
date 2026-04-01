# Prompt Templates

Reusable structures for ChatGPT planning and Cursor execution. Copy a section, fill placeholders, remove unused parts.

Convention: `{{PLACEHOLDER}}` = replace; `[optional]` = include when relevant.

---

## FEATURE

### Task definition

```
Implement: {{ONE_SENTENCE_FEATURE_GOAL}}
Product / app: {{e.g. root Next, whatsapp-platform, financeiro, RPA}}
Priority: {{P0|P1|P2}}
```

### Context

```
- Current behavior: {{what exists today}}
- User / system trigger: {{who or what initiates the flow}}
- Related paths / modules: {{paths or "discover in repo"}}
- Prior art: {{links to similar code or PRs}}
```

### Requirements

```
1. {{functional requirement 1}}
2. {{functional requirement 2}}
3. Non-goals: {{what is explicitly out of scope}}
```

### Constraints

```
- Must not change: {{API contracts | DB schema | env names}} unless listed below
- May change: {{explicit exceptions}}
- Auth / tenancy: {{rules}}
- Performance: {{latency, payload limits}}
- Compliance: {{PII, retention}}
```

### Output format (for Cursor)

```
- Deliver: {{files or areas to touch}}
- Tests: {{unit | integration | e2e | none with justification}}
- Observability: {{logs, metrics}}
- Rollout: {{flag, migration order}}
```

---

## BUGFIX

### Task definition

```
Fix: {{SYMPTOM_IN_ONE_LINE}}
Severity: {{S0|S1|S2|S3}}
Regression: {{yes/no; since when}}
```

### Context

```
- Expected behavior: {{}}
- Actual behavior: {{}}
- Reproduction: {{steps or "intermittent — see logs"}}
- Environment: {{prod|staging|local; browser if UI}}
- Suspected area: {{module/route}} or "unknown — investigate"
```

### Requirements

```
1. Root cause identified or hypothesis with verification steps
2. Fix minimal to root cause; no unrelated edits
3. Add regression test if feasible
```

### Constraints

```
- Do not refactor surrounding code unless required for the fix
- Preserve public contracts unless bug is contract-defined
```

### Output format

```
- Summary of root cause (1–3 sentences)
- Files changed (list)
- Test evidence: {{command output or scenario}}
```

---

## REFACTOR

### Task definition

```
Refactor: {{SCOPE}} for {{GOAL e.g. readability, dedup, perf}}
Risk level: {{low|medium|high}}
```

### Context

```
- Code under refactor: {{paths}}
- Callers to preserve: {{list or "all usages of X"}}
- Metrics / baseline: {{optional: bundle size, query count}}
```

### Requirements

```
1. Behavior parity: {{how verified — tests, diff checklist}}
2. No change to external API unless explicitly listed
3. Migration path for any renamed exports
```

### Constraints

```
- Maximum blast radius: {{packages/apps}}
- Forbidden: {{e.g. new runtime deps}}
```

### Output format

```
- Before/after summary (bullet)
- Test commands run
- Follow-up tickets if any deferred cleanup
```

---

## INFRA

### Task definition

```
Infra change: {{e.g. CI job, Dockerfile, Vercel, env wiring}}
Environment: {{dev|staging|prod|all}}
```

### Context

```
- Current setup: {{}}
- Desired end state: {{}}
- Secrets: {{where they live; never paste values}}
- Downtime tolerance: {{yes/no}}
```

### Requirements

```
1. Idempotent steps; documented rollback
2. Secrets via {{secret manager / env}} only
3. Monitoring / alerts if production-affecting
```

### Constraints

```
- No secrets in repo
- Align with existing Terraform / Vercel / GitHub Actions patterns
```

### Output format

```
- Change list (files + platform settings)
- Verification steps
- Rollback procedure
```

---

## Validation Prompt Template (ChatGPT Review)

Use after Cursor implementation, pasting or summarizing the diff.

```
You are reviewing a DevFlow change against acceptance criteria.

## Original task
{{paste TASK DEFINITION + REQUIREMENTS}}

## Implementation summary (human or Cursor)
{{paths touched, behavior change}}

## Diff summary or key snippets
{{paste or describe}}

## Acceptance criteria to verify
{{paste from task or ACCEPTANCE_CRITERIA.md domain section}}

## Instructions
1. List PASS / FAIL / NEEDS INFO per criterion.
2. For each FAIL: specific gap, suggested fix, severity (blocker vs follow-up).
3. Security: secrets, authz, injection, tenant isolation.
4. Tests: adequacy for risk; name missing cases.
5. One paragraph: merge recommendation (yes / yes with nits / no).

Output in structured markdown with headings.
```

---

*Templates are versioned with the repo; extend with product-specific appendices if needed.*
