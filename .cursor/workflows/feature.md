# Workflow — Feature

## Quando usar

Nova capacidade ou mudança de comportamento planejada, com aceite claro.

## Não usar quando

- Bug pontual → [`bugfix`](./bugfix.md)
- Só auditoria → [`audit-hardening`](./audit-hardening.md)
- Ideia sem validação → [`product-validation`](./product-validation.md) primeiro
- Migration de schema → [`migration`](./migration.md)

## Papéis envolvidos

```text
Product Owner
→ Platform Architect
→ implementação (Frontend / Backend / Database conforme superfície)
→ Security Reviewer
→ QA Engineer
→ Documentation Engineer
→ Release Manager
```

## Pré-condições

- Problema real articulado
- Owner do app identificado
- Mapa de impacto (`/map-impact`)
- Critérios de aceite
- Leitura das rules/skills do domínio

## Etapas

1. Product Owner: problema, aceite, non-goals
2. Architect: boundaries e contratos
3. Implementação mínima por área
4. Security review nas superfícies sensíveis
5. QA: testes + gates
6. Docs canônicas (só as necessárias)
7. Release readiness + PR

## Gates

Os do app owner e rules aplicáveis — ver [`.cursor/README.md`](../README.md) §5 e skills do domínio (ex. `whatsapp-platform-safe-change`).

## Critério de saída

- Aceite coberto por testes ou evidência explícita
- Docs alinhadas (se contrato mudou)
- CI honesto no PR
- Riscos/deferred listados

## Fora de escopo

Refactor amplo não pedido; novos apps/packages; mudanças de CI sem instrução.

## Template de entrega

```text
Problem:
Owner:
Impact map: (link ou bloco)
Acceptance:
Tests run:
Docs updated:
Risks / deferred:
PR:
```
