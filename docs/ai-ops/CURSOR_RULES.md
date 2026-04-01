# Cursor Execution Rules

Strict rules for AI-assisted coding in the DevFlow monorepo. Apply to every Cursor session that modifies source code.

---

## Architecture & Boundaries

- **Do not break architecture.** Respect app boundaries (`apps/*`), shared packages (`packages/*`), and documented module layouts (e.g. `controllers/`, `services/`, `schemas/` where they exist).
- **Do not change contracts without instruction.** Public APIs, webhook payloads, event shapes, Prisma models, and env var contracts change only when the task explicitly requires it; then update all consumers and document in the PR.
- **Follow repo patterns.** Match import style, folder layout, naming, and response helpers (`sendSuccess` / `sendError` or equivalents) used in the touched area.
- **No hallucinated dependencies.** Do not add packages, env vars, or services that are not in the task or already used in the codebase. If something is needed, state the gap and let a human approve.

---

## Abstractions & Modularity

- **Do not create unnecessary abstractions.** Prefer a clear function or small module over a new framework inside a feature.
- **Keep code modular.** Co-locate logic with its domain; avoid “god” utils that mix unrelated concerns.
- **Reuse and extend** existing helpers, validators, and types before adding parallel implementations.

---

## Code Quality Expectations

| Area | Expectation |
|------|-------------|
| **Types** | TypeScript strict; no `any` unless justified and localized. |
| **Validation** | Use Zod (or existing schema layer) for external input at boundaries. |
| **Errors** | Predictable messages for users; structured logging for operators (no secrets). |
| **Async** | Explicit error paths; avoid silent catches. |
| **Comments** | Only where non-obvious; no narrative essays. |

---

## Naming Conventions

- **Files:** kebab-case for routes/assets where the repo already uses it; otherwise follow adjacent files.
- **Components:** PascalCase for React components; hooks `use*`.
- **Functions:** verb-led (`getUser`, `validatePayload`, `buildRedirectUrl`).
- **Constants:** SCREAMING_SNAKE for true constants; avoid magic strings in hot paths—use enums or maps where the codebase does.
- **API routes:** Mirror existing REST or RPC naming; do not invent parallel `/api/v2` without approval.

---

## Error Handling Patterns

- At **API boundaries:** validate input → return consistent status codes and body shape → log server-side context without PII/secrets.
- At **integrations (Stripe, Supabase, WhatsApp, RPA):** distinguish retryable vs fatal; surface operator-relevant codes in logs.
- **Never** log tokens, passwords, full card data, or raw session cookies.

---

## Testing & Verification

- Run **targeted** tests for changed packages (`pnpm test`, app-specific scripts) before claiming completion.
- Add or update tests when behavior changes materially or regression risk is high.
- For UI, verify critical paths when the task touches user flows (manual or automated per product).

---

## Git & Scope

- **Minimal diff:** Every line should trace to the task.
- **Do not** reformat unrelated files or remove unrelated comments.
- **Do not** commit secrets, `.env` files, or local-only artifacts.

---

## Anti-Patterns (Hard No)

| Anti-pattern | Instead |
|----------------|---------|
| Refactor “while here” | Ticket or follow-up task |
| New global state without need | Local state or existing store pattern |
| Duplicate auth/billing logic | Central helpers |
| “Temporary” `console.log` in prod paths | Structured log or remove before merge |
| Ignoring failing tests | Fix or explicitly scope out with owner sign-off |

---

## Escalation

If the task conflicts with repo reality (missing module, wrong assumption), **stop**, summarize findings, and request human direction—do not invent structure.

---

*These rules complement product-specific READMEs and Cursor project rules under `.cursor/`.*
