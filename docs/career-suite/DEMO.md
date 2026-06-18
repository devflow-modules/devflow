# Career Suite — Agent layer demo

Client-safe visual walkthrough of the agent/automation boundaries (PRs #114–#118). All captures
use **demo/sandbox data only** — no real names, emails, tokens, secrets, provider raw payloads,
DevTools panels, or sensitive IDs.

**Architecture:** [`ARCHITECTURE.md`](./ARCHITECTURE.md) · **Index:** [`README.md`](./README.md) ·
**Asset checklist + PII review:** [`assets/README.md`](./assets/README.md)

> The Career panels are **feature-flagged and off by default**. They render in the dashboard only
> after the explicit provider-consent checkbox is checked. Each panel produces **proposals and
> structured content for manual review** — no tool runs, no mutation, no persistence.

---

## How to reproduce locally

```bash
pnpm install
pnpm --filter @devflow/career-core build
pnpm --filter @devflow/career-sync build
pnpm --filter applyflow dev          # http://localhost:3010/dashboard
```

1. Open `/dashboard` → **Carregar demo** (loads ~20 fictitious applications).
2. Check the explicit provider-consent checkbox to reveal the Career panels.
3. Interact with each panel below — every action stays in-memory and review-required.

---

## 1. Career Chat (LibreChat adapter — PR #116)

Structured chat messages are converted into **deterministic** career agent requests. No tool runs
and no application/message/profile/provider/external system is changed without policy validation
and human approval.

### Completed workspace

A chat message (`action` + free text) is normalized into an orchestration request and returns a
client-safe agent response with **tool proposals** — each one `ready_for_review`, never executed.

![Career Chat — completed workspace with agent response and tool proposals](./assets/09-career-chat-workspace-completed.png)

### Tool proposals

Proposals expose `toolName`, status, and risk only. The **Proposal review** card shows a read-only
`input preview` and the human gate: **Approve once**, **Cancel**, **Copy structured response**.

![Career Chat — tool proposals and proposal review gate](./assets/10-career-chat-tool-proposals.png)

### Blocked by feature flag

When the adapter is disabled, the request is **blocked deterministically**: the trace records
`chat_request_received` → `human_review_required: Adapter is disabled by feature flag`. Deny by
default, with a stable, client-safe explanation.

![Career Chat — blocked by disabled feature flag with execution trace](./assets/11-career-chat-blocked.png)

### Mobile

Responsive layout with no overflow; the same read-only / in-memory / manual-review guarantees
(`Read-only`, `Ephemeral`, `No automatic changes`) are visible on small viewports.

![Career Chat — mobile responsive layout](./assets/12-career-chat-mobile.png)

---

## 2. Career AI Draft (controlled LLM — PR #117)

The LLM produces **structured content inside a known schema** for an agent/task the server already
resolved. It does not choose intent, agent, capabilities, tools, risk, approval, or execution mode.
Default provider is the deterministic **mock** (no network, no cost).

| | Capture |
|--|---------|
| Completed draft (structured output + trace) | ![Career AI Draft — completed](./assets/13-career-ai-draft-completed.png) |
| Tablet | ![Career AI Draft — tablet](./assets/14-career-ai-draft-tablet.png) |
| Mobile | ![Career AI Draft — mobile](./assets/15-career-ai-draft-mobile.png) |

The output is client-safe content for review and copy only — it carries no executable tool calls
and is never auto-applied.

---

## 3. Approved Automation Review (approved automation — PR #118)

Runs **exactly one** allowlisted, non-destructive tool, and only after an explicit, request-scoped
approval. No auto-apply, no send, no submit, no scheduling, no background execution, no persistence.
Prohibited actions are not even rendered.

| | Capture |
|--|---------|
| Completed run (proposal → approval → single execution → trace) | ![Approved Automation Review — completed](./assets/16-approved-automation-completed.png) |
| Tablet | ![Approved Automation Review — tablet](./assets/17-approved-automation-tablet.png) |
| Mobile | ![Approved Automation Review — mobile](./assets/18-approved-automation-mobile.png) |

The panel surfaces the server-derived proposal, the `single_execution` approval, the provider
badge, and the execution trace. Status flags confirm the guarantees (e.g. scheduled `false`,
persisted `false`, executed-externally `false`). A new run always requires a new approval.

---

## What the demo proves

- **Deterministic-first** — same input → same plan/proposal across chat, LLM, and automation.
- **Server-authoritative** — the client never sets tool, capability, risk, plan, or approval.
- **Human-in-the-loop** — every panel is review-required; automation needs an explicit approval.
- **No auto-apply / no silent persistence** — outputs are proposals/content; nothing is saved.
- **Temporary approvals** — request-scoped, revocable, never remembered.
- **LLM without authority** — structured content only, no decisions, mock by default.
- **Automation without permanent autonomy** — one tool run, then stop; no schedule/background.

---

## Capture notes

- Viewport desktop 1024–1440 wide; tablet/mobile per panel.
- PNG · Chromium headless (Playwright) · demo data only.
- Manual PII review per [`assets/README.md`](./assets/README.md): no tokens, secrets, personal
  data, DevTools, or sensitive IDs in any committed capture.
