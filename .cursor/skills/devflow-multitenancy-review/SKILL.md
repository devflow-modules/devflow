---
name: devflow-multitenancy-review
description: >-
  Reviews multi-tenant isolation across auth, queries, webhooks and app
  boundaries. Use when auditing tenant scoping, reviewing cross-tenant risk,
  or checking that client-supplied IDs are never authoritative.
---

# DevFlow — multitenancy review

## Objetivo

Revisar isolamento multi-tenant em diffs ou domínios sensíveis: confirmar autoridade do tenant no servidor, filtros de persistência, resolução de webhook e boundaries entre apps. Capacidade: `action-enabled` com default **review-only** (findings); editar código só com autorização explícita.

## Gatilhos de uso

- PR/diff em auth, inbox, billing, webhook, admin, assignment/ownership ou schema com dados de cliente.
- Workflow [`audit-hardening`](../../workflows/audit-hardening.md) / commands [`/audit-domain`](../../commands/audit-domain.md), [`/review-pr`](../../commands/review-pr.md).
- Pedido explícito de review de tenant, cross-tenant ou elevação admin.
- Mudanças WhatsApp em `apps/whatsapp-platform` ou packages compartilhados (`whatsapp-core`, `billing-core`).

Não usar para inventar regra de produto, implementar feature em `apps/whatsapp-webhook-api` (`legacy-compatible`), nem misturar com recovery operacional de E2E.

## Entradas obrigatórias

- Diff completo das superfícies sensíveis (ou domínio + mapa de impacto).
- [`AGENTS.md`](../../../AGENTS.md) e [segurança/segredos](../../rules/01-security-and-secrets.mdc).
- Papel [`security-reviewer`](../../agents/security-reviewer.md).
- Quando WhatsApp: [rule](../../rules/05-whatsapp-platform.mdc), [`ARCHITECTURE.md`](../../../docs/whatsapp-platform/ARCHITECTURE.md), [`INBOX_PORT_MULTI_TENANT.md`](../../../docs/whatsapp-platform/INBOX_PORT_MULTI_TENANT.md), [`SECURITY-MODEL.md`](../../../apps/whatsapp-platform/docs/SECURITY-MODEL.md), [`WHATSAPP-ARCHITECTURE-GUARDRAILS.md`](../../../docs/architecture/WHATSAPP-ARCHITECTURE-GUARDRAILS.md).
- Quando schema/queries: [Prisma rule](../../rules/04-prisma-database.mdc).
- Skill de domínio se aplicável: [`whatsapp-platform-safe-change`](../whatsapp-platform-safe-change/SKILL.md).

## Fluxo operacional

1. Mapear o caminho UI → route/handler → service → persistence → audit (como em audit-hardening).
2. Declarar a **fonte de autoridade do tenant** no diff:
   - sessão/JWT resolvida no servidor;
   - webhook inbound via `phone_number_id` → tenant válido;
   - elevação admin / platform path (documentar risco e aceite);
   - outro — só se documentado no domínio.
3. No WhatsApp Platform, isolation root canônico é `Tenant` / `tenantId` (não inventar `Organization` se o schema do app não a usar).
4. Inspecionar `where`/filtros em leituras e escritas de dados de cliente; caminhos alternativos (`admin/*`, automation, `queue/next`, claim/transfer/release).
5. Verificar boundaries:
   - UI/cliente sem authz autoritativa;
   - portal `src/` sem Prisma WhatsApp / sem imports de `apps/whatsapp-platform`;
   - webhook sem processar inbound sem tenant válido;
   - audit presente em mudanças sensíveis (não no-op silencioso).
6. Classificar findings (`block` | `follow-up`) e emitir veredito `safe` | `safe with follow-up` | `block`.
7. Em modo review/audit: **não editar**. Corrigir só se o usuário autorizar explicitamente.

## Guardrails

- Não confiar em `tenantId`, `phoneNumberId`, role ou limites de plano vindos só do cliente.
- Não aceitar query de dados de cliente sem escopo de tenant conforme o modelo do app.
- Não tratar UI, deck comercial ou mock como autoridade de isolamento.
- Não misturar DB do portal (ex. Lead/CRM) com DB WhatsApp Tenant como se fossem a mesma autoridade.
- Não enfraquecer auth, assinatura de webhook, idempotência ou audit “para facilitar”.
- Não colar secrets, payloads assinados, dumps ou PII real no relatório.
- Não expor cross-tenant “temporário” sem decisão humana explícita.

## Stop conditions

Parar e escalar quando:

- aceite de produto ou escopo de `platform_admin` cross-tenant estiver ambíguo;
- for pedido relaxar isolamento, auth ou webhook;
- docs canônicas contradisserem o contrato real no código;
- correção exigir redesign estrutural / novo boundary sem confirmação;
- modo review-only / `/audit-domain` e a correção ainda não estiver autorizada;
- ambiente ou evidência exigir produção ou dados reais de cliente.

## Validações

- Achados ligados a path + evidência no diff (não genéricos).
- Caminhos alternativos relevantes revisados ou marcados `not run` com motivo.
- Testes de isolamento/forbidden vizinhos: `pass` | `fail` | `blocked` | `not run`.
- Boundary CI / docs de guardrail citados quando a superfície portal↔app mudar.
- Nunca reportar skipped como sucesso.
- Edits: `none` ou resumo só se autorizados.

## Formato da entrega

```text
Scope / surfaces:
Tenant authority source: session | phone_number_id | admin elevation | other
Findings:
  - [block|follow-up] path — issue — evidence
Alternative paths reviewed:
Query / where coverage:
Portal↔app boundary:
Webhook resolution:
Auth / roles:
Audit trail:
Verdict: safe | safe with follow-up | block
Tests: pass | fail | blocked | not run
Docs cited:
Authorized edits: none | <summary>
Product decisions required:
Deferred / out of scope:
```
