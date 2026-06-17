# Nango Sandbox Runtime Validation Runbook

**Purpose:** Operate a **sandbox-only** validation of Gmail and Google Calendar provider runtime through ApplyFlow + Nango — without production credentials, personal accounts, or domain contract changes.

**Related:** [REAL-PROVIDER-RUNTIME-READINESS-CHECKLIST.md](./REAL-PROVIDER-RUNTIME-READINESS-CHECKLIST.md) · [PROVIDER-RUNTIME-FEATURE-FLAGS.md](./PROVIDER-RUNTIME-FEATURE-FLAGS.md) · [PROVIDER-RUNTIME-ENV-SECRETS-BOUNDARY.md](./PROVIDER-RUNTIME-ENV-SECRETS-BOUNDARY.md)

**Status:** Static readiness + local preflight **verified in code** (2026-06-16). **Runtime sandbox validation not executed** in this document — requires external Nango sandbox + dedicated Google test account.

---

## 1. Objective

Validate that:

1. OAuth/connect flows work with a **dedicated sandbox Google account**
2. Gmail metadata and Calendar events are fetched **server-side only** via Nango
3. Only **client-safe derived signals** reach the browser
4. Manual review, proposal, and export lifecycle remain **read-only** (ADR-002/003)
5. Disconnect and revocation procedures are exercisable

---

## 2. Prerequisites

| Requirement | Notes |
|-------------|-------|
| Dedicated Google test account | Naming convention: `devflow.career.sandbox@...` — **do not document the real address publicly** |
| Google Cloud test project | Separate from production; OAuth consent screen in Testing mode |
| Nango sandbox/test environment | Separate from production integrations |
| Provider configs | `google-mail`, `google-calendar` (code-defined integration IDs) |
| Local redirect URLs | ApplyFlow dev `http://localhost:3010` |
| Synthetic dataset | See §4 — no real inbox/calendar history |
| Technical owner | Single responsible engineer per validation window |
| Test window | Time-boxed; flags return to off after session |

**Local preflight (no network):**

```bash
pnpm check:career-provider-runtime
```

---

## 3. Prohibitions

- Do **not** use personal Gmail or Calendar
- Do **not** use client or employer accounts
- Do **not** import real email/calendar history for screenshots
- Do **not** commit `.env`, `.env.local`, or secrets
- Do **not** capture tokens, OAuth codes, or connection IDs in screenshots/logs
- Do **not** enable background sync, Apply, Save, or proposal import
- Do **not** call Nango/Google from CI or this preflight script

---

## 4. Synthetic dataset

Create **before** connecting Nango:

### Gmail (5–10 messages)

| Field | Policy |
|-------|--------|
| Companies | Fictitious only (e.g. Acme SaaS Brasil (demo)) |
| Subjects | Application-stage hints (screening, follow-up, interview invite) |
| Bodies | Short synthetic text; no attachments |
| Contacts | No real people; use `noreply+demo@example.invalid` |

### Calendar (3–5 events)

| Field | Policy |
|-------|--------|
| Titles | Fictitious interview blocks |
| Descriptions | Synthetic; no Meet links |
| Attendees | None or `demo@example.invalid` only |
| Times | Future fictional slots |

---

## 5. Nango configuration (placeholders)

Document in Nango dashboard — **do not fill real values in this repo:**

| Setting | Value pattern |
|---------|---------------|
| Environment | `sandbox` / `test` |
| Gmail integration ID | `google-mail` (must match `NANGO_INTEGRATION_BY_PROVIDER.gmail`) |
| Calendar integration ID | `google-calendar` |
| Callback URLs | `http://localhost:3010/...` (confirm in Nango Connect settings) |
| Scopes | `gmail.metadata.read`, `calendar.events.read` |
| Test connection naming | `devflow-career-sandbox-{gmail\|calendar}-{date}` |
| Disconnect | Nango dashboard + ApplyFlow UI revoke path |
| Secret rotation | Rotate in Nango; update local `.env.local` only; never commit |

