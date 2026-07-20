# Workflow — Bugfix

## Quando usar

Defeito reproduzível com correção mínima.

## Não usar quando

- Comportamento ambíguo de produto → Product Owner + [`audit-hardening`](./audit-hardening.md) ou [`product-validation`](./product-validation.md)
- Refactor oportunista “já que estamos aqui”

## Papéis envolvidos

Backend/Frontend (causa) → Security (se superfície sensível) → QA → Documentation (se contrato/docs mentiam) → Release

## Pré-condições

- Reprodução (passos ou teste que falha)
- Owner do módulo

## Etapas

```text
reprodução
→ causa raiz
→ correção mínima
→ teste de regressão
→ gates
→ PR focado
```

## Gates

Testes focados do módulo + gates do tipo de mudança. Preferir falhar o teste primeiro quando possível.

## Critério de saída

- Regressão coberta
- Sem refactor colateral
- Skipped ≠ passed

## Fora de escopo

Novas features; redesign; “melhorias” não relacionadas ao bug.

## Template de entrega

```text
Repro:
Root cause:
Fix:
Regression test:
Gates:
Risks:
```
