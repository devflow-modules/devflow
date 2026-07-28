---
name: revenue-centric-design
description: >-
  Prioriza decisões por outcomes de negócio, usuário e operação, incluindo
  receita, retenção, custo e risco. Use em trade-offs de escopo, hardening e
  decisões de fazer agora ou adiar.
---

# Revenue-centric design

## Objetivo

Relacionar uma decisão técnica ou de produto a outcomes e métricas verificáveis, sem reduzir valor a monetização direta nem autorizar implementação. Capacidade: `advisory-only`.

## Gatilhos de uso

- Priorização de gaps após auditoria.
- Trade-off `fazer agora | defer`.
- Avaliação de hardening, confiabilidade ou custo operacional.
- Uso conjunto com [`product-grill`](../product-grill/SKILL.md).

## Entradas obrigatórias

- Decisão e alternativas comparadas.
- Persona e operação afetadas.
- Evidência disponível.
- Custo, risco, esforço e horizonte relevantes.
- Decisor humano e documentação canônica do domínio.

## Fluxo operacional

1. Declarar outcomes de negócio, usuário e operação.
2. Avaliar somente eixos aplicáveis: receita, retenção, ativação, conversão, custo, risco, operação e tempo até valor.
3. Separar métricas leading e lagging, com baseline quando conhecido.
4. Comparar custo e risco da mudança com o status quo.
5. Identificar impacto indireto válido, como segurança, compliance e redução de incidentes.
6. Recomendar prioridade e registrar incerteza.

## Guardrails

- Não fabricar ROI, baseline, demanda ou precisão numérica.
- Não usar receita como único critério para segurança, compliance ou confiabilidade.
- Não confundir correlação com causalidade.
- Não contradizer escopo canônico ou boundaries para melhorar uma estimativa.
- Não editar código nem executar escrita externa por autoridade desta skill.

## Stop conditions

Parar e pedir decisão humana quando:

- alternativas ou outcome estiverem indefinidos;
- a recomendação depender de métricas indisponíveis ou PII;
- houver conflito entre retorno e obrigação de segurança/compliance;
- o custo técnico exigir investigação de arquitetura;
- o decisor aceitar risco residual não documentado.

## Validações

- Evidência, hipótese e estimativa estão separadas.
- Cada métrica tem relação explícita com o outcome.
- Custos e riscos do status quo também foram considerados.
- A recomendação inclui incerteza, non-goals e decisor.

## Formato da entrega

```text
Decision:
Business outcome:
User outcome:
Operational outcome:
Leading metric:
Lagging metric:
Evidence / baseline:
Change cost and risk:
Status quo cost and risk:
Recommendation:
Uncertainty:
Decision owner:
```
