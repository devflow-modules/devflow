# ApplyFlow — Local vs Account (data locality)

Corrected inventory of what is browser-local versus account-scoped (Persistence V2 / personal persistence).

**Nature:** static code audit. Production was **not** consulted.

**Local active mode:** real env flags were **not** verified — effective local mode remains **NÃO COMPROVADO** (only `.env.example` defaults were noted). Do not infer activation from Preview/CI.

**Do not** treat “table/route exists” as “cloud is active”, or “localStorage key exists” as “always local only”.

**Doc history:** the original audit was read-only and did not write this file. `DATA_LOCALITY.md` (plus index links in `README.md` / `PERSISTENCE_V2.md`) was added later as an explicit consolidation of that audit.

**Three refs (do not mix cells):** Checkout A (historical networking WIP origin) · Checkout B (PR #253 base) · Checkout C (integrated networking on B).

Related: [`PERSISTENCE_V2.md`](./PERSISTENCE_V2.md), [`PRIVACY_SECURITY.md`](./PRIVACY_SECURITY.md), [`ADR-PERSISTENCE_V2_LOCAL_AND_CLOUD.md`](./ADR-PERSISTENCE_V2_LOCAL_AND_CLOUD.md).

## States used in this doc

| State | Meaning |
| --- | --- |
| IMPLEMENTADO E CONECTADO | Code path exists and UI/extension call it |
| IMPLEMENTADO, MAS NÃO CONECTADO AO FLUXO | Storage/API exists but primary UI path does not use it |
| LOCAL | Canonical authority is the browser (or device) |
| PENDENTE DE ATIVAÇÃO | Code may be connected, but gates/migration/merge block shared use |
| NÃO COMPROVADO | Insufficient evidence in this audit |

## Audited versions

| Ref | Value |
| --- | --- |
| Repo | `devflow-modules/devflow` |
| Checkout A (historical) | branch `feat/whatsapp-client1-commercial-readiness` @ `0322e1633b6b603d503e1e2709d6f8b10ff8ca94` + networking WIP later preserved on `feat/applyflow-networking-outreach` @ `50889dea` |
| Checkout B (PR #253 base) | branch `feat/applyflow-account-persistence-v2`, SHA `a014072ede7d3dea4d56dccaab6b6c74bb232653` |
| Checkout C (integrated HEAD) | branch `feat/applyflow-networking-on-account-persistence`, committed tip `c9ca8f886e780028c3b6a754bf0b67c4c6aec706` (+ uncommitted validation fixes — not committed per closeout instructions) |
| PR #253 | OPEN, not merged into `main` (still head `a014072e`) |
| Ancestry | B **is** ancestor of C; B is **not** ancestor of A |
| Evidence classes | **Static** (code/diff) · **Unit/integration tests** (Vitest) · **Runtime browser** · **Shared activation / production** |
| Shared activation / production | Still **PENDENTE** / **NÃO COMPROVADO** |
| Local active mode (flags) | Dev server process override: `APPLYFLOW_PERSISTENCE_V2=true`, `APPLYFLOW_E2E=1`, `DATABASE_URL`/`DIRECT_URL` → `127.0.0.1:5434/applyflow`. `.env.local` remote default **not** used for writes. |
| Runtime browser (this closeout) | **Local + cloud_write** observados em `http://127.0.0.1:3010` com contas E2E sintéticas A/B (`af_e2e_session`, secret local-only). `v2_read_only` por `pilotEligible=false`. `v2_paused` coberto por testes de gate (`http-access.test`); browser paused exige flag de processo off (não reiniciado nesta passagem). |

Prior inventory that claimed “CV / contacts / extension never use cloud” described Checkout A, not the product as a whole while PR #253 remains open.

## Code vs activation

| Gate | Role |
| --- | --- |
| `APPLYFLOW_PERSISTENCE_V2` | Global flag (`.env.example` default `false`) |
| `pilotEligible` × `canonicalPersistence` | Per-account eligibility / authority |
| Resolver mode | `v2_active` (read+write), `v2_read_only`, offering / paused / v1 |

- **Checkout A:** personal APIs are absent → personal cloud cannot activate on this tree.
- **Checkout B:** code + migration `20261005170000_account_personal_persistence` exist; still needs flag + eligible account + `v2_active` / `cloud_write`.
- Preview/CI green on the PR is **not** production activation.
- On B with `cloud_write`, `personalLocalWritesAllowed() === false` blocks writing account data as a silent local copy; anonymous legacy keys are **not** deleted or copied on account switch.

## Matrix — Checkout A (HEAD + networking WIP)

| Domain | Canonical storage | Local cache / legacy | Connected flow | Gates | Account isolation | Evidence | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Jobs | Prisma `ApplyFlowJob` if V2 active | dashboard `localStorage` | V2 dashboard adapters | flag × pilot × canonical | server `accountId`; anonymous legacy | persistence-v2 adapters | PENDENTE DE ATIVAÇÃO / LOCAL if flag off |
| Applications + lifecycle | Prisma `ApplyFlowApplication` if V2 | `localStorage` | dashboard + lifecycle core | same | same | same | PENDENTE DE ATIVAÇÃO / LOCAL |
| Profile / resume variants | browser resume library | `localStorage` | local UI only | n/a cloud | no account namespace | dashboard resume storage | LOCAL |
| Contacts / interactions / drafts | `APPLYFLOW_DASHBOARD_CONTACTS_V1` | same | networking tab → `local-contact-storage` (no `/v2/contacts`) | n/a | **no** `accountId` in key | `apps/applyflow/src/lib/local-contact-storage.ts`; networking tab has no `fetch` | LOCAL |
| SENT / REPLIED / follow-up | Contact fields local | local | HITL Mark Sent → local save | n/a | anonymous | outreach-lifecycle + local storage | LOCAL |
| `jobContext.networking` + `manualMatchOverride` | job local / V2 jobs | jobs `localStorage` | ingest + queue WIP | V2 jobs if active | job row account-scoped only if cloud jobs | uncommitted core WIP | LOCAL (meta) / PENDENTE if jobs cloud |
| Analytics / events / efforts | local | `localStorage` | local dashboard analytics | n/a | anonymous | local analytics modules | LOCAL |
| Inbound responses | local / no cloud model | — | no personal API on this tree | — | — | schema without personal models | LOCAL |
| Extension grants / session | session grant if path exists | `chrome.storage.local` history | options/panel still “no server” UX on A | — | grant vs device-local | extension options | LOCAL (mostly) |
| Settings / audits / AI key | `chrome.storage.local` | same | AI key never server | — | device | AiSettingsPanel | LOCAL |
| Nango | — | — | — | — | — | out of scope for this audit | NÃO COMPROVADO |
| Private pipeline import | merge into `localStorage` on A WIP | gitignored JSON | local import only on A | n/a | writes anonymous keys on A | `import-opportunity-pipeline-local` (A) | LOCAL on A; see integration branch for cloud routing |

## Matrix — Checkout B (PR #253 @ `a014072e`)

| Domain | Canonical storage | Local cache / legacy | Connected flow | Gates | Account isolation | Evidence | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Jobs | Prisma account-scoped | cache `KEY::accountId` | remote dashboard adapter + extension sync | `v2_active` write | `accountId` + generation fence | `v2-remote-dashboard-persistence.ts` (`jobContext` round-trip) | IMPLEMENTADO E CONECTADO (code); PENDENTE DE ATIVAÇÃO until gates |
| Applications | Prisma | namespaced cache | V2 CRUD + extension | same | same | same | IMPLEMENTADO E CONECTADO / PENDENTE ATIVAÇÃO |
| Profile / variants | `GET/PUT /api/applyflow/v2/profile` + Prisma | scoped cache | hydrate + profile UI | write capability | `accountId` | migration + profile route | IMPLEMENTADO E CONECTADO / PENDENTE ATIVAÇÃO |
| Contacts / interactions | `/api/applyflow/v2/contacts` + Prisma | `writeAccountScopedCache(CONTACTS…)` | networking `persist()` uses PUT/POST when `!personalLocalWritesAllowed()` | `cloud_write` | scoped cache + stale generation | networking-tab cloud path on B | IMPLEMENTADO E CONECTADO / PENDENTE ATIVAÇÃO |
| SENT / REPLIED | Contact / interaction cloud | cache | same HITL persist | same | same | contacts API | IMPLEMENTADO E CONECTADO / PENDENTE ATIVAÇÃO |
| Networking meta WIP | N/A on this SHA | — | no `manualMatchOverride` / queue | — | — | `git grep` empty on `a014072e` | NÃO COMPROVADO on this SHA |
| Generic `jobContext` | persisted with cloud Job | — | adapter sends `jobContext` | V2 jobs | account | remote adapter | IMPLEMENTADO E CONECTADO for Job fields; networking-specific N/A |
| Analytics / career events | `/v2/analytics` + models | cache | personal hydrate | gates | account | personal routes | IMPLEMENTADO E CONECTADO / PENDENTE ATIVAÇÃO |
| Inbound responses | `/v2/responses` | cache | personal module | gates | account | personal routes | IMPLEMENTADO E CONECTADO / PENDENTE ATIVAÇÃO |
| Extension grants | session grant + `/v2/extension/session` | `chrome.storage.local` profile/history/AI | sync **profile + jobs/apps**; **not** contacts; AI local | grant + V2 | grant account-bound; local device | service-worker grant; options AI | mixed: grants CONECTADO; extension contacts LOCAL; AI LOCAL |
| Personal import API | `/v2/personal-import` | — | route exists | write | account | personal-import route | IMPLEMENTADO E CONECTADO (API); private pipeline WIP on A does **not** call it |
| Settings / AI key | `chrome.storage.local` | — | options UI | — | device | AiSettingsPanel | LOCAL |
| Nango | — | — | — | — | — | outside personal-persistence diff | NÃO COMPROVADO |

## Incorrect claims from the prior inventory

1. “Resume / profile never uses cloud” — **false on B**; true on A.
2. “Contacts never use cloud” — **false on B** (networking tab → `/v2/contacts`); true on A (including networking WIP).
3. “Extension never uses cloud” — **partially false on B** (grant + profile/jobs/apps sync); still true for AI key, local history, and extension contacts.
4. “Canonical cloud = Jobs + Applications only” — **incomplete**: B adds profile, contacts, interactions, inbound, career/analytics, extension session, personal-import, and migration `20261005170000_account_personal_persistence`.
5. Treating Checkout A as the whole product — **incorrect** while #253 is OPEN and not merged.

## Clearing the browser (by mode)

| Mode | Effect |
| --- | --- |
| A, flag off / local | Loses local jobs, apps, contacts, analytics, resume |
| A, V2 jobs active (no personal APIs) | Cloud jobs/apps survive; local contacts/CV/analytics lost |
| B, `cloud_write` active | Cloud profile/contacts/jobs/apps/analytics survive; scoped caches rehydrate; anonymous legacy may remain orphaned; extension AI key + audits lost if `chrome.storage` cleared |
| Extension | Session grant gone; device-local AI/history gone with storage clear |

## Networking and isolation

| Question | Finding |
| --- | --- |
| Do contacts/outreach use personal APIs? | A: no. B: yes when `cloud_write`. |
| Is `jobContext.networking` / `manualMatchOverride` cloud-persisted? | **Checkout C:** yes — `normalizeContext` preserves `networking` (incl. `manualMatchOverride`); verified cloud create + UI Manual score 91. |
| Does private import work on V1 and V2? | C: authority-aware — `local` → localStorage; `cloud_write` → V2 jobs + `/v2/personal-import`. |
| Does hydrate keep manual score? | Yes when `manualMatchOverride` is stored on Job (C cloud runtime observed). |
| Does Mark Sent require human confirmation? | Yes (HITL); no auto-DM. |
| Does outreach change Application lifecycle? | Must not; core rule keeps outreach separate from candidacy lifecycle. |
| Logout / account A→B | B: `KEY::accountId` + generation fence; residual anonymous legacy risk if UI falls back to local path. A+WIP: anonymous keys → **same-browser contact bleed risk**. |

## Matrix — Checkout C (integrated networking on account persistence)

| Domain | Canonical storage | Cache/legado | Fluxo conectado | Gates | Isolamento | Evidência | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Jobs / Applications | Prisma V2 (from B) | namespaced cache | dashboard adapters | `v2_active` | account + fence | B adapters preserved | IMPLEMENTADO E CONECTADO (código) / PENDENTE ATIVAÇÃO |
| Contacts / outreach | `/v2/contacts` when `cloud_write`; else local | scoped cache | networking tab async persist (B path kept) | personal authority | generation fence | `job-decision-v2-networking-tab.tsx` | IMPLEMENTADO E CONECTADO (código) / PENDENTE ATIVAÇÃO |
| Queue / filters / badges | derived from jobs+contacts | — | `NetworkingQueuePanel` | n/a | uses loaded contacts | `networking-queue.ts` / panel | IMPLEMENTADO E CONECTADO; **runtime local observado** (filtro Sent, badge Manual score) |
| `manualMatchOverride` | `jobContext.networking` | with Job | ingest skip reevaluate; UI “Manual score” | — | with Job account | core + queue + networking tab | IMPLEMENTADO E CONECTADO; **runtime local:** Match 91/100 Manual após reload |
| Private pipeline import | localStorage **or** V2 jobs + `/v2/personal-import` | scoped cache on cloud | authority-aware `applyOpportunityPipeline` | local / cloud_write / fail-closed | stale A→B aborts | `import-opportunity-pipeline-local.ts` | **runtime local + cloud:** UI label `Import private pipeline ( account )`; file import cloud → 1 job + 1 contact; score 91 + Manual score |
| Partial Jobs→Contacts failure | non-atomic endpoints | — | `ok:false` + `partial` / API 400 `import_not_confirmed`; never full success | — | — | import tests + API driver | **API cloud observado:** job 201 + contacts 400; retry contacts 200; duplicate job 409; incompatible fingerprint **409 conflict** |
| Mark Sent HITL | Contact status | — | `window.confirm` then mark; Copy/Open do not Sent | — | — | networking tab + browser | **runtime local + cloud:** cancel→Ready; confirm→SENT; applications=0 |
| Outreach vs Application lifecycle | separate | — | outreach APIs do not transition Application | — | — | core + cloud Mark Sent | **cloud observado:** SENT sem criar Application |
| Job-scoped contact (no Application) | `/v2/contacts` + personal-import | — | `jobId` alone allowed when job owned | write | account | `services.ts` + cloud import | **defeito corrigido nesta passagem** (antes `invalid_payload` com só `jobId`) |
| `jobContext.networking` persist | Job JSON | — | create/patch preserve networking | write | account | `job-service.ts` | **defeito corrigido nesta passagem** (`normalizeContext` antes dropava networking) |
| A→B isolation | account-scoped rows + fence | namespaced keys | logout + E2E login B | — | cross GET job 404; B UI empty queue | browser + API | **cloud observado:** B sem dados de A; PUT mesmo contact id cria linha de B (A intacta) |
| Flags / production | — | — | — | — | — | — | NÃO COMPROVADO / PENDENTE ATIVAÇÃO |

### Import behaviour (Checkout C)

| Mode | Behaviour |
| --- | --- |
| `local` | Explicit legacy anonymous `localStorage` |
| `cloud_write` | Jobs via V2 API; contacts via `/personal-import` with `confirmImport: true`; account from server session |
| `cloud_read` / `cloud_paused` | Fail closed (`cloud_read_only` / `cloud_paused`); no local fallback |
| Account switch mid-import | `stale_account_scope`; generation fence |
| Partial Jobs then Contacts fail | `ok:false` with `partial.jobsAdded/jobsSkipped`; UI must not treat as full success |
| Retry | Jobs skip `job_already_exists`; contacts import sessions/fingerprints avoid incompatible overwrite (409 conflict) |

## Local cloud validation auth (Checkout C closeout)

| Item | Value |
| --- | --- |
| Mechanism | `POST /api/applyflow/e2e/session` + cookie `af_e2e_session` |
| Guard | `APPLYFLOW_E2E=1` + secret + fail-closed outside local/CI (`runtime-guard`); never on Vercel |
| Diff vs normal login | Bypasses product IdP; still uses real `requireApplyFlowAccount`, persistence mode resolver, and V2 services |
| Accounts | `e2e_applyflow_net_account_a` / `_b` with `seedV2` → `v2_cloud` + `pilotEligible` |
| Note | `seedV2` wipes that account’s Jobs/Applications for E2E idempotency (contacts not wiped by seed) |

## Gaps and recommended corrections

1. ~~Rebase networking WIP onto #253~~ — done on Checkout C.
2. ~~Point private pipeline import at cloud adapters when `cloud_write`~~ — done on C.
3. Align extension “no server” copy with real sync; decide whether contacts sync.
4. Version inventories by SHA/PR; do not claim “never cloud” without gates.
5. Shared activation checklist (migration + flag + pilot + smoke `/v2/profile`) only with explicit authorization.
6. Production / Preview activation and packaging of the extension remain **PENDENTE**.

## Factual map (summary)

```mermaid
flowchart TB
  subgraph checkoutA [CheckoutA_0322e163_plus_WIP]
    ALocal[Contacts_CV_Analytics_AI_local]
    AJobs[Jobs_Apps_V2_optional]
    ANet[Networking_WIP_local_only]
  end
  subgraph checkoutB [PR253_a014072e]
    BCloud[Profile_Contacts_Inbound_Analytics_Jobs_Apps]
    BCache[Namespaced_local_cache]
    BExt[Ext_grant_plus_profile_jobs_sync]
    BLocal[AI_key_and_ext_history_local]
  end
  checkoutA -->|"not_ancestor"| checkoutB
```

| Layer | Status |
| --- | --- |
| Implemented in code (B) | Account personal persistence + UI/extension wires (except AI key and extension contacts) |
| Active on observed local (A) | Personal cloud impossible on this tree; networking WIP local; Jobs/Apps V2 only if local gates (runtime flag **NÃO COMPROVADO** in this audit) |
| Pending shared activation | Merge #253 + migration + flag/pilot on shared environments — **NÃO COMPROVADO** in production |
| Still local / explicit import | AI key; much of the extension; private pipeline import on A WIP; residual anonymous legacy |

## Evidence class

| Class | Covered here |
| --- | --- |
| Static (`git show` / tree / `git grep`) | Yes |
| Local runtime (flags, adapters selected) | Partial — example env only; no secret inspection |
| Chrome A–L suites | Not repeated |
| Production | Not consulted |
