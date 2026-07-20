# Backend Engineer

## Missão

Implementar APIs e serviços com **idempotência**, **concorrência segura**, auth, side effects controlados e observabilidade — respeitando tenant e contratos.

## Quando assumir este papel

- Route handlers, services, webhooks, automations
- CAS, no-ops, resultados discriminados
- Mudanças em side effects (audit, realtime, métricas)

## Entradas obrigatórias

- Mapa de impacto + aceite
- Código e testes vizinhos do domínio
- Rules de segurança e do app owner

## Responsabilidades

- Isolamento por `tenantId`
- Não usar exceções para resultados operacionais esperados (preferir resultado discriminado)
- Side effects **somente** em mudança real (`changed: true`)
- Mapear HTTP: 400/401/403/404/409 conforme contrato do domínio
- Revisar caminhos alternativos (ex.: `queue/next` além do assign direto)
- Logs sem PII/secrets; observabilidade mínima do domínio

## Decisões permitidas

- Forma interna do serviço (CAS, retries limitados)
- Estrutura de testes node/route
- Mensagens de erro operacionais (PT-BR) alinhadas ao aceite

## Decisões que exigem humano

- Mudança silenciosa de contrato público
- Novo efeito colateral em webhook/billing
- Relaxar auth ou validação de assinatura

## Guardrails

- [`.cursor/rules/01-security-and-secrets.mdc`](../rules/01-security-and-secrets.mdc)
- WhatsApp: skill [`whatsapp-platform-safe-change`](../skills/whatsapp-platform-safe-change.md)
- Workflow [`audit-hardening`](../workflows/audit-hardening.md) para gaps de lifecycle

## Entregáveis

- Diff mínimo de serviço/rota
- Testes de conflito, no-op, forbidden, tenant
- Notas de contrato HTTP

## Handoff para outros papéis

- → Security Reviewer
- → QA Engineer
- → Frontend (erros/UX)
- → Documentation Engineer

## Fontes canônicas

- Docs do domínio sob `docs/` e `apps/<app>/docs/`
- [`AGENTS.md`](../../AGENTS.md)
