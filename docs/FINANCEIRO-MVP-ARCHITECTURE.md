# Arquitetura MVP — Módulo Financeiro DevFlow

**Captura de estado:** março 2025, antes do desligamento do app antigo.

Este documento descreve a arquitetura atual do módulo financeiro integrado ao DevFlow Labs.

---

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 15, React, TypeScript, Tailwind v4 |
| Backend | Next.js API Routes |
| ORM | Prisma |
| Banco | PostgreSQL (via Supabase ou externo) |
| Auth | Supabase Auth (OAuth + email/senha) |
| Estado | React Context (HouseholdProvider) |
| Toasts | Sonner |

---

## Camadas

```
┌─────────────────────────────────────────────────────────┐
│  Páginas (app/ferramentas/financeiro/...)               │
├─────────────────────────────────────────────────────────┤
│  Componentes (components/financeiro/)                   │
│  - AppShell, Sidebar, Breadcrumbs, Charts, Forms        │
├─────────────────────────────────────────────────────────┤
│  Providers (HouseholdProvider)                          │
├─────────────────────────────────────────────────────────┤
│  API Routes (app/api/...)                               │
├─────────────────────────────────────────────────────────┤
│  Libs (lib/financeiro/)                                 │
│  - db, schema, auth, supabase, api-response, household  │
├─────────────────────────────────────────────────────────┤
│  Prisma + PostgreSQL                                    │
└─────────────────────────────────────────────────────────┘
```

---

## Fluxo de autenticação

1. Usuário acessa `/ferramentas/financeiro/auth`
2. Login via Supabase (OAuth ou email/senha)
3. Callback em `/ferramentas/financeiro/auth/callback`
4. Middleware valida sessão em rotas protegidas
5. Sem sessão → redireciona para `/ferramentas/financeiro/auth`

**Rotas protegidas:** dashboard, expenses, sources, rules, settings, onboarding, invites/accept (para aceitar).

---

## Fluxo de household

1. Usuário logado sem household → `/ferramentas/financeiro/onboarding`
2. Cria household (nome + slug)
3. POST `/api/households` → cria casa e membership OWNER
4. Household ativa armazenada em cookie/session (active-household)
5. `HouseholdProvider` carrega households + active via `/api/me` e `/api/me/active-household`
6. Troca de casa → PATCH `/api/me/active-household`

---

## Rotas do app

| Rota | Pública? | Descrição |
|------|----------|-----------|
| `/ferramentas/financeiro` | Sim | Landing das ferramentas (divisão, projeção, despesas fixas) |
| `/ferramentas/financeiro/auth` | Sim | Login/cadastro |
| `/ferramentas/financeiro/auth/callback` | Sim | Callback OAuth |
| `/ferramentas/financeiro/dashboard` | Não | Resumo, gráficos, metas, convites |
| `/ferramentas/financeiro/onboarding` | Não | Criar primeira casa |
| `/ferramentas/financeiro/expenses` | Não | Receitas e despesas |
| `/ferramentas/financeiro/sources` | Não | Fontes PJ/PF, ciclos, dias de recebimento |
| `/ferramentas/financeiro/rules` | Não | Regras de rateio |
| `/ferramentas/financeiro/settings` | Não | Membros, convites, transferência |
| `/ferramentas/financeiro/invites/accept` | Parcial | Aceitar convite (token na URL) |

---

## Layout condicional

- **Rotas do app (dashboard, sources, etc.):** AppShell + Sidebar + HouseholdProvider + Toaster
- **Rotas públicas (auth, landing):** Fragmento sem AppShell
- **Header/Footer do DevFlow:** ocultos nas rotas do app (via BodyChrome ou equivalente)

---

## Permissões

| Role | Pode |
|------|------|
| OWNER | Tudo: convites, transfer ownership, metas da família, remover membros |
| MEMBER | Ver/editar fontes, receitas, despesas, regras; metas pessoais; trocar casa; sair |

---

## Referências

- [FINANCEIRO-API-MAP.md](./FINANCEIRO-API-MAP.md) — Mapa completo das APIs
- [FINANCEIRO-DATA-MODEL.md](./FINANCEIRO-DATA-MODEL.md) — Modelo de dados
- [MIGRACAO-FINANCEIRO-100-STATUS.md](./MIGRACAO-FINANCEIRO-100-STATUS.md) — Status da migração
