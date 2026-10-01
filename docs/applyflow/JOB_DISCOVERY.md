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
- Full job descriptions are generally available → **Guardar e analisar**
- API credits are consumed per returned job
- Default limit 5, maximum 10 (enforced server-side; the browser cannot raise the cap)
- Stronger cache TTL 30 minutes (process-local)
- Manual pagination only (**Carregar mais**); no prefetch, no auto page fetch
- Never queried automatically alongside Jobgether
- Changing filters or the provider alone does not start a search

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

Public error classes: `invalid_criteria`, `provider_rejected`, `provider_timeout`, `provider_rate_limited`, `provider_unavailable`, `invalid_provider_response`, `provider_not_configured`.

TheirStack:

- Missing API key → `provider_not_configured` (Jobgether / Remote OK still work)
- No retry on 400 / 401 / 402 / 403 / 404 / 422 / 429
- At most one retry on timeout or 5xx (credits are tied to successful returned jobs)

Remote OK:

- No retry on 400 / 403 / 404 / 429
- At most one retry on timeout or 5xx
- Concurrent catalog misses in the same process coalesce to a single upstream request
- Individual malformed jobs are skipped; zero valid jobs after parse → `invalid_provider_response`

Logs are one JSON line with provider, criteria hash, page, result count, cache hit/miss, duration, and error code. They never include keywords, descriptions, CV text, Authorization headers, or API keys.

## Deduplication

Save reuses existing id / canonical URL / description hash:

- same Remote OK id → same `job_ro_` id
- same listing URL → canonical URL dedupe
- identical normalized description → description hash can catch cross-provider duplicates
- no fuzzy merge by company + title

## Security

- Provider allowlist: `jobgether` | `theirstack` | `remoteok` only
- Fixed hosts and methods inside each adapter (not a generic HTTP proxy)
- Remote OK HTML is never rendered and never persisted as HTML — only plain text after sanitize
- Secrets stay server-side (Remote OK needs none)
- The anonymous dashboard search route can still be invoked; TheirStack cost is mitigated by small limits, cache, and no auto-search. There is no Redis rate limiter.

## Known limitations

- Cache is instance-local
- TheirStack credit balance is not shown in product UI
- No migration; no new SQL columns for provider metadata
- Remote filters are geographic when the provider says so — remote ≠ worldwide
- Remote OK catalog can include jobs older than 30 days; posted dates are preserved
- A saved job is not refreshed if the remote listing changes

## Environment

Server only:

- `THEIRSTACK_API_KEY` — required for TheirStack searches; absent → controlled unavailable state
- Remote OK — no environment variables
