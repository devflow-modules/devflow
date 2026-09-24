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

- Supabase Auth SSR (cookies httpOnly)
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

- **Rollout:** deploy com flag OFF → configurar Supabase + DB → migrar schema → staging com flag ON → validar `/me` + readyz → cutover gradual.
- **Rollback:** flag OFF → V1 local-first imediato; dados cloud permanecem no DB até política de retenção.

## Ownership

- B2C single-user: cada row scoped por `ApplyFlowAccount.id` derivado da sessão Supabase.
- Nunca autorizar por `accountId` / `userId` enviado pelo client.

## Referências

- [ADR — Local-first vs Serverless](./ADR-LOCAL_FIRST_VS_SERVERLESS.md)
- [ADR — Persistence V2 local + cloud](./ADR-PERSISTENCE_V2_LOCAL_AND_CLOUD.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
