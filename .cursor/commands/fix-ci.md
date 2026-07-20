# /fix-ci

## Objetivo

Corrigir falhas reais de CI sem desabilitar gates.

## Entradas

- Nome do job / log
- Branch/PR

## Processo

```text
identificar job
→ ler log
→ separar causa raiz de warning/report-only
→ corrigir código ou documentação de governança
→ não desabilitar gate
→ reproduzir localmente
→ atualizar PR (manter draft se política exigir)
```

GitHub MCP **read-only** (config global; ver [`../MCP.md`](../MCP.md)) pode ajudar a consultar checks/logs/job. **Não** usar MCP para: reexecutar workflow, alterar branch, editar PR, aprovar ou mergear.

### Exemplos conceituais de jobs (não acoplar a um PR específico)

| Sintoma | Direção típica |
|---------|----------------|
| routing-governance | Atualizar `ROUTING_POLICY.md` / matriz / `routing-governance.ts` conforme policy — sem alterar o script do gate |
| typecheck / tsc | Respeitar DTO real; não inventar campos no tipo |
| design-system | Violações novas fora da baseline; report-only ≠ falha de tokens se o log disser OK |
| a11y + tsc no mesmo job | Ler qual passo falhou |
| E2E skipped | Documentar ausência de credenciais; não chamar de sucesso |

## Saída obrigatória

- Causa raiz
- Fix aplicado
- Comandos locais reproduzidos + resultado
- Confirmação de que nenhum gate foi desligado

## Restrições

- Não alterar `.github/workflows` nem scripts CI para contornar
- Não expandir contrato de DTO sem evidência de API
- Precedência: contratos reais > este command
