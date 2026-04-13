# Go-live — WhatsApp Platform

Checklist operacional para deploy e pós-deploy. Complementa `DEPLOY_APP_SUBDOMAIN.md`.

## Pré-deploy

- [ ] Variáveis de produção preenchidas (ver `docs/ops/ENVIRONMENT.md` e `.env.example`).
- [ ] `pnpm db:migrate` aplicado no Postgres de produção.
- [ ] Meta: webhook URL + Verify Token = `WHATSAPP_VERIFY_TOKEN`.
- [ ] OAuth redirect: `https://<host>/dashboard/whatsapp/callback`.
- [ ] Stripe: webhook secret e price IDs do ambiente **live** (não misturar com test).

## Deploy

1. Merge na branch de produção; Vercel (ou CI) executa `build`.
2. Confirmar que o deploy não usa `SKIP_ENV_VALIDATION` salvo incidente.

## Pós-deploy — smoke

Executar:

```bash
./scripts/ops/validate-whatsapp-platform.sh https://<seu-host>
```

Ou manualmente:

- [ ] `GET /api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=999` → `999`
- [ ] Login + Inbox carrega.
- [ ] Mensagem de teste inbound aparece na Inbox.

## Rollback

1. No painel de deploy: **Promote** deploy anterior estável ou **Redeploy** commit anterior.
2. Se migração DB problemática: executar `down` apenas com script de reversão preparado (nunca adivinhar em produção sem backup).

## Observabilidade (primeiras horas)

- Logs: `[WHATSAPP] inbound`, erros de IA, `[STRIPE]` / `[USAGE]`.
- Painel: webhook health / sistema (`/dashboard/ai` conforme produto).

## Referências

- `docs/architecture/LEGACY-CLEANUP.md`
- `docs/TESTE_ONBOARDING.md`
