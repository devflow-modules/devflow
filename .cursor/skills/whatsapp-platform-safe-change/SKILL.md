---
name: whatsapp-platform-safe-change
description: >-
  Orienta mudanças seguras no WhatsApp Platform, incluindo auth, billing,
  isolamento por tenant, webhooks Meta e UI. Use ao alterar
  apps/whatsapp-platform ou contratos compartilhados consumidos pelo produto.
---

# WhatsApp Platform — mudança segura

## Objetivo

Executar mudanças autorizadas no runtime canônico do WhatsApp com impacto explícito, boundaries preservados e gates proporcionais ao risco. Capacidade: `action-enabled`.

## Gatilhos de uso

- Mudança em `apps/whatsapp-platform`.
- Mudança em package compartilhado que afete auth, billing, inbox, webhook Meta ou Cloud API.
- Correção ou feature em fluxo crítico do produto WhatsApp.

Não usar para reintroduzir `apps/whatsapp-webhook-api` (**RETIRED**, RP-3), nem para decisões de produto ainda sem aceite, nem para gate de ativação de cliente real Meta (usar [`whatsapp-client-onboarding`](../whatsapp-client-onboarding/SKILL.md)).

## Entradas obrigatórias

- Pedido e critérios de aceite.
- Owner correto da mudança.
- Documentação canônica aplicável:
  - [`AGENTS.md`](../../../AGENTS.md);
  - [rule do WhatsApp](../../rules/05-whatsapp-platform.mdc);
  - [rule de design](../../rules/whatsapp-platform-design.mdc), se houver UI;
  - [`CURRENT-SCOPE.md`](../../../docs/whatsapp-platform/CURRENT-SCOPE.md);
  - [`ARCHITECTURE.md`](../../../docs/whatsapp-platform/ARCHITECTURE.md).
- Ambiente e autorização necessários para qualquer ação externa.

## Fluxo operacional

1. Antes da primeira edição, preencher:

   ```text
   Domain:
   App owner:
   Shared package:
   Persistence:
   Tenant:
   Auth / roles:
   Audit:
   UI / cache:
   Minimum gates:
   Docs:
   Non-goals:
   ```

2. Inspecionar serviços, route handlers, middleware, componentes e testes vizinhos.
3. Localizar a regra no owner correto; compartilhar somente via `packages/*`.
4. Reproduzir bugs antes da correção e adicionar teste de regressão.
5. Implementar o menor diff que preserve tenant, auth, auditoria, idempotência e retries.
6. Atualizar documentação somente se capacidade, ownership ou operação mudar.
7. Executar os gates direcionados do owner e revisar o diff.

## Guardrails

- Nunca confiar em `tenantId`, `phoneNumberId`, role ou limites vindos apenas do cliente.
- Não relaxar auth, isolamento por tenant, assinatura de webhook ou idempotência.
- Não registrar tokens, payload assinado, sessão completa ou PII desnecessária.
- Não alterar schema Prisma, URLs canônicas de webhook/OAuth, middleware ou cutover sem pedido explícito e documentação aplicável.
- Não expor margens, billing interno ou identificadores sensíveis em UX white-label.
- Não importar um app a partir de outro app.

## Stop conditions

Parar e pedir decisão humana quando:

- owner, regra de produto ou critério de aceite estiver ambíguo;
- a mudança exigir novo app/package ou alteração estrutural;
- houver migration destrutiva ou acesso a produção;
- for necessário reduzir um controle de segurança;
- faltar secret, permissão ou ambiente externo;
- contratos reais contradisserem a documentação.

## Validações

- Lógica de domínio: Vitest direcionado no owner.
- UI: teste de UI, lint aplicável e verificação visual nas larguras relevantes.
- Inbox: testes node/UI e E2E de inbox disponíveis para o fluxo.
- Webhook Meta: regressão de challenge, assinatura e retry; smoke/health checks existentes quando o ambiente permitir.
- Billing: regressão e revisão de idempotência no app e em `packages/billing-core`.
- Prisma: usar [`prisma-safe-migration`](../prisma-safe-migration/SKILL.md).
- Nunca declarar sucesso para gate não executado; registrar `pass`, `fail`, `blocked` ou `not run`.

## Formato da entrega

```text
Impact map:
Changes:
Tests run:
Manual checks:
Security / tenant:
Docs:
Blocked / not run:
Risks / deferred:
```
