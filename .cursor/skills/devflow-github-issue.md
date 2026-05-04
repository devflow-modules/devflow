---
name: devflow-github-issue
description: >-
  Guia para abrir issues GitHub bem delimitadas para Cursor ou Cloud Agents no
  monorepo DevFlow Labs. Usar quando o utilizador pedir para criar issue,
  triar trabalho para agente, ou alinhar labels antes de implementação.
---

# DevFlow — Issue GitHub para Cursor / Cloud Agent

Leia primeiro [`AGENTS.md`](../../AGENTS.md) na raiz. Para labels e exemplos, use [`docs/operations/GITHUB_LABELS.md`](../../docs/operations/GITHUB_LABELS.md).

## Instruções

1. **Escolher o template correcto** em GitHub → *Issues* → *New issue*:
   - funcionalidade → `Cursor — Nova funcionalidade`
   - bug → `Cursor — Correção de bug`
   - refactor → `Cursor — Refactor`
   - só revisão de PR → `Cursor — Revisão (PR / código)`
2. **Preencher** com critérios de aceitação ou reprodução claros; **nunca colar secrets** (tokens Meta/Stripe, `DATABASE_URL`, JWT, webhooks assinados, PII real). Usar redacção e exemplos fictícios.
3. **Depois de criar o issue**, aplicar **manualmente** no GitHub: um `area:*`, um `type:*`, todos os `risk:*` aplicáveis, estado `cursor:*` e `needs:*` se fizer sentido (os formulários não substituem labels reais).
4. **`cursor:ready`** — só quando âmbito, critérios de aceitação e superfícies de risco estão explícitos; o agente pode começar sem perguntas bloqueantes.
5. **`cursor:needs-plan`** — quando há incerteza de arquitectura, impacto em webhook/billing/tenant, ou vários caminhos possíveis; primeiro plano humano ou agente em modo plano, depois `cursor:ready`.
6. **`cursor:do-not-edit-env`** e **`cursor:do-not-touch-db`** — marcar sempre que o trabalho não deve tocar em `.env*` ou em migrações/schema Prisma.

## Expectativas de validação

- O issue deve permitir a um revisor verificar “feito / não feito” sem abrir o código.
- Listar testes ou smoke esperados (Vitest direccionado, rotas, fluxo manual mínimo) quando relevante.

## Não fazer

- Não colar credenciais nem dumps de produção no corpo do issue.
- Não marcar `cursor:ready` com critérios vagos ou sem área principal.
- Não omitir `risk:*` quando o trabalho possa afectar auth, billing, DB, webhooks ou isolamento por tenant.

## Princípios gerais

- Inspeccionar issues ou PRs existentes semelhantes antes de duplicar escopo.
- Preferir **diffs pequenos e revistos**; um tema por issue quando possível.
