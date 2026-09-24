# ADR — ApplyFlow Persistence V2 (local + cloud)

**Status:** Accepted (F1 foundation)  
**Data:** 2026-03-24  
**Supersedes (parcialmente):** comportamento exclusivamente local-first para utilizadores autenticados quando V2 estiver activo.

## Contexto

ApplyFlow V1 entregou valor com dados no dispositivo (ADR local-first). O incidente TrueLogic/Flavia demonstrou que dados críticos existiam apenas no browser habitual do utilizador — inacessíveis a outros browsers, ao servidor ou a operadores autorizados.

## Decisão

1. **V1 permanece** o default (`APPLYFLOW_PERSISTENCE_V2` OFF): Gate A, localStorage, extensão inalterados.
2. **V2 opt-in:** utilizador autenticado (Supabase Auth) com **PostgreSQL dedicado ApplyFlow** como source of truth para dados cloud.
3. **Extensão:** fora do escopo F1; sync cloud da extensão fica para fases posteriores.
4. **Sem partilha de schema** com Financeiro ou WhatsApp Platform.

## Consequências

- Novo boundary `apps/applyflow` (Supabase SSR, Prisma, `/api/applyflow/v2/*`).
- Migração V1→V2 obrigatória antes de cutover (F4).
- LGPD/consentimento explícito para modo cloud (documentação produto / termos — fora deste ADR técnico).

## Alternativas rejeitadas

- Copiar schema multi-tenant WhatsApp — domínio e risco operacional diferentes.
- PostgreSQL partilhado com Financeiro — acoplamento e blast radius.
