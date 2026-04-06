# Sprint final — homologação e sign-off (WhatsApp Platform)

Objetivo: fechar **validação operacional em produção** e **governança documental**, sem alterar arquitetura runtime. Alinha com o mesmo padrão do Financeiro (portal × app canónico).

**Relacionados:** [CUTOVER-WHATSAPP-RUNBOOK-MAIN.md](./CUTOVER-WHATSAPP-RUNBOOK-MAIN.md) · [WHATSAPP-CUTOVER-HOMOLOGACAO.md](./WHATSAPP-CUTOVER-HOMOLOGACAO.md) · [WHATSAPP_PORTAL_APP_PARITY.md](./WHATSAPP_PORTAL_APP_PARITY.md) · [`ARCHITECTURE.md`](../../ARCHITECTURE.md) (raiz do repo)

---

## Painel de status (copiar para wiki / release)

```md
WhatsApp Platform cutover status

- Code cutover: Done
- Root runtime removal: Done
- Portal redirect layer: Done
- Shared route package: Done
- Production operational validation: In progress
- Go-live complete: Pending final smoke tests
```

---

## Classificação honesta

| Dimensão | Estado |
|----------|--------|
| **Desacoplamento técnico** | Concluído |
| **Desacoplamento operacional em produção** | Pendente de validação final |
| **Acoplamento remanescente aceitável** | Monorepo + `@devflow/whatsapp-routes` + `NEXT_PUBLIC_WHATSAPP_APP_URL` no portal |

---

## Definição de pronto — “100% concluído”

Só declarar **go-live completo** quando **todos** estiverem verificados (evidência anexada ou link para run do CI):

1. **`NEXT_PUBLIC_WHATSAPP_APP_URL`** definida e validada no **deploy do portal** em produção (valor = URL pública final do app).
2. **Domínio final** do `whatsapp-platform` a responder (TLS, health, páginas críticas).
3. **Redirects do portal** (308) para rotas operacionais com a env ativa — amostra documentada (`/login`, `/dashboard/whatsapp` ou equivalentes do pacote de rotas).
4. **Webhook Meta** com Callback URL no **host canônico**; GET challenge OK; POST recebido em teste controlado.
5. **Auth / cookies** no domínio real (login, `next`, sessão estável no app).
6. **Smoke test ponta a ponta** com mensagem real no número oficial (inbound → processamento conforme produto).

**Extra (runbook §5):** forgot/reset/signup/billing Stripe no app, rollback revisado, tag `whatsapp-platform-go-live-YYYY-MM-DD` opcional.

---

## Escopo do sprint (3 frentes)

### 1. GitHub Actions

| Entregável | Aceite |
|------------|--------|
| Workflow [`validate-whatsapp-cutover`](../../.github/workflows/validate-whatsapp-cutover.yml) verde na `main` após paths relevantes | Run recente sem falha; opcional: `WHATSAPP_VERIFY_TOKEN` no repo para handshake GET |
| Documentação de como disparar manualmente (`workflow_dispatch`) | Descrito em [WHATSAPP-CUTOVER-HOMOLOGACAO.md](./WHATSAPP-CUTOVER-HOMOLOGACAO.md) |

### 2. Smoke test real de produção

| Entregável | Aceite |
|------------|--------|
| Script [`scripts/ops/validate-whatsapp-cutover.sh`](../../scripts/ops/validate-whatsapp-cutover.sh) contra URLs de produção | Saída arquivada: data, `PASS`/`FAIL`, responsável |
| Teste manual Meta + mensagem real | Registo curto (quem/quando/resultado) |

### 3. Documentação final (arquitetura + go-live)

| Entregável | Aceite |
|------------|--------|
| [`ARCHITECTURE.md`](../../ARCHITECTURE.md) reflete papel da raiz vs `whatsapp-platform` | Revisão feita (sem “scaffold” para o produto WhatsApp) |
| Runbook §5 com checkboxes marcadas quando aplicável | [CUTOVER-WHATSAPP-RUNBOOK-MAIN.md](./CUTOVER-WHATSAPP-RUNBOOK-MAIN.md) |
| Stripe webhook URL no host do app | Ver [apps/whatsapp-platform/docs/STRIPE_WEBHOOK_TESTING.md](../../apps/whatsapp-platform/docs/STRIPE_WEBHOOK_TESTING.md) |

---

## Sign-off (aceite formal)

| Papel | Nome | Data | Assinatura / nota |
|-------|------|------|-------------------|
| Engenharia | | | CI + script homologação OK |
| Operação / deploy | | | Envs Vercel + Meta alinhadas |
| Produto / negócio | | | Smoke E2E aceite |

---

## O que **não** é escopo deste sprint

- Novo desenho de monorepo ou migração de domínio além do já planeado.
- Refactors grandes no `whatsapp-platform` não ligados a go-live.

Quando o sign-off estiver completo, atualizar o painel no topo para **Go-live complete: Done** e fechar o sprint.
