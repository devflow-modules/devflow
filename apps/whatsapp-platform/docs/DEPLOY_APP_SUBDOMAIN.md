# Deploy do whatsapp-platform (domínio dedicado)

## Objetivo

Servir o **whatsapp-platform** num host próprio (ex.: `whatsapp.devflowlabs.com.br`): webhook Meta, tenant resolution, Embedded Signup, Stripe, dashboard. O **portal** (`devflowlabs.com.br`) não expõe `/api/webhook/whatsapp`; usa **308** para o app via `NEXT_PUBLIC_WHATSAPP_APP_URL`.

---

## Passo a passo (Vercel)

### 1. Novo projeto no Vercel

1. Acesse [vercel.com](https://vercel.com) → seu time → **Add New** → **Project**
2. Importe o **mesmo repositório** do devflow (não precisa ser fork)
3. Nome sugerido: `whatsapp-platform`

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
| `NEXT_PUBLIC_APP_URL` | Sim (`https://whatsapp.devflowlabs.com.br` ou o teu domínio do app) |
| `NEXT_PUBLIC_WHATSAPP_APP_URL` | Sim (igual à URL pública deste deploy) |
| `STRIPE_*`, `SUPABASE_*`, `OPENAI_*`, etc. | Conforme necessário |

No **portal** (deploy raiz), `NEXT_PUBLIC_WHATSAPP_APP_URL` deve apontar para **esta** origem (ex.: `https://whatsapp.devflowlabs.com.br`).

### 4. Domínio (ex.: whatsapp.devflowlabs.com.br)

1. No projeto: **Settings** → **Domains**
2. **Add** → `whatsapp.devflowlabs.com.br` (ou o subdomínio escolhido)
3. Configure o DNS no provedor do domínio:
   - Tipo: `CNAME`
   - Nome: `whatsapp` (ajustar ao teu host)
   - Valor: `cname.vercel-dns.com` (ou o indicado pela Vercel)
4. Aguarde a propagação (pode levar alguns minutos)

### 5. OAuth Redirect URIs na Meta

No Meta for Developers → seu app → **WhatsApp** → **Configuration**:

Em **Valid OAuth Redirect URIs**, inclua a URL **do mesmo host** do app:

```
https://whatsapp.devflowlabs.com.br/dashboard/whatsapp/callback
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
   https://whatsapp.devflowlabs.com.br/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=SEU_TOKEN&hub.challenge=999
   ```

   Deve retornar `999`.

3. No Meta Dashboard: **WhatsApp** → **Configuration** → **Webhook**
   - **Callback URL**: `https://whatsapp.devflowlabs.com.br/api/webhook/whatsapp`
   - **Verify Token**: igual a `WHATSAPP_VERIFY_TOKEN`
   - **Salvar** → status deve ficar verde

---

## Plano de transição

Para o plano passo a passo usado na migração (incl. rollback documentado), veja **`PLANO_TRANSICAO_APP_SUBDOMINIO.md`** — actualizado para o host canónico `whatsapp.devflowlabs.com.br`.

---

## Arquitetura

```
Meta → https://whatsapp.devflowlabs.com.br/api/webhook/whatsapp
     → whatsapp-platform (Vercel)
     → tenantResolutionService (WhatsappPhoneNumber)
     → Prisma (WHATSAPP_DATABASE_URL)
     → IA / billing / Stripe
```

Portal: landings e auth; paths do produto WhatsApp → **308** para `NEXT_PUBLIC_WHATSAPP_APP_URL`.
