# WhatsApp Platform — Status

**Runtime canónico:** `apps/whatsapp-platform` (Next.js)
**Base URL típica:** `https://whatsapp.devflowlabs.com.br` (`NEXT_PUBLIC_WHATSAPP_APP_URL`)
**Legado (não ops novas):** `apps/whatsapp-webhook-api` — ver [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)
**Fonte de produto:** [CURRENT-SCOPE.md](../whatsapp-platform/CURRENT-SCOPE.md) · [DOCUMENTATION-MAP.md](../whatsapp-platform/DOCUMENTATION-MAP.md)

---

## Status atual

| Item | Status |
|------|--------|
| Migration DB (platform Prisma) | **COMPLETE** |
| Signup / Login / Tenants | **PASS** |
| Onboarding assistido (ACC) | **PASS** (ver OPERATIONAL_PLAYBOOK) |
| Health (platform + webhook Meta) | Validar no host canónico |
| Testes unitários (platform) | **PASS** |

---

## Dev local (whatsapp-platform)

O `pnpm dev` usa `scripts/load-env-and-dev.mjs` que:

- Carrega root `.env.local` + app `.env.local`
- Fallback `JWT_SECRET` em dev (se ausente)
- Adiciona `?pgbouncer=true` em `WHATSAPP_DATABASE_URL` quando URL é pooler

Variáveis obrigatórias em `.env.local` (root): `WHATSAPP_DATABASE_URL`, `WHATSAPP_DIRECT_URL`, `WHATSAPP_SUPABASE_*`, `JWT_SECRET` (ou fallback em dev).

---

## Docs

| Arquivo | Descrição |
|---------|-----------|
| [WHATSAPP-PLATFORM-OVERVIEW.md](./WHATSAPP-PLATFORM-OVERVIEW.md) | Visão de produto e posicionamento (lançamento) |
| [DEMO_AND_CLIENT_READINESS_PLAYBOOK.md](./DEMO_AND_CLIENT_READINESS_PLAYBOOK.md) | Demo comercial (~10 min), checklist primeiro cliente, handoff, smoke pré-demo, ecrãs a mostrar, notas white-label |
| [PROSPECT_CRM_PLAYBOOK.md](./PROSPECT_CRM_PLAYBOOK.md) | CRM leve de prospecção na Inbox (`leadData.prospect`), funil, API, painel `DevFlowProspectPanel`, governança |
| [MANUAL_OUTREACH_20_LEADS.md](./MANUAL_OUTREACH_20_LEADS.md) | Campanha outbound manual (~20 leads): doc âncora + regra “CRM na conversa como sistema operacional” |
| [OPERATIONAL_PLAYBOOK.md](./OPERATIONAL_PLAYBOOK.md) | Onboarding assistido: painel `/admin/whatsapp`, checklist, validação UI, ativação; curl/script como fallback |
| [WHATSAPP-SETUP.md](./WHATSAPP-SETUP.md) | Setup Meta / WhatsApp Cloud API |
| [WHATSAPP_CLOUD_ONBOARDING_SPRINT.md](./WHATSAPP_CLOUD_ONBOARDING_SPRINT.md) | Registro de número via Graph API (site DevFlow Labs) |
| [WHATSAPP_CLOUD_ATIVACAO_REAL_RUNBOOK.md](./WHATSAPP_CLOUD_ATIVACAO_REAL_RUNBOOK.md) | Ativação real: checklist, curls, sucesso, rollback |
| [GRAPH_API_DIAGNOSTIC.md](./GRAPH_API_DIAGNOSTIC.md) | Diagnóstico WABA/Phone Number ID via Graph API — queries e cenários |
| [WEBHOOK_SUBSCRIPTION_FIX.md](./WEBHOOK_SUBSCRIPTION_FIX.md) | Correção webhook: inscrever app na WABA via `POST subscribed_apps` |
| [WEBHOOK_CONFIG_AUDIT.md](./WEBHOOK_CONFIG_AUDIT.md) | Auditoria da configuração do webhook |
| [WEBHOOK_META_CHECKLIST.md](./WEBHOOK_META_CHECKLIST.md) | Checklist operacional no Meta Dashboard |
