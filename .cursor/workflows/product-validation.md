# Workflow — Product validation

## Quando usar

Antes de investir em feature ambígua; validar ideia, prioridade ou go/no-go.

## Não usar quando

- Gap técnico confirmado com aceite já decidido → implementar via feature/audit-hardening
- Bug com repro

## Papéis envolvidos

Product Owner (lead) → Platform Architect (viabilidade grosseira) → Documentation (registo da decisão)

Skills obrigatórias:

- [`product-grill`](../skills/product-grill.md)
- [`revenue-centric-design`](../skills/revenue-centric-design.md)

Command: [`validate-product`](../commands/validate-product.md)

## Pré-condições

- Hipótese ou pedido em linguagem de produto
- Contexto do domínio (CURRENT-SCOPE se WhatsApp)

## Etapas

1. Grill rigoroso (persona, evidência, workaround, métrica)
2. Avaliar outcome de negócio/operacional (não só monetização direta)
3. Definir MVP e non-goals
4. Riscos de feature sem adoção
5. Decisão go / no-go / defer
6. Se go → handoff para [`feature`](./feature.md) ou [`audit-hardening`](./audit-hardening.md)

## Gates

Nenhum gate de código obrigatório — saída é decisão. Se “go”, o próximo workflow aplica gates técnicos.

## Critério de saída

```text
Hypothesis:
Persona:
Pain:
Value:
Metric:
MVP:
Risks:
Decision: go | no-go | defer
```

## Fora de escopo

Implementação de código; inventar regra de produto sem evidência.

MCP pode trazer dados de apoio (ex. issues GitHub read-only), mas: não inventar evidência; diferenciar fonte externa de inferência; não aceder a PII de clientes ([`../MCP.md`](../MCP.md)).

## Template de entrega

Usar saídas das skills `product-grill` + `revenue-centric-design`, mais a decisão final.
