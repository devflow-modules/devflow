# Job discovery — multi-provider

ApplyFlow searches external job boards from **Vagas → Procurar oportunidades**, then runs the local match pipeline only after an explicit save.

## Providers

### Jobgether

- Default provider
- Free / rapid discovery
- Description may be absent in live responses
- When description is missing, the UI offers **Adicionar descrição** → **Analisar compatibilidade** (preview) → optional **Guardar e analisar**
- Default limit 10, maximum 25
- Cache TTL 10 minutes (process-local)

### TheirStack

- Explicit / on-demand richer discovery
- Requires server-side `THEIRSTACK_API_KEY` (Bearer); the key never reaches the browser
- **Disabled by default on shared Vercel production/preview** until a distributed rate limiter exists (Option D / Phase 9B). Opt-in: `APPLYFLOW_THEIRSTACK_ENABLED=true` (single-tenant / personal only)
- Requires an authenticated ApplyFlow session (never anonymous paid search)
- Full job descriptions are generally available → **Guardar e analisar**
- API credits are consumed per returned job
- Default limit 5, maximum 10 (enforced server-side; the browser cannot raise the cap)
- Process-local account quota (10 upstream searches / hour) as defense-in-depth when enabled — **not** multi-instance safe alone
- Stronger cache TTL 30 minutes (process-local); warm-cache hits do not consume quota or credits
- Manual pagination only (**Carregar mais**); no prefetch, no auto page fetch
- Never queried automatically alongside Jobgether
- Changing filters or the provider alone does not start a search
- No retry on 402 / 429

### Remote OK

- Explicit / on-demand
- Free public remote-tech JSON feed (`https://remoteok.com/api`) — no API key
- Descriptions arrive as HTML and are normalized server-side to **plain text** before hits or persistence
- Full descriptions after normalization → **Guardar e analisar**
- Uses a **30-minute process-local catalog snapshot** (normalized jobs). Keyword / location / experience / page changes reuse the warm snapshot and do **not** call Remote OK again
- Local filtering and local pagination (default limit 10, maximum 25)
- Remote does **not** imply worldwide — empty location is not treated as worldwide
- Salary / contract filters are disabled in the UI for this source (currency is not reliably structured)
- **Attribution required:** discovery and saved Remote OK jobs show credit and a link back to the Remote OK listing (`rel` may include `noopener`/`noreferrer`, never `nofollow`)
- `apply_url` is **not** mapped to `directApplyUrl` (current feed: identical to the listing URL)
- No Remote OK logo / trademark artwork

One search action queries exactly one selected provider. There is no silent fallback and no dual `Promise.all` search.

## Flow

```text
Provider selector (default: Jobgether)
  -> explicit Buscar
  -> POST /api/applyflow/job-sources/search   (same origin)
  -> allowlisted provider adapter
  -> Zod validation of the provider JSON
  -> JobSearchHit
  -> discovery UI
  -> LOCAL Match Preview (browser only; no persistence)

If the hit has a usable description:
  -> automatic transient Match Preview
  -> optional Guardar e analisar
  -> ingestApplyFlowJob (again) + dedupe + persistence

If the hit has no description (typical Jobgether):
  -> Adicionar descrição
  -> Analisar compatibilidade (preview only)
  -> optional Guardar e analisar
```

A search hit is not an `ApplyFlowJob`. Preview does not create an `ApplyFlowJob` in storage. Saving does not create an `ApplyFlowApplication`.

The curriculum stays in the browser. Search request bodies contain only filter fields. The server does not score jobs and does not receive CV data.

## Match Preview

- Browser/local only — reuses `ingestDiscoveredJobHit` → `ingestApplyFlowJob` → `evaluateJobMatch`
- No second scoring system; provider has zero effect on score
- No provider refetch; TheirStack spends no extra credits for preview
- No persistence, dedupe, application creation, or funnel/analytics impact until explicit save
- Description required — Jobgether without description shows `needs_description` (no title-only match)
- TheirStack / Remote OK normally preview immediately when description is present
- Save recomputes through the normal ingest + dedupe + persistence path (duplicate CPU is intentional and cheap)
- Optional **Maior aderência** sort applies only to currently loaded/evaluated results — not the full provider catalog
- CV/profile changes (default variant id / `updatedAt`) invalidate preview state
- Remoto OK attribution and TheirStack `directApplyUrl` semantics are unchanged

## Opportunity Queue

Saved jobs form a **derived** pre-application opportunity queue — not a Shortlist entity, not a new status, and not a second Kanban.

