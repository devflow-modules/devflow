# /audit-domain

## Objetivo

Auditar um domínio **sem editar código**.

## Entradas

- Domínio (ex.: inbox assignment, status lifecycle)
- Owner do app

## Processo

Seguir [`../workflows/audit-hardening.md`](../workflows/audit-hardening.md) até à classificação — **parar antes da implementação**.

Inspecionar UI → API → service → persistence → audit → realtime → tests → docs.

Se a superfície for multi-tenant (authz, Prisma, webhook, jobs, ownership): aplicar skill [`devflow-multitenancy-review`](../skills/devflow-multitenancy-review/SKILL.md) e incorporar o veredito `APPROVE` | `FIX` | `BLOCK` na saída.

Se o domínio for onboarding/ativação de cliente real no WhatsApp Business Platform (Meta Portfolio, WABA, número, tokens, webhook de cliente): aplicar skill [`whatsapp-client-onboarding`](../skills/whatsapp-client-onboarding/SKILL.md) e incorporar o veredito `APPROVE` | `FIX` | `BLOCK` na saída.

## Saída obrigatória

Lista de achados classificados:

```text
acceptable current behavior
confirmed gap
documentation gap
test coverage gap
product decision required
out of scope
```

Incluir caminhos alternativos e riscos de concorrência/no-op.

## Restrições

- **Proibido editar**, commitar ou “já corrigir”
- Gaps de produto exigem decisão humana antes de qualquer PR de fix
