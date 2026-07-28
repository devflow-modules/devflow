# /validate-product

## Objetivo

Executar validação de produto (go/no-go) antes de implementar.

## Entradas

- Ideia / hipótese / pedido ambíguo

## Processo

Seguir workflow [`../workflows/product-validation.md`](../workflows/product-validation.md) usando:

- [`product-grill`](../skills/product-grill/SKILL.md)
- [`revenue-centric-design`](../skills/revenue-centric-design/SKILL.md)
- [`devflow-product-evidence`](../skills/devflow-product-evidence/SKILL.md) se o input for resultado medido / pós-piloto

## Saída obrigatória

Pré-build: saídas de grill + revenue + `Decision: go | no-go | defer`.
Pós-evidência: saída de product-evidence + `Decision: SCALE | ITERATE | STOP | BLOCK`.

## Restrições

- Não escrever código de feature nesta etapa
- Não inventar evidência de mercado
