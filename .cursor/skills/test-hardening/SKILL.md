---
name: test-hardening
description: >-
  Fortalece testes Vitest com regressões reproduzíveis, mocks controlados e
  asserções estáveis. Use ao adicionar cobertura, corrigir flakiness ou
  endurecer testes sem reduzir garantias.
---

# Test hardening

## Objetivo

Criar ou corrigir testes que detectem regressões reais com o menor escopo de execução necessário. Capacidade: `action-enabled`.

## Gatilhos de uso

- Pedido de cobertura ou teste de regressão.
- Bug que precisa ser reproduzido antes da correção.
- Teste flaky, falso positivo ou assertion fraca.
- Mudança em auth, billing, webhook ou middleware que exige regressão.

## Entradas obrigatórias

- Comportamento observável ou bug a provar.
- Owner do módulo e runner/configuração aplicável.
- Testes, fixtures, mocks e helpers vizinhos.
- [`AGENTS.md`](../../../AGENTS.md) e [quality gates](../../rules/02-testing-quality-gates.mdc).

## Fluxo operacional

1. Reproduzir a falha com o teste mais próximo antes de corrigir o código.
2. Inspecionar `vitest.config`, setup, helpers e padrões do pacote.
3. Definir entrada, saída, estado ou erro observável que caracteriza a regressão.
4. Adicionar o menor caso que falhe pelo motivo correto.
5. Corrigir a causa sem enfraquecer o teste.
6. Executar primeiro o arquivo ou suite direcionada; expandir apenas quando o risco exigir.
7. Revisar isolamento de relógio, rede, I/O, módulos e estado global.

## Guardrails

- Não usar assertions genéricas, `catch {}` vazio, snapshots sem contrato ou mocks que sempre passam.
- Não adicionar `skip`, retry ou timeout maior para esconder causa raiz.
- Não acessar rede, banco compartilhado ou produção em unit tests.
- Não registrar secrets, payloads assinados ou PII em fixtures e falhas.
- Reutilizar fakes e cleanup existentes; restaurar mocks e relógio entre casos.

## Stop conditions

Parar e reportar quando:

- o comportamento esperado for uma decisão de produto ausente;
- a reprodução depender de credencial, dado real ou ambiente indisponível;
- a falha indicar contrato externo não documentado;
- estabilizar o teste exigir reduzir uma garantia;
- a causa continuar inconclusiva após evidência razoável.

## Validações

- Confirmar que o teste novo falha antes da correção ou demonstrar a reprodução equivalente.
- Executar o arquivo/suite alterado e registrar comando e resultado.
- Executar gates consumidores quando o helper ou contrato for compartilhado.
- Classificar cada validação como `pass`, `fail`, `blocked` ou `not run`.

## Formato da entrega

```text
Regression:
Reproduction:
Root cause:
Test added or changed:
Commands:
Results:
Blocked / not run:
Residual risk:
```
