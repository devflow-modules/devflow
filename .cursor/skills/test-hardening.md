---
name: test-hardening
description: >-
  Fortalecer testes automatizados (Vitest) no monorepo DevFlow: comportamento,
  mocks e asserções estáveis. Usar quando o utilizador pedir mais cobertura,
  corrigir flakiness, ou endurecer testes sem enfraquecer garantias.
---

# Testes — endurecimento (Vitest)

Leia [`AGENTS.md`](../../AGENTS.md) e `.cursor/rules/02-testing-quality-gates.mdc`.

## Instruções

1. **Inspeccionar** `vitest.config`, helpers em `packages/testing-utils`, mocks e `beforeEach` existentes no mesmo ficheiro ou pacote antes de acrescentar casos.
2. **Testar comportamento observável** (entradas/saídas, estados, erros tratados) — evitar acoplar a nomes internos de funções ou ordem de chamadas frágil.
3. **Preferir testes directos** ao código alterado; expandir para workspace só quando necessário.
4. **Evitar falsos positivos** — asserções específicas o suficiente para apanhar regressões reais; evitar `expect(true).toBe(true)` ou mocks que sempre passam.
5. Se um teste continuar a falhar após análise razoável, **documentar a causa raiz** no PR ou comentário (o quê falha, hipótese, próximo passo humano) em vez de silenciar o teste.

## Expectativas de validação

- Novos ou alterados testes devem falhar de forma clara quando a regra de negócio ou o contrato quebrar.
- Correr a suite ou ficheiro afectado e mencionar o comando usado no contexto do PR.

## Não fazer

- **Não** enfraquecer asserções (`toBeDefined` genérico, `catch {}` vazio, `skip` permanente) só para verde.
- **Não** duplicar integração pesada sem isolamento quando um unit test bastaria.
- **Não** fixar relógio, rede ou I/O real sem padrão já usado no repo (usar os mesmos mocks/fakes).

## Princípios gerais

- **Diffs pequenos**: um módulo ou comportamento por PR de teste quando possível.
- Alinhar labels `cursor:requires-tests` / `type:test` com [`docs/operations/GITHUB_LABELS.md`](../../docs/operations/GITHUB_LABELS.md) quando o trabalho vier de issue.
