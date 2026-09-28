# ApplyFlow Persistence V2

**Status:** F1 foundation (opt-in)  
**Baseline production V1:** `7ca5594b` — local-first unchanged while `APPLYFLOW_PERSISTENCE_V2` is OFF.

## Decisão de produto

| Modo | Source of truth |
|------|-----------------|
| **Anonymous / V1 (default)** | Browser: `localStorage` (dashboard) + `chrome.storage.local` (extensão) |
| **Signed-in / V2 (flag ON)** | PostgreSQL dedicado ApplyFlow, scoped por utilizador autenticado (Supabase Auth) |

Durante a migração, V1 continua suportada atrás da feature flag. `localStorage` pode permanecer como cache, draft e backup temporário pós-import — **não** como canonical após cutover (F5).

## F1 — Foundation (implementado)

- Supabase Auth SSR (cookies httpOnly); public client key: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (never secret/service_role)
- Prisma + tabela `applyflow_accounts`
- `requireApplyFlowAccount()` — sessão → `auth_provider_sub` → upsert idempotente
- Feature flag `APPLYFLOW_PERSISTENCE_V2` (default **OFF**)
- Probe `GET /api/applyflow/v2/me`
- Readiness: com flag ON, PostgreSQL + config Supabase pública são obrigatórios; probe `SELECT 1` quando configurado

**Fora de F1:** jobs, applications, outreach, profile, analytics, import V1→V2, sync extensão.

## Fases planeadas

| Fase | Conteúdo |
|------|----------|
| **F1** | Auth + account + Prisma foundation + flag + health + `/me` |
| **F2** | Jobs + applications persistence |
| **F3** | Outreach contacts + interactions |
| **F4** | Import idempotente V1 localStorage → PostgreSQL |
| **F5** | Cutover (DB canonical, localStorage cache-only) |
| **F6** | Cleanup + optional extension cloud sync |

## Rollout / rollback

- **First Production pilot (ops):** see [`PERSISTENCE_V2_FIRST_PRODUCTION_PILOT_RUNBOOK.md`](./PERSISTENCE_V2_FIRST_PRODUCTION_PILOT_RUNBOOK.md) (gates A–L + emergency). Operator CLI: `pnpm pilot:status|grant|revoke` in `apps/applyflow`.
- **Rollout:** deploy with flag OFF → configure Supabase + DB → migrate schema → staging with flag ON → validate `/me` + readyz → cutover gradual.
- **Rollback:** flag OFF → accounts with `canonical=v1_local` stay on V1; accounts with `canonical=v2_cloud` become `v2_paused` (no silent V1 fallback). Cloud data remains until retention policy.

## Ownership

- B2C single-user: cada row scoped por `ApplyFlowAccount.id` derivado da sessão Supabase.
- Nunca autorizar por `accountId` / `userId` enviado pelo client.

## Referências

- [ADR — Local-first vs Serverless](./ADR-LOCAL_FIRST_VS_SERVERLESS.md)
- [ADR — Persistence V2 local + cloud](./ADR-PERSISTENCE_V2_LOCAL_AND_CLOUD.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
