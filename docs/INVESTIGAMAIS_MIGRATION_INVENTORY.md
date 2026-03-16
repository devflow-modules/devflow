# Investiga+ — Migration inventory

Source repository (reference): **TraffikPro/investiga-mais**  
Target: **apps/investigamais** inside DevFlow Labs monorepo.

## Source stack (from blueprint)

- **Frontend:** Next.js 15, React 19, Chakra UI, Framer Motion. Pages: login, dashboard, dashboard/consulta, dashboard/historico, dashboard/perfil. UserContext, useAuth, apiFetchJSON.
- **Backend:** Express 5, Prisma ORM, SQLite (DadosCNPJ cache), PostgreSQL (primary). JWT in HttpOnly cookie, 24h expiry. Middleware verifyToken, helper somenteRoles (cliente, operador, admin).
- **Auth:** authService (bcrypt compare, JWT sign), login/logout/verify routes.
- **CNPJ flow:** consultaService — check cache (prisma.dadosCNPJ), else ReceitaWS up to 3 retries with delay; 404 → "Ainda não temos informações…", 429 → "Limite de consultas…"; save cache, create consulta (Pendente → Consultado/Erro).
- **Profile:** perfilService — nome, telefone, nascimento, cidade, UF, genero; first-time completion sets bonusConcedidoAt and grants bonus. obterPerfilService returns formatted name.
- **Webhook:** /compra-confirmada — SALE_APPROVED; validate email/CPF; if user exists return success; else create user (random password, hash), send onboarding email (log in dev). Idempotent.
- **History:** list consultas with filters (status, date, name, CNPJ), pagination, criadoFormatado.

## Mapping to DevFlow apps/investigamais

| Source area | Target module / route |
|-------------|------------------------|
| authService, login, verifyToken, cookie | modules/auth |
| consultaService, cache, ReceitaWS | modules/cnpj |
| consulta list + filters | modules/history |
| perfilService, bonus | modules/users/profile |
| webhook compra-confirmada | modules/webhooks |
| Event tracking | modules/analytics (@devflow/analytics-core) |
| Cross-cutting | modules/domain |
| Express routes | Next.js API routes under app/api/ |
| Prisma models | Supabase tables (users, consultas, dados_cnpj) |

## API routes (target)

- POST /api/auth/login — body: email, password → set cookie, return user
- POST /api/auth/logout — clear cookie
- GET /api/auth/verify — return current user or 401
- GET /api/consulta/:cnpj — query CNPJ (auth required)
- GET /api/consulta — list consultas with query params (auth required)
- GET /api/perfil — get profile (auth required)
- PUT /api/perfil — update profile (auth required)
- POST /api/webhooks/compra-confirmada — webhook payload
- GET /api/ops/metrics — product, users, queries, cacheHitRate, etc.

## Database (Supabase)

- users (id, email, senha_hash, cpf, nome, telefone, nascimento, cidade, uf, genero, role, bonus_concedido_at)
- consultas (id, cpf, cnpj, nome, status, criado_em)
- dados_cnpj (cnpj pk, dados jsonb)

## Environment variables

- JWT_SECRET, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
- RECEITAWS_API_URL (or equivalent), COOKIE_DOMAIN
- EMAIL_PROVIDER (e.g. Resend) if onboarding email is sent
