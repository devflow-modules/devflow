# Career Suite — Deployment

Reuses the **existing** monorepo deployment setup. No platform migration.

## Platforms

- **Frontend/app (ApplyFlow)**: Next.js 16 (`apps/applyflow`), deployed on **Vercel** (root
  `vercel.json`, `installCommand: pnpm install --frozen-lockfile`). ApplyFlow runs server route
  handlers (no separate backend service).
- **Database**: managed **PostgreSQL** via Prisma (root + whatsapp schemas). The Career Suite is
  **local-first/in-memory**; when `DATABASE_URL` is absent the `database` component stays
  `disabled` and feedback is discarded (no silent persistence).

## Build & run

| Concern | Value |
|---------|-------|
| Install | `pnpm install --frozen-lockfile` |
| Build (app) | `pnpm --filter applyflow build` |
| Build (workspace) | `pnpm -w run build` |
| Start | `pnpm --filter applyflow start` (port 3010) |
| Health check path | `/career-system/health` |
| Liveness path | `/career-system/livez` |
| Readiness path | `/career-system/readyz` |
| Migration (schema validation) | `pnpm db:generate` |
| Migration (apply) | `pnpm db:migrate:deploy` |
| Preview deploy | `pnpm deploy:preview` (`vercel`) |
| Production deploy | `pnpm deploy:prod` (`vercel --prod`) — **requires explicit approval** |

Reproducible build: `pnpm install --frozen-lockfile` + `pnpm -w run build`. Set client-safe
build metadata via `NEXT_PUBLIC_APP_VERSION`, `NEXT_PUBLIC_COMMIT_SHA`,
`NEXT_PUBLIC_BUILD_TIMESTAMP`.

## Feature flag matrix

| Flag | Default | Notes |
|------|---------|-------|
| `CAREER_AGENTS_ENABLED` | `true` | Deterministic core; off only if explicitly `false`. |
| `LIBRECHAT_ADAPTER_ENABLED` | `false` | Chat adapter; opt-in. |
| `LIBRECHAT_TRANSPORT_ENABLED` | `false` | Real transport; opt-in; secrets server-side. |
| `CAREER_LLM_ENABLED` | `false` | Controlled LLM; opt-in. |
| `CAREER_LLM_PROVIDER` | `mock` | `openai` only with server key **and** model. |
| `CAREER_AUTOMATION_ENABLED` | `false` | Approved automation; opt-in. |
| `CAREER_AUTOMATION_PROVIDER` | `mock` | Stays `mock` in the pilot. |
| `OPENCLAW_ENABLED` | `false` | **Stays off.** |
| `CAREER_PILOT_MODE` | `false` | Server-side pilot posture. |
| `NEXT_PUBLIC_CAREER_PILOT_MODE` | `false` | Client UI pilot badge/notice/feedback. |
| `CAREER_SYSTEM_STATUS_ENABLED` | `false` | Production gate for `/dashboard/system-status`. |
| `CAREER_RUNTIME_ENVIRONMENT` | (unset) | Optional explicit environment override. |

No client-side flag contains a secret. Secrets (`OPENAI_API_KEY`, `LIBRECHAT_API_KEY`,
`NANGO_SECRET_KEY`, `OPENCLAW_API_KEY`) are server-side only. See `apps/applyflow/.env.example`.

## Preview environment (controlled pilot)

Use this matrix for a **Vercel preview** or local smoke that exercises Career Chat without
external providers. Do not add API keys or `DATABASE_URL` unless a real database is wired.

