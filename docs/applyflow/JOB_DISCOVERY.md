# Job discovery — Jobgether (phase 1)

ApplyFlow can search Jobgether from the existing **Vagas** section and, only after an explicit save, run the current local match pipeline.

## Why this exists

The inbox previously accepted only pasted text, JSON import, or a job already evaluated in the browser. Phase 1 adds one external source so a later provider can follow the same boundary. Adzuna and Remotive are not implemented.

## Flow

```text
Vagas search form
  -> POST /api/applyflow/job-sources/search   (same origin, no V2 session)
  -> JobgetherProvider
  -> Zod validation of the provider JSON
  -> JobSearchHit
  -> UI

If the hit already has a usable description:
  -> user chooses Guardar e analisar
  -> ingestApplyFlowJob

If the hit has no description (current Jobgether live payload):
  -> user chooses Adicionar descrição e analisar
  -> user pastes the real listing text
  -> ingestApplyFlowJob

Then:
  -> existing intelligence, match, dedupe, localStorage or V2 persistence
```

A search hit is not an `ApplyFlowJob`. Saving does not create an `ApplyFlowApplication`.

The curriculum stays in the browser. The search request body is only the filter object. The server does not score jobs.

ApplyFlow does not scrape the Jobgether listing page and does not invent a description.

## Source and URL

Saved jobs use `source: "jobgether"`. The id is `job_jg_` plus the sanitized Jobgether id. There is no `externalId` column.

`sourceUrl` from Jobgether is the Jobgether listing. It is stored in the existing `url` field. It is not an employer application URL. The discovery UI labels the link as the Jobgether listing.

`ApplyFlowApplicationSource` is unchanged. If a candidatura is created later, the existing mapper still stores `paste` unless the job source is `linkedin` or `json`. Career analytics can still recognize a Jobgether host on `jobUrl`.

## Description availability

`GET https://jobgether.com/api/v1/jobs` is the only endpoint. The host is fixed in the server provider. The browser cannot pass a provider URL.

Description is optional in the validated provider schema. The live payload observed for phase 1 does not currently include description text. When it is missing, the UI offers **Adicionar descrição e analisar** so the candidate can paste the real text after opening the listing. When a future response includes description text, **Guardar e analisar** remains available.

## Pagination and cache

The UI requests page 1, then the next page only from **Carregar mais**. `page` is 1–10 and `limit` is 1–25. `hasMore` does not trigger another request.

Successful pages are cached in process memory for 10 minutes. The key is `jobgether`, a hash of the normalized filters, and the page. Errors are not cached. The map keeps at most 50 entries. Each server instance has its own map. A serverless deployment does not share this cache.

## Failures

Provider calls use an 8 second timeout and `AbortController`. Timeout and HTTP 5xx are retried once. HTTP 400, 404, and 429 are not retried. RFC 9457 `code` values are mapped to a short internal error code. The UI shows a fixed sentence for that code, not the provider `detail`.

Logs are one JSON line with provider, criteria hash, page, result count, cache hit or miss, duration, and error code. They do not include the keyword, description, CV, or raw body.

## Deduplication

Save reuses `mergeApplyFlowJobs` / canonical URL checks:

- same Jobgether id -> same `job_jg_` id
- same canonical listing URL
- same description hash

Company plus title is not a merge key. Uncertain duplicates stay as separate jobs.

## Known limitations

- No shared rate limit. The route is reachable without a V2 session, by product decision, so a caller can still spend Jobgether's edge quota up to the page cap, the 25-item limit, the timeout, and the 10-minute cache. There was no existing rate-limit helper to reuse. Redis was not added.
- Cache is instance-local.
- Current Jobgether responses omit description; analysis requires the candidate to paste the listing text.
- A saved Jobgether job is not refreshed if the listing changes; the existing merge skips the same id.
- V2 `create` still enforces uniqueness on id only. The client checks URL and description hash against the jobs already loaded.
- No migration and no new SQL index.

## Adding another provider later

Implement `JobSourceProvider.search` behind the same criteria type and return `JobSearchHit` values. Translate that provider's enums inside the adapter. Keep secrets on the server. Do not pass provider payloads into `ApplyFlowJob`.
