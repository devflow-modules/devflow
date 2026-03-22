# Deploy do whatsapp-platform em app.devflowlabs.com.br

## Objetivo

Ter `app.devflowlabs.com.br` servindo o **whatsapp-platform** (webhook unificado, tenant resolution, Embedded Signup).

---

## Passo a passo (Vercel)

### 1. Novo projeto no Vercel

1. Acesse [vercel.com](https://vercel.com) → seu time → **Add New** → **Project**
2. Importe o **mesmo repositório** do devflow (não precisa ser fork)
3. Dê um nome: `whatsapp-platform` ou `app-devflowlabs`

### 2. Configuração do build

| Campo | Valor |
|-------|-------|
| **Root Directory** | `apps/whatsapp-platform` |
| **Framework Preset** | Next.js (auto-detectado) |
| **Build Command** | *(deixar padrão: `pnpm run build`)* |
| **Output Directory** | *(padrão)* |
| **Install Command** | *(padrão: `pnpm install`)* |

O Vercel executa o install a partir da raiz do repo quando há monorepo, então as dependências `workspace:*` funcionam.

### 3. Variáveis de ambiente

Adicione no projeto as mesmas do `.env.local` do whatsapp-platform:

| Variável | Obrigatório |
|----------|-------------|
| `DATABASE_URL` | Sim (Prisma principal, se usado) |
| `WHATSAPP_DATABASE_URL` | Sim (banco do WhatsApp) |
| `WHATSAPP_VERIFY_TOKEN` | Sim (ex: `devflow_8f3a2e9c1b7d4f6a0e5c8b2`) |
| `META_APP_ID` | Sim |
| `META_APP_SECRET` | Sim |
| `META_EMBEDDED_SIGNUP_CONFIG_ID` | Sim |
| `NEXT_PUBLIC_APP_URL` | Sim (`https://app.devflowlabs.com.br`) |
| `STRIPE_*`, `SUPABASE_*`, `OPENAI_*`, etc. | Conforme necessário |

### 4. Domínio app.devflowlabs.com.br

1. No projeto: **Settings** → **Domains**
2. **Add** → `app.devflowlabs.com.br`
3. Configure o DNS no provedor do domínio:
   - Tipo: `CNAME`
   - Nome: `app` (ou `app.devflowlabs`)
   - Valor: `cname.vercel-dns.com`
4. Aguarde a propagação (pode levar alguns minutos)

### 5. OAuth Redirect URIs na Meta

No Meta for Developers → seu app → **WhatsApp** → **Configuration**:

Em **Valid OAuth Redirect URIs**, inclua:
```
https://app.devflowlabs.com.br/dashboard/whatsapp/callback
```

### 6. Migrations do banco

Antes do primeiro deploy com banco novo:

```bash
cd apps/whatsapp-platform
# Garanta que .env.local tenha WHATSAPP_DATABASE_URL de produção
pnpm db:migrate
```

O script `db:migrate` carrega o env e executa `prisma migrate deploy`.

### 7. Deploy

1. **Deploy** → o Vercel faz o build automaticamente
2. Após o deploy, teste:
   ```
   https://app.devflowlabs.com.br/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=SEU_TOKEN&hub.challenge=999
   ```
   Deve retornar `999`.

3. No Meta Dashboard: **WhatsApp** → **Configuration** → **Webhook**
   - **Callback URL**: `https://app.devflowlabs.com.br/api/webhook/whatsapp`
   - **Verify Token**: igual a `WHATSAPP_VERIFY_TOKEN`
   - **Salvar** → status deve ficar verde

---

## Plano de transição

Para migrar do domínio principal para o subdomínio sem downtime, veja **`PLANO_TRANSICAO_APP_SUBDOMINIO.md`**.

---

## Solução temporária (sem subdomínio)

Enquanto `app.devflowlabs.com.br` não estiver pronto:

- **devflowlabs.com.br** já responde em `/api/webhook/whatsapp` (app raiz)
- O app raiz usa outra stack (whatsapp-webhook legado), sem `WhatsappPhoneNumber` / tenant resolution unificado
- Para testes de webhook, pode usar `devflowlabs.com.br`; para produção com multi-tenant, use `app.devflowlabs.com.br`

---

## Arquitetura final

```
Meta → https://app.devflowlabs.com.br/api/webhook/whatsapp
     → whatsapp-platform (Vercel)
     → tenantResolutionService (WhatsappPhoneNumber)
     → Prisma (WHATSAPP_DATABASE_URL)
     → IA / billing / Stripe
```
