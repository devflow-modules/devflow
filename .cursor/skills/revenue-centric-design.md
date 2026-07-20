---
name: revenue-centric-design
description: >-
  Liga decisões técnicas a outcomes de negócio e operação no DevFlow. Usar ao
  priorizar features, hardening ou trade-offs de escopo — sem reduzir tudo a
  monetização direta.
---

# Revenue-centric design

Avalia o **resultado económico e operacional** de uma decisão técnica. Receita direta é um eixo — não o único.

## Quando usar

- Priorização de gaps pós-auditoria
- Trade-off “fazer agora vs defer”
- Junto com [`product-grill`](./product-grill.md)

## Eixos a avaliar

| Eixo | Exemplos |
|------|----------|
| Receita | conversão, upgrade, redução de churn pago |
| Retenção | volta do cliente, continuidade operacional |
| Ativação | tempo até primeiro valor |
| Conversão | trial → pago, setup completo |
| Custo | suporte, retrabalho, infra |
| Risco | security, compliance, auditoria ambígua |
| Operação | dupla atuação, filas, SLA |
| Tempo até valor | claim/fila, onboarding |

Valor indireto válido: segurança, confiabilidade, conformidade, redução de incidente.

## Processo

1. Declarar outcome de negócio / utilizador / operação
2. Separar métrica leading vs lagging
3. Estimar custo e risco da mudança vs do status quo
4. Decidir com Product Owner

## Saída obrigatória

```text
Business outcome:
User outcome:
Operational outcome:
Leading metric:
Lagging metric:
Cost:
Risk:
Decision:
```

## Guardrails

- Não forçar ROI inventado
- Hardening de concorrência/auth pode ser “revenue-centric” via risco e retenção
- Respeitar CURRENT-SCOPE e boundaries de apps