**Google OAuth (future / Nango-managed):** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` are documented in [PROVIDER-RUNTIME-ENV-SECRETS-BOUNDARY.md](./PROVIDER-RUNTIME-ENV-SECRETS-BOUNDARY.md) but **not read by ApplyFlow code today**.

---

## 6. Environment matrix (canonical)

| Variable | Required? | Scope | Example (safe) | Secret? | Used by | Failure behavior |
|----------|-----------|-------|----------------|---------|---------|------------------|
| `CAREER_PROVIDER_RUNTIME_ENABLED` | No (default-off) | Server | `true` | No | Connect, verification, derived-preview boundaries | Missing → disabled |
| `NANGO_RUNTIME_ENABLED` | No | Server | `true` | No | Same | Missing → Nango blocked |
| `GMAIL_PROVIDER_ENABLED` | No | Server | `true` | No | Gmail runtime | Missing → Gmail blocked |
| `CALENDAR_PROVIDER_ENABLED` | No | Server | `true` | No | Calendar runtime | Missing → Calendar blocked |
| `NANGO_SECRET_KEY` | Yes when runtime on | Server | `replace_me` | **Yes** | `@nangohq/node` in server providers | Missing → `nango_secret_missing`, OAuth blocked |

**Not in code (documented only):** `NANGO_WEBHOOK_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`

**Provider config keys (code, not env):**

| Provider | Nango integration ID | End-user tag |
|----------|---------------------|--------------|
| gmail | `google-mail` | `applyflow-gmail-runtime-boundary` |
| calendar | `google-calendar` | `applyflow-calendar-runtime-boundary` |

Copy template: [`apps/applyflow/.env.example`](../../../apps/applyflow/.env.example)

---

## 7. Feature flags

| Flag | Default | Visibility | Effect |
|------|---------|------------|--------|
| `CAREER_PROVIDER_RUNTIME_ENABLED` | off | Server | Global kill switch |
| `NANGO_RUNTIME_ENABLED` | off | Server | Requires global |
| `GMAIL_PROVIDER_ENABLED` | off | Server | Requires global + Nango |
| `CALENDAR_PROVIDER_ENABLED` | off | Server | Requires global + Nango |

**Hierarchy:** provider flags cannot bypass global or Nango gates.  
**Failure mode:** fail closed — blocked JSON with `safeForClient: true`.  
**Preflight:** `pnpm check:career-provider-runtime` validates hierarchy without network.

---

## 8. Minimum scopes

| Provider | Scope | Purpose | Data accessible | Required? | Risk | Decision |
|----------|-------|---------|-----------------|-----------|------|----------|
| Gmail | `gmail.metadata.read` | List messages + metadata headers | From/To/Date headers, message IDs server-side | **required** | Medium — no body with metadata format | **required** — matches `GMAIL_MESSAGE_METADATA_FORMAT` |
| Calendar | `calendar.events.read` | List primary calendar events | Start/end, status, attendees, conferenceData fields requested | **required** | Medium — fields trimmed in adapter | **required** — see adapter field mask |

**Candidate for removal:** none identified in code — do not expand scopes in sandbox PRs.

**Conflict watch:** Nango dashboard scopes must match `PROVIDER_SCOPES` in `nango-connect-session-launcher.ts`.

---

## 9. Activation sequence

```txt
pnpm check:career-provider-runtime          # no env → ready, all disabled
→ copy apps/applyflow/.env.example → .env.local
→ set flags + NANGO_SECRET_KEY (sandbox only, local file)
→ pnpm check:career-provider-runtime          # should pass when coherent
→ pnpm --filter applyflow dev               # :3010
→ enable explicit consent in UI
→ connect Gmail ONLY (one provider)
→ POST /provider-runtime/nango/connection-status
→ POST /provider-runtime/nango/derived-preview (limits low)
→ inspect client-safe signals + manual review UI
→ POST /provider-runtime/nango/disconnect (explicit confirmation; per provider)
→ optional Google Account third-party revocation (manual; not performed by disconnect endpoint)
→ repeat for Calendar separately
→ clear .env.local flags (return to default-off)
```

---

## 10. Capability matrix (static assessment)

| Capability | Status | Evidence | Required config | Security impact | Sandbox blocker |
|------------|--------|----------|-----------------|-----------------|-----------------|
| Nango SDK initialization | **implemented** | `nango-server-provider.ts` | `NANGO_SECRET_KEY` | High if leaked | External sandbox secret |
| Server secret handling | **implemented** | Server-only imports | `NANGO_SECRET_KEY` | Critical | None (code) |
| Public key handling | **not found** | No `NANGO_PUBLIC_KEY` in code | — | — | N/A |
| Connect session | **implemented** | `GET /provider-runtime/nango/connect` | Flags + secret + consent | Medium | Sandbox credentials |
| Gmail connection | **partially implemented** | Gmail nango provider + adapter | Gmail flags + secret | High | Sandbox account |
| Calendar connection | **partially implemented** | Calendar nango provider | Calendar flags + secret | High | Sandbox account |
| Connection lookup | **implemented** | `listConnections` verification | Secret + tags | Medium | Sandbox |
| Metadata retrieval | **implemented** | Gmail/Calendar providers | Connected account | High | Sandbox data |
| Signal derivation | **implemented** | Normalizers + classifiers | Preview route | Medium | — |
| Client-safe response | **implemented** | Boundary + forbidden key guards | — | Critical | — |
| Manual review UI | **implemented** | `ProviderDerivedRuntimeReviewPanel` | In-memory preview | Low | Screenshots need runtime |
| Disconnect | **implemented** | `POST /provider-runtime/nango/disconnect` + consent UI | Flags + secret + `Connections: delete` on API key | Medium | Sandbox key permission |
| Revocation | **documented only** | Google Account third-party access (manual) | Google account | Medium | Manual |
| Expired connection | **partially implemented** | Verification `error` state | — | Low | Needs sandbox test |
| Rate-limit handling | **not found** | No explicit handler | — | — | Document as gap |
| Timeout handling | **not found** | Implicit fetch failures | — | — | Document as gap |
| Retry handling | **not found** | — | — | — | Document as gap |
| Logging redaction | **documented only** | No runtime logs in code | — | Low | No structured logs |
| Test fixture | **implemented** | `career-sync` sandbox fixtures | — | Low | — |
| Integration test | **partially implemented** | Vitest boundaries, no live Nango | — | — | — |
| Sandbox account | **blocked** | Requires human provisioning | External | — | **Yes** |

---

## 11. Sandbox account model

| Field | Policy |
|-------|--------|
| Owner | DevFlow engineer running validation |
| Naming | `devflow.career.sandbox@<domain>` (create externally; never commit address) |
| Recovery | Account recovery email to team vault — not in repo |
| MFA | Required on Google test account |
| Data reset | Delete synthetic messages/events after each run |
| Connection reset | Disconnect in Nango + Google third-party access |
| Secret rotation | Nango secret rotated in dashboard; update `.env.local` only |
| Access revocation | Remove test users from Google Cloud OAuth consent test users |

---

## 12. Logging and redaction

**Inspection result (2026-06-16):** No `console.*` / structured logger in `apps/applyflow/src/lib/provider-runtime/` or provider paths in `career-sync`.

| Log location | Fields emitted | Safe? | Redaction | Action |
|--------------|----------------|-------|-----------|--------|
| Provider runtime routes | None (silent catch → safe JSON) | Yes | N/A | Add structured safe logging in future PR |
| Nango server provider | None | Yes | N/A | — |
| Client fetch helpers | None | Yes | N/A | — |

**Must never log:** access/refresh tokens, OAuth codes, raw bodies, descriptions, attendee emails, full connection payloads, `Authorization` headers, `NANGO_SECRET_KEY`.

**Critical blocker if violated:** secret or token in browser bundle — see §13.

---

## 13. Safe failure model

| State | Server behavior | Client behavior | Logs | Retry? | User action |
|-------|-----------------|-----------------|------|--------|-------------|
| Configuration missing | `blocked`, reason `nango_secret_missing` | Safe JSON, no OAuth | None | No | Set server env locally |
| Runtime disabled | `blocked`, flag warnings | Consent UI readonly / disabled | None | No | Enable flags locally |
| Provider disabled | Provider-specific block | Connect disabled | None | No | Enable provider flag |
| Connection missing | `not_connected` verification | Status panel warning | None | No | Run Connect flow |
| Connection expired | `error` verification state | Warning text | None | No | Reconnect |
| Provider unauthorized | Safe error result | No raw payload | None | No | Re-consent |
| Rate limited | **not found** — upstream error path | Generic error | None | Unknown | Retry later |
| Timeout | **not found** | `error` status on preview | None | No | Retry |
| Upstream unavailable | Preview `error` 500 safe body | Message only | None | No | Retry |
| Invalid response | Blocked parse errors | 400 safe JSON | None | No | Fix request |
| Redaction failure | Adapter should drop fields | Must not render raw | None | No | File bug |

**Client must not receive:** stack traces, provider raw, secrets, tokens, internal connection IDs.

---

## 14. Approval criteria (sandbox run)

- [ ] Tokens remain server-side only
- [ ] No provider raw in browser DevTools responses
- [ ] No sensitive values in terminal logs
- [ ] Only documented minimum scopes granted
- [ ] Client-safe signals generated
- [ ] Manual review required before proposal
- [ ] Disconnect works in Nango
- [ ] Google third-party access revocation tested
- [ ] Feature flags returned to off after session

---

## 15. Blocking criteria (abort sandbox)

- Secret reaches browser bundle or Network tab
- Raw email body or calendar description in UI
- Token appears in logs or screenshots
- Scope exceeds `gmail.metadata.read` / `calendar.events.read` without ADR
- Disconnect unavailable
- Provider error returns unsanitized payload
- Test requires personal Google account

---

## 16. Current blockers

| ID | Severity | Description | Evidence | Required action | Owner | Blocks Gmail? | Blocks Calendar? |
|----|----------|-------------|----------|-----------------|-------|---------------|------------------|
| B-001 | **high** | No dedicated sandbox Google account provisioned in repo | Account model §11 | Create `devflow.career.sandbox@...` + GCP test project | Human ops | Yes | Yes |
| B-002 | **high** | Nango sandbox secret not in repo (by design) | `NANGO_SECRET_KEY` server-only | Configure Nango test env + local `.env.local` | Human ops | Yes | Yes |
| B-003 | **medium** | Provider-derived screenshots 02–04 blocked | `docs/career-suite/assets/README.md` | Complete sandbox run + capture | Docs/engineering | Yes | Yes |
| B-004 | **medium** | `nango-connect-session-launcher.ts` shares module with client type imports | ApplyFlow dashboard clients | Split types to dedicated file (future PR) | Engineering | No | No |
| B-005 | **low** | No structured runtime logging / rate-limit handling | Code search | Add safe observability PR | Engineering | No | No |

**No critical code blocker** prevents starting sandbox prep — external credentials are the gating item.

---

## 17. Server routes reference

| Method | Path |
|--------|------|
| GET | `/provider-runtime/nango/connect` |
| POST | `/provider-runtime/nango/connection-status` |
| POST | `/provider-runtime/nango/disconnect` |
| POST | `/provider-runtime/nango/derived-preview` |

**Disconnect API key permission:** the dedicated sandbox key (`applyflow-career-sandbox-local`) must include **Connections → delete** in addition to list/read. Do not grant `with_credentials`, admin, deploy, syncs, records, or MCP. If delete is missing, the endpoint returns a safe blocked response (`nango_connection_delete_failed`) — treat as an operational blocker, not a reason to enable Full access.

**Google revocation:** `POST /disconnect` removes the Nango connection used by ApplyFlow only. Revoking OAuth in Google Account → Security → Third-party connections remains a separate manual step.

---

## 18. Non-goals (this runbook)

- No live OAuth in CI
- No Gmail/Calendar fetch in unit tests
- No Nango network calls in preflight
- No provider contract changes
- No Apply / Save / import / mutation
- ADR-002/003 remain deferred

---

## 19. Next runtime step

1. Provision sandbox Google account + Nango test environment  
2. Run §9 activation sequence locally  
3. Capture provider-derived screenshots 02–04 with synthetic data only  
4. File follow-up PR for rate-limit/timeout handling if observed