- **Active queue** = `ApplyFlowJob` with `status === "reviewing"`
- **Todas** = all persisted jobs
- **Ignoradas** = `status === "ignored"`
- Membership uses **user intent status**, never `jobMatch.decision`
- Explicit **Guardar e analisar** / paste evaluate enters the queue as `reviewing`
- Match Preview never enters the queue and never auto-saves
- Match Engine recommendation stays in `jobMatch` (score / decision / skills)
- Newly saved jobs always start as `reviewing`, even when `jobMatch.decision === "skip"`
- **Ignorar** sets `ignored` without deleting the job
- **Voltar à fila** restores `ignored` → `reviewing` without recomputing match
- Reevaluation updates match evidence only — it does **not** override user status
- Applied / terminal jobs leave the active queue but remain in **Todas**
- Sorting: Maior aderência | Mais recentes (loaded saved jobs only)
- Filters: match decision + source (persisted fields only)
- No priority field, notes, reminders, or DB migration
- Queue actions make **no** provider requests and do not send CV data
- Application creation remains the existing analysis → `createApplicationFromJob` path

### Historical compatibility

Jobs already persisted as `ignored` (including older algorithm-mapped `skip → ignored`) are **not** auto-reclassified. They stay under **Ignoradas** until the user restores them.

## Application Readiness

On the job analysis page (`/dashboard/jobs/[id]`), ApplyFlow shows a **derived** preparation checklist — not a readiness score and not a new entity.

- Derived from existing `ApplyFlowJob`, `jobMatch`, ResumeLibrary, optional V1 pack, and existing Application
- No persistence of readiness itself; no DB migration
- Reuses Match Engine evidence (`score`, `decision`, skills) without a second scorer
- Shows curriculum recommendation vs user-selected pack resume when they differ
- Opening analysis / preparing V1 pack / ephemeral V2 pack **do not** create an Application
- **Registrar candidatura** creates a tracking record only (`application.status = reviewing`); job stays `reviewing`
- Duplicate registration is prevented via `findApplicationForJob` / `resolveApplicationRegistration` (local + V2)
- **Marcar como enviada** means the user submitted externally → Application and linked Job become `applied` (local and V2)
- Applied jobs leave Fila ativa via Phase 6 membership (`status === reviewing`)
- Remote OK attribution remains on the analysis surface; source link uses `job.url`
- **Known limitation:** TheirStack `directApplyUrl` is not persisted after save — only the listing URL remains
- Zero provider requests; CV is not sent to providers

## Application Lifecycle parity (Phase 8)

See [`APPLICATION_LIFECYCLE.md`](./APPLICATION_LIFECYCLE.md).

- Local and cloud transitions share `canTransitionApplicationStatus`
- Cloud updates also sync the linked Job via `sourceJobId` + `fromPipelineStatusV2`
- Next-action guidance is derived-only (not persisted, not a task/reminder)
- Cloud does not fabricate timeline events; local keeps real career events
- Applications table may show Remote OK attribution from the **linked job** (`job.source`), not from collapsed `application.source`

## Source, id, and URL semantics

| Provider   | `source`       | Deterministic id   |
|------------|----------------|--------------------|
| Jobgether  | `jobgether`    | `job_jg_<id>`      |
| TheirStack | `theirstack`   | `job_ts_<id>`      |
| Remote OK  | `remoteok`     | `job_ro_<id>`      |

`sourceUrl` is the board/listing URL and is stored in the existing `ApplyFlowJob.url` field.

TheirStack may also expose `final_url` as optional transient `directApplyUrl` on the search hit. Phase 2/4 does **not** persist `directApplyUrl` (no migration). The UI shows **Candidatura direta** only when that URL is present.

Remote OK never sets `directApplyUrl` from the current feed.

`ApplyFlowApplicationSource` is unchanged. Later candidaturas still use `applicationSourceFromJob` (`paste` unless `linkedin` / `json`).

Provider tags / salary fields are discovery metadata only. Persisted skills and compensation intelligence still come from description analysis in `ingestApplyFlowJob`. The Match Engine is unchanged.

## Pagination and cache

- Page 1 on Buscar; next page only from **Carregar mais**
- Jobgether / TheirStack: cache key includes provider, normalized criteria, page, and limit
- Remote OK: provider-level catalog snapshot (TTL 30 minutes) plus the shared page cache; **no upstream call** when criteria or page change while the catalog is warm
- Errors are not cached
- Bounded in-memory maps (instance-local). Serverless instances do not share cache
- Identical TheirStack queries reuse cache and do not spend credits
- No auto-refresh on filter keystrokes or provider selection

## Failures

Public error classes: `invalid_criteria`, `auth_required`, `provider_not_available`, `app_rate_limited`, `provider_rejected`, `provider_timeout`, `provider_rate_limited`, `provider_unavailable`, `invalid_provider_response`, `provider_not_configured`.

HTTP mapping (stable product codes):

| Code | HTTP |
|------|------|
| `auth_required` | 401 |
| `provider_not_available` | 403 |
| `app_rate_limited` / `provider_rate_limited` | 429 |

TheirStack:

