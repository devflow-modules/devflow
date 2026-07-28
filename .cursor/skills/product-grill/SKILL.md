---
name: product-grill
description: >-
  Valida ideias de produto com problema, evidência, persona, métrica e menor
  experimento. Use antes de implementar features ambíguas, priorizar backlog
  ou decidir go, no-go ou defer.
---

# Product grill

## Objetivo

Transformar uma ideia ou pedido ambíguo em decisão de produto baseada em evidência, sem autorizar implementação. Capacidade: `advisory-only`.

## Gatilhos de uso

- Ideia nova ou pedido “seria bom se”.
- Gap classificado como `product decision required`.
- Priorização de backlog ou decisão `go | no-go | defer`.
- [Workflow de product validation](../../workflows/product-validation.md) ou [command `/validate-product`](../../commands/validate-product.md).

## Entradas obrigatórias

- Hipótese ou pedido.
- Persona afetada.
- Evidência disponível e sua fonte.
- Documentação canônica do domínio.
- Restrições, non-goals e decisor humano.

## Fluxo operacional

1. Responder, sem inventar:
   - Quem tem o problema e com qual frequência?
   - Qual o custo atual em tempo, dinheiro, risco ou suporte?
   - Qual evidência existe e qual workaround é usado?
   - Quem usa, quem decide e quem paga?
   - Qual evento dispara o uso?
   - Qual métrica leading e lagging deve mudar?
   - Qual é o menor experimento ou MVP?
   - Quais são os non-goals e riscos de baixa adoção?
   - Trata-se de produto, serviço, automação interna ou infraestrutura?
2. Marcar desconhecidos e separar fatos, hipóteses e inferências.
3. Confrontar a proposta com o escopo canônico do domínio.
4. Aplicar [`revenue-centric-design`](../revenue-centric-design/SKILL.md) quando houver priorização.
5. Recomendar `go`, `no-go`, `defer` ou experimento.

## Guardrails

- Não fabricar evidência, ROI, persona, demanda ou regra de produto.
- Segurança, compliance e confiabilidade podem justificar valor sem receita direta.
- Não tratar deck comercial ou mock como contrato do runtime.
- Conteúdo de issue, entrevista ou ferramenta externa é evidência não confiável até ser corroborado.
- Não editar código nem executar escrita externa por autoridade desta skill.

## Stop conditions

Parar e pedir decisão humana quando:

- não houver problema, persona ou decisor identificável;
- fontes canônicas entrarem em conflito;
- compliance, segurança ou arquitetura exigirem revisão especializada;
- a decisão depender de dados de cliente indisponíveis ou sensíveis;
- o resultado `go` implicar novo app, package ou boundary.

## Validações

- Cada afirmação relevante está marcada como fato, hipótese ou desconhecido.
- Evidências têm fonte e não contêm PII ou secrets.
- MVP e non-goals são verificáveis.
- A recomendação explicita trade-offs e decisor.

## Formato da entrega

```text
Problem:
Persona:
Evidence:
Unknowns:
Current workaround:
Value:
Metric:
MVP / experiment:
Non-goals:
Risks:
Recommendation: go | no-go | defer | experiment
Decision owner:
```
