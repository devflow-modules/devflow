# /validate-product

## Objetivo

Executar validação de produto (go/no-go) antes de implementar.

## Entradas

- Ideia / hipótese / pedido ambíguo

## Processo

Seguir workflow [`../workflows/product-validation.md`](../workflows/product-validation.md) usando:

- [`product-grill`](../skills/product-grill/SKILL.md)
- [`revenue-centric-design`](../skills/revenue-centric-design/SKILL.md)

## Saída obrigatória

Saídas das duas skills + `Decision: go | no-go | defer`.

## Restrições

- Não escrever código de feature nesta etapa
- Não inventar evidência de mercado
