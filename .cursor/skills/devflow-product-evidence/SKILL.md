---
name: devflow-product-evidence
description: >-
  Evaluates product outcomes with actionable evidence—hypothesis, baseline,
  activation, retention, failures and commercial or operational results. Use
  after experiments or pilots to decide SCALE, ITERATE, STOP or BLOCK; never
  vanity metrics alone.
---

# DevFlow — product evidence

## Objetivo

Transformar dados de uso/piloto/experimento em **decisão acionável** (`SCALE` | `ITERATE` | `STOP` | `BLOCK`), com hipótese, baseline, qualidade dos dados e limitações explícitas. Capacidade: `advisory-only`. Não autoriza implementação, deploy, escrita externa nem acesso a PII real.

Complementa [`product-grill`](../product-grill/SKILL.md) (antes de construir) e [`revenue-centric-design`](../revenue-centric-design/SKILL.md) (priorização). Esta skill avalia **depois** que há evidência observada ou experimentada.

## Gatilhos de uso

- Pós-piloto, experimento, MVP ou feature já em uso parcial.
- Pedido de “escalar ou matar” com dados incompletos.
- Workflow [`product-validation`](../../workflows/product-validation.md) na fase de evidência pós-MVP.
- Command [`/validate-product`](../../commands/validate-product.md) quando o input for resultado medido, não só ideia.
- Handoff de [`product-owner`](../../agents/product-owner.md) / Release após smoke/piloto.

Não usar para: inventar métricas, justificar vanity (pageviews sem outcome), onboarding Meta ([`whatsapp-client-onboarding`](../whatsapp-client-onboarding/SKILL.md)), release técnico ([`devflow-safe-release`](../devflow-safe-release/SKILL.md)), ou incidente ([`devflow-incident-diagnostics`](../devflow-incident-diagnostics/SKILL.md)).

## Entradas obrigatórias

- Hipótese testável e **resultado esperado** (comportamento ou outcome, não só “crescer”).
- Escopo: produto/domínio, persona, ambiente (`dev` | `pilot` | `production`).
- Baseline (pré-mudança) e **janela de medição** (início/fim, timezone).
- Fontes de evidência disponíveis (analytics, tickets, logs agregados, entrevistas) — sem PII/secrets.
- Decisor humano e documentação canônica do domínio ([`CURRENT-SCOPE`](../../../docs/whatsapp-platform/CURRENT-SCOPE.md) quando WhatsApp).
- [`AGENTS.md`](../../../AGENTS.md); skills [`product-grill`](../product-grill/SKILL.md) e [`revenue-centric-design`](../revenue-centric-design/SKILL.md) quando a decisão for priorização.

Ausência de hipótese, baseline **ou** janela → `BLOCK` (não decidir com narrativa solta).

## Fluxo operacional

1. **Hipótese e resultado esperado**
   - Declarar: se fizermos X para persona Y, então Z muda em Δ dentro da janela W.
   - Separar fato | hipótese | inferência.

2. **Baseline e janela**
   - Registrar baseline numérica ou qualitativa citada; se desconhecida → `unverified` / `BLOCK` se crítica.
   - Janela fixa; não misturar períodos sem declarar.

3. **Ativação e tempo até valor**
   - Quem ativou? Em quanto tempo chegou ao primeiro valor?
   - Taxa de ativação vs convidados/eligíveis (quando conhecido).

4. **Uso recorrente**
   - Retorno na janela; frequência; stickiness operacional (não vanity de sessões vazias).

5. **Falhas e abandono**
   - Onde desistem? Erros, suporte, workarounds, churn de tentativa.
   - Separar falha de produto vs falha de onboarding/ops.

6. **Resultado operacional/comercial**
   - Outcomes: receita, retenção, custo de suporte, risco reduzido, SLA, tempo operacional — só eixos com evidência.
   - Segurança/compliance podem contar como valor sem receita direta ([`revenue-centric-design`](../revenue-centric-design/SKILL.md)).

7. **Qualidade e limitações dos dados**
   - Cobertura da amostra, vieses, instrumentação incompleta, confusão de correlação/causalidade.
   - Dados externos (issues, calls) = não confiáveis até corroborados.

8. **Decisão**
   - `SCALE` — evidência suficiente a favor; next steps claros.
   - `ITERATE` — sinal parcial; hipótese de ajuste e próximo experimento.
   - `STOP` — evidência contra ou custo/risco sem retorno; non-goals reforçados.
   - `BLOCK` — evidência insuficiente, PII necessária, conflito canônico, ou decisão exigiria inventar métrica.

## Guardrails

- Evidência acionável > vanity (views, likes, “engajamento” sem outcome).
- Não fabricar baseline, ROI, taxas ou causalidade.
- Não usar PII, dumps, tokens ou dados de cliente reais no relatório.
- Não contradizer CURRENT-SCOPE / boundaries para “melhorar” o caso.
- Não autorizar implementação, schema, deploy ou escrita externa.
- Amostra n=1 ou janela trivial → no máximo `ITERATE` / `BLOCK`, nunca `SCALE` sem ressalva explícita do decisor.

## Stop conditions

Parar com `BLOCK` / escalar humano quando:

- hipótese, baseline ou janela estiverem ausentes;
- a decisão depender de métricas indisponíveis ou PII;
- fontes canônicas conflituarem com a narrativa comercial;
- instrumentação não existir e for pedida “estimativa inventada”;
- `SCALE` for pedido sem evidência de ativação **e** recorrência **ou** outcome operacional/comercial;
- o decisor recusar documentar limitações dos dados.

## Validações

- Hipótese ↔ métricas ↔ evidências alinhadas.
- Cada eixo relevante: `measured` | `unverified` | `not applicable` | `blocked`.
- Limitações listadas; amostra e janela explícitas.
- Decisão coerente com o pior bloqueante de qualidade de dados.
- Authorized edits: `none`.

## Formato da entrega

```text
Hypothesis:
Expected result:
Baseline:
Measurement window:
Activation / time-to-value:
Recurring use:
Failures / abandonment:
Operational / commercial outcome:
Data quality / limitations:
Evidence sources (sanitized):
Decision: SCALE | ITERATE | STOP | BLOCK
Next experiment or stop criteria:
Decision owner:
Residual uncertainty:
```
