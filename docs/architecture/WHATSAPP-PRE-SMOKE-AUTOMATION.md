# WhatsApp Platform — automação pré-smoke

Objetivo: máxima cobertura por **CI e testes** antes do smoke manual em produção.

## Workflows GitHub (raiz do repo)

| Workflow | Função |
|----------|--------|
| `ci.yml` | pnpm (versão via `packageManager`), lint, testes raiz |
| `routing-governance-check.yml` | Rotas Next ↔ governança |
| `whatsapp-architecture-guard.yml` | Fronteira portal / `whatsapp-platform` |
| `validate-whatsapp-cutover.yml` | URLs / cutover (input `WHATSAPP_APP_URL`) |

**Apps/whatsapp-platform:** executar localmente ou no CI do monorepo conforme configuração do projeto:

```bash
cd apps/whatsapp-platform && pnpm exec vitest run
```

Estado esperado: **todos os testes a verde** (baseline atual: 49 ficheiros / 178 testes).

## Blocos cobertos por testes recentes

- **Auth API** — login, verify, logout, forgot-password, reset-password; JSON inválido → 400
- **Webhook handler** — GET challenge, POST inválido, payloads não normalizáveis, tenant ausente (mock)
- **Billing API** — `ai-usage-status` com mock de overage; outros testes em `api/billing/*` e `modules/billing/*`
- **IA automação** — `aiAutomationService` com mocks de `getAiUsageStatus` e `billAiOverageIfApplicableAsync`

## Correções de mocks (baseline)

- Rotas admin `export` que usam `requireRole`: mocks de `@/modules/auth` devem exportar `requireRole: () => null` quando o teste simula admin permitido.

## O que continua só no smoke manual

- Cookies e domínio real
- Meta webhook de ponta a ponta com número oficial
- Stripe live / portal em produção
- Percepção de UX e mobile real

Ver [`WHATSAPP-PRODUCTION-SIGNOFF.md`](./WHATSAPP-PRODUCTION-SIGNOFF.md) para registo final.
