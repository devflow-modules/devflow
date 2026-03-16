# Investiga+ — Real integration summary

## Ported flows

- **Auth:** Login (email/senha, bcrypt, JWT in HttpOnly cookie, 24h), logout (clear cookie), GET /api/auth/verify. Middleware protects /dashboard/* and redirects to /login.
- **CNPJ:** Validate CNPJ → check cache (dados_cnpj) → on miss call ReceitaWS (up to 3 retries with delay) → handle 200/404/429/502 → persist cache and consulta (Pendente → Consultado/Erro). Response shape: consultado, consulta, empresa.
- **History:** List consultas by user CPF with filters (page, limit, status, dataInicio, dataFim, nome, cnpj). Returns rows with criadoFormatado (locale string).
- **Profile:** GET/PUT /api/perfil. Completion percentage (nome, telefone, nascimento, cidade, uf, genero). When all filled and bonus_concedido_at is null, set bonus_concedido_at and return bonusConcedido: true. formatName (capitalise words).
- **Webhook:** POST /api/webhooks/compra-confirmada. event === "SALE_APPROVED", validate email/CPF, idempotent (existing user → success). New user: random password, hash, createUser, log in dev (email send TODO).

## Database (Supabase)

- **users:** id, email, senha_hash, cpf, nome, telefone, nascimento, cidade, uf, genero, role, bonus_concedido_at, created_at, updated_at.
- **consultas:** id, cpf, cnpj, nome, status (Pendente/Consultado/Erro), criado_em.
- **dados_cnpj:** cnpj (pk), dados (jsonb), updated_at.

Schema: `apps/investigamais/supabase/schema.sql`.

## API routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/login | No | body: email, password → Set-Cookie + user |
| POST | /api/auth/logout | No | Clear cookie |
| GET | /api/auth/verify | Cookie | Current user or 401 |
| GET | /api/consulta/:cnpj | Yes | Query CNPJ (cache + ReceitaWS) |
| GET | /api/consulta | Yes | List history (query params) |
| GET | /api/perfil | Yes | Get profile + completion |
| PUT | /api/perfil | Yes | Update profile + bonus logic |
| POST | /api/webhooks/compra-confirmada | No | SALE_APPROVED → create user |
| GET | /api/ops/metrics | No | product, users, queries, cacheHitRate |

## Analytics (@devflow/analytics-core)

Events: investiga.cnpj_query_requested, investiga.cnpj_cache_hit, investiga.cnpj_cache_miss, investiga.cnpj_query_completed, investiga.user_login, investiga.user_logout, investiga.history_viewed, investiga.profile_updated, investiga.webhook_received, investiga.webhook_user_created.

## Ops metrics

GET /api/ops/metrics returns: product "investigamais", users (count), activeSubscriptions 0, pendingCancellation 0, mrr 0, queries (consultas count), cacheHitRate (from getCounters cache_hit / (cache_hit + cache_miss)).

## Environment

See apps/investigamais/.env.example: JWT_SECRET, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RECEITAWS_API_URL, COOKIE_DOMAIN.

## Deviations

- No Chakra UI in initial port (Tailwind used); can be added for pixel-perfect match.
- Onboarding email after webhook user creation is TODO (logged in dev).
- RLS policies are permissive; tighten for production.
