# Plano de transição — whatsapp-platform em domínio dedicado

> **Estado canónico hoje:** o webhook e o dashboard do produto WhatsApp estão no deploy **`apps/whatsapp-platform`**, tipicamente em **`https://whatsapp.devflowlabs.com.br`**. O portal **`devflowlabs.com.br`** **não** serve `/api/webhook/whatsapp`; redireciona com **308** para `NEXT_PUBLIC_WHATSAPP_APP_URL`.  
> As secções abaixo descrevem o **plano de migração** (antes/durante a troca); substitui `app.devflowlabs.com.br` no texto antigo pelo **host real** do teu projeto (ex.: `whatsapp.devflowlabs.com.br`).

---

## Estado canónico (referência rápida)

| Domínio | App | Webhook `/api/webhook/whatsapp` |
|---------|-----|----------------------------------|
| `devflowlabs.com.br` | Portal (marketing + auth) | **Não** — 308 para o app WhatsApp |
| `whatsapp.devflowlabs.com.br` (exemplo) | whatsapp-platform | **Sim** — canónico |

---

## Arquitectura alvo (já aplicada)

| Domínio | App | Webhook | Lógica |
|---------|-----|---------|--------|
| `devflowlabs.com.br` | Portal | — | Redirect 308 para URLs do produto |
| Host dedicado (ex. `whatsapp.devflowlabs.com.br`) | whatsapp-platform | `/api/webhook/whatsapp` | tenant resolution, Prisma, IA, billing |

---

## Fases da transição (histórico / runbook)

### Fase 0 — Pré-requisitos (antes de começar)

- [ ] `WHATSAPP_DATABASE_URL` de produção configurada e acessível
- [ ] Migrations aplicadas no banco de produção (`pnpm db:migrate`)
- [ ] Variáveis do whatsapp-platform documentadas (veja `DEPLOY_APP_SUBDOMAIN.md`)

---

### Fase 1 — Deploy em paralelo (sem impacto)

Objetivo: ter o host do **whatsapp-platform** no ar **sem alterar** ainda o que a Meta usa (se ainda apontava para URL legada).

1. **Novo projeto no Vercel**
   - Add New → Project → mesmo repositório
   - Nome: `whatsapp-platform`

2. **Configuração**
   - Root Directory: `apps/whatsapp-platform`
   - Variáveis de ambiente: conforme `DEPLOY_APP_SUBDOMAIN.md`
   - `NEXT_PUBLIC_WHATSAPP_APP_URL` = URL pública deste deploy (ex.: `https://whatsapp.devflowlabs.com.br`)

3. **DNS**
   - Registrar o subdomínio no Vercel (Settings → Domains)
   - No provedor de DNS: CNAME conforme instruções da Vercel
   - Aguardar propagação (5–30 min)

4. **Deploy e validação**

   ```bash
   curl "https://whatsapp.devflowlabs.com.br/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=SEU_VERIFY_TOKEN&hub.challenge=999"
   # Deve retornar: 999
   ```

5. **OAuth na Meta**
   - Meta for Developers → seu app → WhatsApp → Configuration
   - Em **Valid OAuth Redirect URIs**, incluir:
     `https://whatsapp.devflowlabs.com.br/dashboard/whatsapp/callback`
   - (Opcional nesta fase: ainda não alterar o Callback URL do webhook se estiveres em paralelo com URL antiga.)

**Resultado:** o novo host está pronto; a Meta pode continuar temporariamente na URL antiga até à Fase 2.

---

### Fase 2 — Troca do webhook na Meta

1. **Meta Dashboard** → WhatsApp → Configuration → Webhook

2. **Alterar Callback URL**
   - **De:** URL legada anotada no teu runbook (ex.: portal ou raiz, **se ainda existia** nessa altura)
   - **Para:** `https://whatsapp.devflowlabs.com.br/api/webhook/whatsapp` (ou o teu host do `whatsapp-platform`)

3. **Verify Token** — manter o mesmo valor que `WHATSAPP_VERIFY_TOKEN` no deploy

4. **Salvar** — a Meta faz GET de verificação; o app deve devolver o `hub.challenge`.

---

### Fase 3 — Validação pós-transição

1. Webhook de teste na Meta (se disponível) e logs no Vercel: `[WHATSAPP] inbound tenant=...`
2. Onboarding: Embedded Signup no host do app
3. Mensagem real ao número conectado

---

### Fase 4 — Rollback (se necessário)

O portal **já não** expõe `/api/webhook/whatsapp` após o cutover. **Não** uses `https://devflowlabs.com.br/api/webhook/whatsapp` como destino de rollback a menos que tenhas **explicitamente** um deploy legado nessa rota.

1. **Meta Dashboard** → Callback URL para a **URL anterior** guardada no teu runbook / ambiente **pré-cutover** (se ainda operacional).
2. Se não houver legado: corrigir o deploy do `whatsapp-platform` ou DNS em vez de “voltar ao portal”.

---

## Checklist rápido

| # | Ação | Status |
|---|------|--------|
| 0.1 | Banco de produção + migrations | ☐ |
| 1.1 | Projeto Vercel whatsapp-platform | ☐ |
| 1.2 | Root Directory + env vars | ☐ |
| 1.3 | Domínio dedicado + DNS | ☐ |
| 1.4 | Deploy + curl de teste | ☐ |
| 1.5 | OAuth Redirect URI na Meta | ☐ |
| 2.1 | Alterar Callback URL na Meta | ☐ |
| 3.1 | Teste webhook + onboarding + mensagem | ☐ |

---

## Diferença de comportamento (legado vs whatsapp-platform)

| Aspecto | Legado (se existiu no portal/raiz) | whatsapp-platform |
|---------|-------------------------------------|-------------------|
| Tenant resolution | Variante antiga | `WhatsappPhoneNumber`, `tenantResolutionService` |
| Prisma | Contexto do portal | `WHATSAPP_DATABASE_URL` dedicado |
| Embedded Signup | Depende do deploy | Sim no app dedicado |
| Dashboard `/dashboard/whatsapp` | Redirect 308 a partir do portal | Servido no host do app |

---

## Referências

- `DEPLOY_APP_SUBDOMAIN.md` — Deploy do whatsapp-platform
- `WEBHOOK_MIGRACAO_META.md` — Checklist curto na Meta
- `docs/whatsapp/WEBHOOK_META_CHECKLIST.md` — Checklist operacional completo