| Variable | Preview value | Scope | Notes |
|----------|---------------|-------|-------|
| `CAREER_RUNTIME_ENVIRONMENT` | `preview` | server | Explicit override; preview ≠ development |
| `CAREER_AGENTS_ENABLED` | `true` | server | Deterministic core (default on) |
| `CAREER_PILOT_MODE` | `true` | server | Pilot posture / logging |
| `NEXT_PUBLIC_CAREER_PILOT_MODE` | `true` | **client** | Pilot badge, notice, feedback UI |
| `CAREER_SYSTEM_STATUS_ENABLED` | `true` | server | Optional in preview (page is open when env ≠ production); required in production |
| `CAREER_LLM_ENABLED` | `false` | server | No OpenAI |
| `CAREER_LLM_PROVIDER` | `mock` | server | Deterministic, no network |
| `LIBRECHAT_ADAPTER_ENABLED` | **`true`** | server | **Required for Career Chat.** In-process boundary at `POST /career-chat/librechat`; not an external LibreChat server call |
| `LIBRECHAT_TRANSPORT_ENABLED` | `false` | server | Real LibreChat transport stays off |
| `CAREER_AUTOMATION_ENABLED` | `false` | server | No automation execution |
| `CAREER_AUTOMATION_PROVIDER` | `mock` | server | Stays mock in pilot |
| `OPENCLAW_ENABLED` | `false` | server | Stays off |
| `NEXT_PUBLIC_APP_VERSION` | `preview` | **client** | Build metadata |
| `NEXT_PUBLIC_COMMIT_SHA` | deploy commit (short) | **client** | Build metadata |
| `NEXT_PUBLIC_BUILD_TIMESTAMP` | ISO timestamp | **client** | Build metadata |

**Keep absent in preview:** `DATABASE_URL`, `OPENAI_API_KEY`, `LIBRECHAT_API_KEY`,
`LIBRECHAT_BASE_URL`, `NANGO_SECRET_KEY`, `OPENCLAW_API_KEY`, `OPENCLAW_BASE_URL`,
`CAREER_PROVIDER_RUNTIME_ENABLED`, `NANGO_RUNTIME_ENABLED`, `GMAIL_PROVIDER_ENABLED`,
`CALENDAR_PROVIDER_ENABLED`.

> **Common mistake:** setting `LIBRECHAT_ADAPTER_ENABLED=false` blocks Career Chat with
> `librechat_adapter_disabled` (HTTP 403). The adapter flag gates the **local** chat boundary;
> only `LIBRECHAT_TRANSPORT_ENABLED=true` (with server-side URL/key) reaches an external
> LibreChat instance.

Local smoke (after `pnpm install --frozen-lockfile`):

```bash
export CAREER_RUNTIME_ENVIRONMENT=preview \
  CAREER_AGENTS_ENABLED=true CAREER_PILOT_MODE=true NEXT_PUBLIC_CAREER_PILOT_MODE=true \
  CAREER_SYSTEM_STATUS_ENABLED=true CAREER_LLM_ENABLED=false CAREER_LLM_PROVIDER=mock \
  LIBRECHAT_ADAPTER_ENABLED=true LIBRECHAT_TRANSPORT_ENABLED=false \
  CAREER_AUTOMATION_ENABLED=false CAREER_AUTOMATION_PROVIDER=mock OPENCLAW_ENABLED=false \
  NEXT_PUBLIC_APP_VERSION=preview NEXT_PUBLIC_COMMIT_SHA=<sha> \
  NEXT_PUBLIC_BUILD_TIMESTAMP=<iso>
pnpm --filter applyflow dev   # port 3010
```

Validate: [`PILOT-VALIDATION.md`](./PILOT-VALIDATION.md) smoke checklist and
`/career-system/{livez,readyz,health}`.

## Production deployment checklist

1. `pnpm install --frozen-lockfile` and `pnpm -w run build` succeed.
2. `pnpm check:secrets`, `pnpm check:buttons`, `pnpm -w run lint:design-system` pass.
3. `GET /career-system/readyz` → `200 ready` (no required component misconfigured).
4. `GET /career-system/health` → `healthy`/`degraded` (not `unhealthy`).
5. External integrations remain default-off unless intentionally configured.
6. `OPENCLAW_ENABLED=false` and `CAREER_AUTOMATION_PROVIDER=mock`.
7. Build metadata env set; diagnostic page gated (`CAREER_SYSTEM_STATUS_ENABLED`).
8. Production deploy only after explicit human approval.

## Rollback procedure

1. Re-deploy the previous Vercel build (instant rollback) or `git revert` the release commit.
2. Flip risky flags off (`CAREER_LLM_ENABLED=false`, `LIBRECHAT_TRANSPORT_ENABLED=false`,
   `CAREER_AUTOMATION_ENABLED=false`) — defaults already off; no data migration required.
3. Confirm `/career-system/readyz` and `/career-system/health` after rollback.

Because the Career Suite is local-first with no silent persistence, rollback carries no data
backfill or destructive-migration risk.
