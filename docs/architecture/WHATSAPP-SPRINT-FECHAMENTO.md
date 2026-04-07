# Sprint final — WhatsApp Platform até sexta

Objetivo: **fechamento real de produto** (estabilidade, operação, confiabilidade), sem abrir novas frentes.

---

## Definição de pronto

Só declarar “100%” quando for possível afirmar com segurança:

> O WhatsApp Platform está isolado, validado em produção, com fluxos críticos operacionais, CI estável, webhook funcional, auth funcional, billing funcional e proteção mínima contra regressão.

Registo formal: [`WHATSAPP-PRODUCTION-SIGNOFF.md`](./WHATSAPP-PRODUCTION-SIGNOFF.md).

---

## Prioridades

| Nível | Itens |
|--------|--------|
| **P0** | Smoke E2E real; auth real; webhook real; billing real; sign-off documentado |
| **P1** | Logs críticos revisados; guardrail anti-regressão no CI |
| **P2** | Refinos UX/UI; observabilidade além do mínimo |

---

## Entregáveis (repositório)

| Entregável | Descrição |
|------------|-----------|
| Sign-off | `docs/architecture/WHATSAPP-PRODUCTION-SIGNOFF.md` preenchido (data, ambiente, tabelas) |
| Guardrail CI | Workflow **WhatsApp architecture guard** + `scripts/ci/check-whatsapp-architecture-boundary.sh` |
| Webhook | Comportamento documentado na secção 2.3 do sign-off; código tolerante a falhas + logs |
| Observabilidade | Prefixos e pontos críticos descritos no sign-off; ajustes pontuais no código se faltar log |

_Não é objetivo deste sprint: nova feature grande, novo produto ou reestruturação do monorepo._

---

## Ordem de execução sugerida

### Dia 1

1. Smoke completo (portal → app → login → dashboard → mensagem real → inbox → billing → logout).
2. Listar bugs reais em issues ou na coluna “Notas” do sign-off.
3. Validar webhook GET/POST em produção (curl + Meta).

### Dia 2

1. Corrigir bugs P0 encontrados.
2. Revisar logs em: webhook, auth (`logAuth` / fluxo login), billing (Stripe), integrações externas falhando.
3. Garantir CI verde com o novo job de arquitetura.

### Dia 3 (fecho)

1. Rerun do smoke e do gate da secção 1 do sign-off.
2. Preencher registo de homologação e commit final de documentação (se necessário).

---

## Critérios de aceite por bloco

| Bloco | Critério |
|--------|-----------|
| Sign-off técnico | Todos os itens do gate na secção 1 do `WHATSAPP-PRODUCTION-SIGNOFF.md` marcados com evidência |
| Smoke E2E | Tabela 2.1 com OK nos passos 1–10 ou NOK explicado + plano |
| Observabilidade | Em simulação de erro, consegue-se identificar rota, tenant (quando houver) e mensagem de log |
| Anti-regressão | CI falha se `src/` importar `apps/whatsapp-platform` ou `@wa/`, ou se reaparecerem rotas API operacionais de WhatsApp na raiz |
| Auth | Sem loops; cookies e redirects corretos no domínio real |
| Webhook | Payload inválido / exceção não derruba o serviço de forma incontrolada; respostas alinhadas à política Meta |
| Billing | Fluxos expostos ao utilizador não quebram; plano visível coerente |
| UX mínima | P2: apenas se sobrar tempo após P0/P1 |

---

## CI relevante

- `ci.yml` — lint, testes, install
- `routing-governance-check.yml` — alteração de rotas exige governança
- `validate-whatsapp-cutover.yml` — validação pós-deploy (URLs)
- **WhatsApp architecture guard** — fronteira portal vs `whatsapp-platform`

---

## Ligação ao que já está feito

Desacoplamento, deploy separado, cutover, CI base, validação de rotas, handshake webhook e documentação de operação já cobrem a base técnica. Este sprint fecha a camada **produto + operação + prova**.
