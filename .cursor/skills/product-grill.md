---
name: product-grill
description: >-
  Validação rigorosa de ideias de produto no monorepo DevFlow. Usar antes de
  implementar features ambíguas, priorizar backlog ou decidir go/no-go.
---

# Product grill

Skill de **interrogatório de produto**. Não substitui CURRENT-SCOPE nem aceita inventar regra.

## Quando usar

- Ideia nova ou “seria bom se…”
- Gap classificado como `product decision required`
- Workflow [`product-validation`](../workflows/product-validation.md) / command [`validate-product`](../commands/validate-product.md)

## Perguntas mínimas

1. Quem tem o problema?
2. Com que frequência ocorre?
3. Qual o custo atual (tempo, dinheiro, risco, suporte)?
4. Qual evidência existe (uso, tickets, métricas)?
5. Qual workaround hoje?
6. Quem paga / quem é o comprador interno?
7. Qual evento dispara o uso?
8. Qual métrica melhora se resolvermos?
9. O que explicitamente **não** fazer?
10. Qual o menor teste possível (MVP)?
11. Há risco de feature sem adoção?
12. É produto, serviço, automação interna ou infraestrutura?

## Processo

1. Responder às perguntas com o que for conhecido; marcar desconhecido
2. Confrontar com docs canônicas do domínio (não contradizer CURRENT-SCOPE sem escalar)
3. Produzir recomendação

## Saída obrigatória

```text
Problem:
Persona:
Evidence:
Current workaround:
Value:
Metric:
MVP:
Non-goals:
Risks:
Recommendation:
```

## Guardrails

- Sem evidência → preferir `defer` ou experimento mínimo
- Segurança/compliance podem ser valor mesmo sem receita direta (ligar a [`revenue-centric-design`](./revenue-centric-design.md))
- Não autorizar implementação sozinho se Architect/Security forem necessários