- Missing API key → `provider_not_configured` (Jobgether / Remote OK still work)
- Shared deploy / gate off → `provider_not_available` (403)
- Account upstream quota exceeded → `app_rate_limited` (429); denied requests never call TheirStack
- Provider 429 → `provider_rate_limited` (distinct UX from app quota)
- No retry on 400 / 401 / 402 / 403 / 404 / 422 / 429
- At most one retry on timeout or 5xx (credits are tied to successful returned jobs)

Remote OK:

- No retry on 400 / 403 / 404 / 429
- At most one retry on timeout or 5xx
- Concurrent catalog misses in the same process coalesce to a single upstream request
- Individual malformed jobs are skipped; zero valid jobs after parse → `invalid_provider_response`

Logs are one JSON line with provider, criteria hash, page, result count, cache hit/miss, duration, `upstream`, optional `quota`, and error code. They never include keywords, descriptions, CV text, Authorization headers, account cookies, or API keys.

## Deduplication

Save reuses existing id / canonical URL / description hash:

- same Remote OK id → same `job_ro_` id
- same listing URL → canonical URL dedupe
- identical normalized description → description hash can catch cross-provider duplicates
- no fuzzy merge by company + title

## Discovery Security (Phase 9B)

### Authentication policy

- When Supabase public config is present, `POST /api/applyflow/job-sources/search` requires an authenticated ApplyFlow session (cookie SSR). Unauthenticated → `auth_required` (401).
- When auth is **not** configured (local-first / personal without Supabase), Jobgether and Remote OK may run anonymously. TheirStack never does.
- Session identity comes from `getAuthenticatedApplyFlowUser()` / `authProviderSub`. Request body must not carry `accountId` / `userId` / `tenantId` (Zod `.strict()` rejects them).
- Client uses `credentials: "same-origin"`. Expired session → 401; UI shows login recovery copy (no anonymous paid fallback).

### Paid provider authorization

- TheirStack requires: authenticated session **and** `THEIRSTACK_API_KEY` **and** `isTheirStackSearchEnabled()`.
- Shared Vercel `production` / `preview`: TheirStack **disabled by default** (`provider_not_available`).
- Explicit opt-in `APPLYFLOW_THEIRSTACK_ENABLED=true` is for single-tenant personal use only and acknowledges process-local quota is not multi-user cost safety.

### Rate-limit / quota

- Monorepo audit: no Redis/KV/Upstash shared limiter suitable for Vercel multi-instance (Option D).
- Process-local fixed-window quota: **10 TheirStack upstream searches / account / hour** when TheirStack is enabled.
- Quota identity = server-derived `authProviderSub` (not IP alone, not a global `"theirstack"` key).
- Order: authenticate → validate → authorize provider → cache lookup → **if miss** enforce quota → upstream → cache write.
- Warm-cache reuse does **not** consume quota. Criteria/page changes that miss cache do consume quota and cannot evade the account limit.
- Process-local Maps may cache for performance; they are **not** the sole security barrier on shared deploy (TheirStack stays off instead).

### Concurrency

- In-process Map increment is not atomic across Vercel instances. Concurrent abuse across instances is why shared deploy keeps TheirStack disabled. Single-process parallel requests are best-effort only — do not claim distributed race safety.

### No CV outbound

- Search body = filter fields only. Curriculum / resume / profile never leave the browser for provider search.

### Logout

- Account shell (`/account`) exposes **Sair** via Supabase `signOut` → `/login`. No token display.

### CSRF

- Broad CSRF hardening is deferred (Phase 9C). Search uses same-origin cookies; Origin validation reuse is out of scope for 9B.

## TheirStack Cost Safety

- Explicit search only (no auto-query, no dual provider search, no preview credits)
- Result cap (max 10)
- Process-local response cache (TTL 30m)
- Account quota when enabled (upstream misses only)
- No retry on 402 / 429
- Shared deploy: disabled until distributed limiter exists

## Known limitations

- Cache is instance-local
- TheirStack disabled on shared deploy by default (no distributed rate limiter yet)
- Process-local quota is defense-in-depth only, not multi-instance cost control
- TheirStack credit balance is not shown in product UI
- No migration; no new SQL columns for provider metadata
- Remote filters are geographic when the provider says so — remote ≠ worldwide
- Remote OK catalog can include jobs older than 30 days; posted dates are preserved
- A saved job is not refreshed if the remote listing changes
- Remaining production gaps (deferred): E2E, error tracking, backup drill, security headers, CSRF broad hardening, data deletion, transactional App+Job sync

## Environment

Server only:

- `THEIRSTACK_API_KEY` — required for TheirStack searches; absent → `provider_not_configured`
- `APPLYFLOW_THEIRSTACK_ENABLED` — optional; `true`/`1` opts in (needs key); `false`/`0` forces off; default off on Vercel production/preview
- Remote OK — no environment variables
- Never `NEXT_PUBLIC_THEIRSTACK_*`
