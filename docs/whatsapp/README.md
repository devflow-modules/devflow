# WhatsApp Platform — Status

**Apps:** `whatsapp-platform` (Next.js), `whatsapp-webhook-api` (Node)  
**Banco:** Supabase dedicado (xhtsgqvdqpfuotctaqow)

---

## Status atual

| Item | Status |
|------|--------|
| Migration DB | **COMPLETE** |
| Signup / Login / Tenants | **PASS** |
| Onboarding | **PASS** |
| Health (platform, webhook-api) | **PASS** |
| Testes unitários | **PASS** |

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
| [WHATSAPP-SETUP.md](./WHATSAPP-SETUP.md) | Setup Meta / WhatsApp Cloud API |
