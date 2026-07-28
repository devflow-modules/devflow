---
name: devflow-incident-diagnostics
description: >-
  Runs fail-closed incident diagnostics with sanitized evidence and runbook-backed
  mitigation. Use for production or pilot incidents; default is review-only, and
  mitigations require explicit human approval.
---

# DevFlow — incident diagnostics

## Objetivo

Diagnosticar incidentes (produção ou piloto) com veredito `CONTINUE` | `MITIGATE` | `ESCALATE` | `BLOCK`, evidências sanitizadas e rollback citado em runbook existente. Capacidade: `action-enabled com aprovação`. Default: **review-only** (reproduzir, classificar, reportar). Mitigações (redeploy, rotate secret, Meta/Stripe, env, cutover reverso) **só** com autorização humana explícita.

## Gatilhos de uso

- Sintomas em webhook Meta/Stripe, auth/sessão, billing, IA, DB, isolamento tenant ou pós-deploy.
- Playbook [`INCIDENT_RESPONSE.md`](../../../apps/whatsapp-platform/docs/ops/INCIDENT_RESPONSE.md) ou equivalente do domínio.
- Handoff de [`security-reviewer`](../../agents/security-reviewer.md), [`qa-engineer`](../../agents/qa-engineer.md), [`release-manager`](../../agents/release-manager.md) ou [`backend-engineer`](../../agents/backend-engineer.md).
- Workflows [`bugfix`](../../workflows/bugfix.md) / [`audit-hardening`](../../workflows/audit-hardening.md) quando o pedido for incidente operacional.

Não usar para: implementar features, onboarding de cliente Meta ([`whatsapp-client-onboarding`](../whatsapp-client-onboarding/SKILL.md)), release planejado ([`devflow-safe-release`](../devflow-safe-release/SKILL.md)), E2E inbox local ([`whatsapp-e2e-safe-gate`](../whatsapp-e2e-safe-gate/SKILL.md)), ou inventar comandos/scripts ausentes.

## Entradas obrigatórias

- App/owner (`apps/whatsapp-platform` | `apps/financeiro` | portal | outro) e ambiente (`dev` | `staging` | `production`). Ambíguo → `BLOCK`.
- Impacto: 1 tenant / multi / 1 canal; janela temporal; `trace_id` / `tenant_id` **opacos** quando disponíveis.
- Runbook canônico **presente no tree** para o domínio. Exemplos WhatsApp:
  - [`INCIDENT_RESPONSE.md`](../../../apps/whatsapp-platform/docs/ops/INCIDENT_RESPONSE.md);
  - [`GO_LIVE_WHATSAPP_PLATFORM.md`](../../../apps/whatsapp-platform/docs/ops/GO_LIVE_WHATSAPP_PLATFORM.md);
  - [`PILOT-RUNBOOK.md`](../../../docs/whatsapp-platform/PILOT-RUNBOOK.md) (§ rollback);
  - [`WHATSAPP-WEBHOOK-HARDENING.md`](../../../docs/architecture/WHATSAPP-WEBHOOK-HARDENING.md);
  - [`WHATSAPP-AUTH-VALIDATION.md`](../../../docs/architecture/WHATSAPP-AUTH-VALIDATION.md);
  - [`PRODUCTION_CHECKLIST.md`](../../../docs/whatsapp/PRODUCTION_CHECKLIST.md) quando aplicável.
- Autorização: review-only por default; mandato explícito para qualquer mitigação produtiva.
- [`AGENTS.md`](../../../AGENTS.md) e [segurança/segredos](../../rules/01-security-and-secrets.mdc).

## Fluxo operacional

1. **Reproduce**
   - Confirmar impacto e janela (deploy, env, aleatório).
   - Correlacionar por `trace_id` / `event_type` / `tenant_id` opaco conforme o playbook.
   - Usar apenas checklists/scripts documentados no tree. Entrypoint obrigatório ausente → `BLOCK` / `not run` (não improvisar).

2. **Classify**
   - Classe: webhook Meta | Stripe | auth | IA | DB/pooler | tenant-isolation | config/env | deploy | outro documentado.
   - Severidade e escopo de tenants/canais afetados.
   - Separar fato observado | hipótese | inferência.

3. **Evidence (sanitized)**
   - Status HTTP, event names, códigos, presença/ausência de linhas de log — **sem** tokens, bodies assinados, passwords, connection strings com credencial, OTP, telefones ou corpo de mensagem.
   - Cada check: `pass` | `fail` | `blocked` | `not run` | `skipped` (+ motivo).

4. **Mitigate (só se autorizado)**
   - Seguir passos do runbook citado (ex. desactivar webhook → pausar automação → rotate → redeploy → preservar logs — conforme `PILOT-RUNBOOK` / `INCIDENT_RESPONSE`).
   - Sem mandato → recomendar mitigação, veredito `MITIGATE` ou `ESCALATE`, **não executar**.
   - Cross-tenant → handoff [`devflow-multitenancy-review`](../devflow-multitenancy-review/SKILL.md); fix de código → [`whatsapp-platform-safe-change`](../whatsapp-platform-safe-change/SKILL.md) / bugfix; re-go-live → [`devflow-safe-release`](../devflow-safe-release/SKILL.md).

5. **Follow-up**
   - Checklist pós-incidente do playbook; owners; regressão pedida; risco residual.
   - Não apagar conversas/DB como “fix”.

## Guardrails

- Fail-closed; least privilege; review-only até autorização.
- Nunca colar `.env`, JWT, `whsec_`, secrets Meta, payload assinado ou PII.
- Nunca misturar Stripe LIVE/TEST sem evidência; nunca sugerir skip de assinatura de webhook em produção.
- Nunca inventar health/smoke/command ausente no tree.
- Nunca write em produção, rotate secret, Meta/Stripe dashboard, migrate ou redeploy sem aprovação explícita.
- Automações Cursor: review-only ([`CURSOR_AUTOMATIONS.md`](../../../docs/operations/CURSOR_AUTOMATIONS.md)); MCP sem production write ([`MCP.md`](../../MCP.md)).

## Stop conditions

Parar com `BLOCK` / escalar humano quando:

- entrypoint ou runbook obrigatório ausente;
- logs/acesso necessários indisponíveis e evidência sanitizada insuficiente;
- ambiente ambíguo (prod vs non-prod);
- mitigação produtiva pedida sem aprovação;
- rollback indefinido para a ação proposta;
- evidência exigiria secrets/PII no relatório;
- suspeita cross-tenant sem escopo de review;
- pedido para inventar comando ou “só reiniciar produção” sem diagnóstico.

## Validações

- Fases reproduce/classify/evidence/mitigate/follow-up classificadas com status honestos.
- Paths e scripts citados existem no tree no momento da avaliação.
- Correlação por `trace_id` quando disponível.
- Veredito coerente com o pior bloqueante.
- Se mitigação autorizada: revalidar smoke/checklist do domínio e registrar resultado.

## Formato da entrega

```text
verdict: CONTINUE | MITIGATE | ESCALATE | BLOCK
mode: review-only | mitigate-approved
App / env / impact (opaque ids):
Class / severity:
Reproduce:
Evidence (sanitized):
Mitigation (runbook cite | recommended-only | executed | blocked):
Rollback path (doc §):
Follow-up / owners:
Related skills:
Residual risks:
Authorized actions: none | <summary>
```
