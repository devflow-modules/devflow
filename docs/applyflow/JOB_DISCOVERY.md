# Job discovery — multi-provider

ApplyFlow searches external job boards from **Vagas → Procurar oportunidades**, then runs the local match pipeline only after an explicit save.

## Providers

### Jobgether

- Default provider
- Free / rapid discovery
- Description may be absent in live responses
- When description is missing, the UI offers **Adicionar descrição e analisar** so the candidate pastes the listing text
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

If the hit has a usable description:
  -> Guardar e analisar
  -> ingestApplyFlowJob

If the hit has no description:
  -> Adicionar descrição e analisar
  -> paste listing text
  -> ingestApplyFlowJob

Then:
  -> existing intelligence, Match Engine, dedupe, localStorage or V2
```

A search hit is not an `ApplyFlowJob`. Saving does not create an `ApplyFlowApplication`.

The curriculum stays in the browser. Search request bodies contain only filter fields. The server does not score jobs and does not receive CV data.

## Source, id, and URL semantics

| Provider   | `source`       | Deterministic id   |
|------------|----------------|--------------------|
| Jobgether  | `jobgether`    | `job_jg_<id>`      |
| TheirStack | `theirstack`   | `job_ts_<id>`      |

`sourceUrl` is the board/listing URL and is stored in the existing `ApplyFlowJob.url` field.

TheirStack may also expose `final_url` as optional transient `directApplyUrl` on the search hit. Phase 2 does **not** persist `directApplyUrl` (no migration). The UI shows **Candidatura direta** only when that URL is present.

`ApplyFlowApplicationSource` is unchanged. Later candidaturas still use `applicationSourceFromJob` (`paste` unless `linkedin` / `json`).

Provider `technology_slugs` / salary fields are discovery metadata only. Persisted skills and compensation intelligence still come from description analysis in `ingestApplyFlowJob`.

## Pagination and cache

- Page 1 on Buscar; next page only from **Carregar mais**
- Cache key includes provider, normalized criteria, page, and limit
- Errors are not cached
- Bounded in-memory map (instance-local). Serverless instances do not share cache
- Identical queries reuse cache and do not spend TheirStack credits

## Failures

Public error classes: `invalid_criteria`, `provider_rejected`, `provider_timeout`, `provider_rate_limited`, `provider_unavailable`, `invalid_provider_response`, `provider_not_configured`.

TheirStack:

- Missing API key → `provider_not_configured` (Jobgether still works)
- No retry on 400 / 401 / 402 / 403 / 404 / 422 / 429
- At most one retry on timeout or 5xx (credits are tied to successful returned jobs)

Logs are one JSON line with provider, criteria hash, page, result count, cache hit/miss, duration, and error code. They never include keywords, descriptions, CV text, Authorization headers, or API keys.

## Deduplication

Save reuses existing id / canonical URL / description hash:

- same TheirStack id → same `job_ts_` id
- same listing URL → canonical URL dedupe
- identical normalized description → description hash can catch cross-provider duplicates
- no fuzzy merge by company + title

## Security

- Provider allowlist: `jobgether` | `theirstack` only
- Fixed hosts and methods inside each adapter (not a generic HTTP proxy)
- Secrets stay server-side
- The anonymous dashboard search route can still be invoked; TheirStack cost is mitigated by small limits, cache, and no auto-search. There is no Redis rate limiter in Phase 2.

## Known limitations

- Cache is instance-local
- TheirStack credit balance is not shown in product UI
- No migration; no new SQL columns for provider metadata
- Remote filters are geographic when the provider says so — remote ≠ worldwide
- A saved job is not refreshed if the remote listing changes

## Environment

Server only:

- `THEIRSTACK_API_KEY` — required for TheirStack searches; absent → controlled unavailable state
