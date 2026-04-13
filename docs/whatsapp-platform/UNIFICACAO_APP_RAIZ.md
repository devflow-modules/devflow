# Unificação WhatsApp Platform no App Raiz

> **Pós-cutover:** o webhook e o runtime do produto WhatsApp **não** ficam mais no portal nem no app raiz. O canónico é **`apps/whatsapp-platform`** num host dedicado (ex.: `https://whatsapp.devflowlabs.com.br`). O portal redireciona **308** para esse app (`NEXT_PUBLIC_WHATSAPP_APP_URL`). Este ficheiro descreve uma **fase histórica** da arquitectura; para operação actual, ver `ARCHITECTURE.md` e `docs/ecossistema/ROTAS-ECOSSISTEMA-DEVFLOWLABS.md`.

## Objetivo (contexto histórico)

Rodar 100% do WhatsApp Platform em `devflowlabs.com.br` (app raiz), sem depender de subdomínios — **abordagem posteriormente substituída** pelo deploy dedicado `whatsapp-platform`.

---

## O que foi implementado

### 1. Prisma WhatsApp no root

- **Schema:** `prisma/whatsapp.schema.prisma` (usa `WHATSAPP_DATABASE_URL`)
- **Client:** gerado em `src/generated/prisma-whatsapp`
- **Lib:** `src/lib/prisma.ts` exporta o client como `prisma`
- **Scripts:** `pnpm db:generate` e `pnpm build` geram ambos os clients (root + whatsapp)

### 2. Módulos compartilhados

Os módulos do `whatsapp-platform` são usados via path aliases no `tsconfig.json`:

- `@wa/*` → `apps/whatsapp-platform/src/*`
- `@/modules/whatsapp/*`, `@/modules/messaging/*`, `@/modules/inbox/*`, etc.
- `@/lib/prisma` → client WhatsApp
- `@/lib/constants`, `@/lib/supabase-server`, `@/lib/auth-config`

### 3. Rotas no app raiz

| Rota | Método | Função |
|------|--------|--------|
| `/api/webhook/whatsapp` | GET, POST | Webhook Meta — verificação + eventos |
| `/api/whatsapp/onboard` | POST | Início do Embedded Signup |
| `/api/whatsapp/onboard/callback` | POST | Callback OAuth — salva em WhatsappPhoneNumber |
| `/api/whatsapp/phone-numbers` | GET, DELETE | Listar/remover números |

### 4. Dashboard

- `/dashboard/whatsapp` — lista de números, botão "Conectar novo número"
- `/dashboard/whatsapp/callback` — callback do OAuth (code + state)

### 5. Webhook

- **GET:** Verifica `hub.mode`, `hub.verify_token`, retorna `hub.challenge`
- **POST:** Normaliza payload → resolve tenant (WhatsappPhoneNumber) → persiste inbox → IA/legado → trackUsage

### 6. Build do app raiz (Next.js)

- **Status:** `pnpm build` conclui com sucesso.
- **Legado removido:** `modules/queues` e `modules/agents` (Supabase) deixaram de existir no código; filas e atribuição humana estão no domínio Inbox Prisma (`OPERATIONAL_QUEUES_CANONICAL.md`, `CONVERSATION_OWNERSHIP_AND_HANDOFF.md`).
- **Pacotes transpilados:** `@devflow/whatsapp-core`, `@devflow/ai-core` (ver `next.config`).

---

## Correções finais aplicadas

| Item | O que foi feito |
|------|-----------------|
| **billingService** | `meteredBillingConfigured` passou a usar `isMeterEventsConfigured()` (import de `stripeMeterClient`), corrigindo referência a `isMeteredBillingConfigured` inexistente no arquivo. |
| **Supabase (`src/lib/supabase-server.ts`)** | Client retornado com tipagem permissiva para tabelas do projeto WhatsApp (`conversations`, `messages`, etc.) sem `database.types.ts` local — evita erro TS em `conversationsRepository`. |
| **Controller legado** | `src/modules/whatsapp-webhook/whatsappWebhook.controller.ts` importa `IncomingMessage` / `handleIncomingMessage` de `@/modules/whatsapp-legacy/*` (handler em `src/modules/whatsapp/`), pois `@/modules/whatsapp/*` aponta para o `webhookHandler` do whatsapp-platform (sem esses exports). |
| **Next.js 16 + `useSearchParams`** | `/dashboard/whatsapp` e `/dashboard/whatsapp/callback`: conteúdo que usa `useSearchParams` envolvido em `<Suspense>` (exigência de prerender). |

---

## Variáveis de ambiente (app raiz)

```
# WhatsApp
WHATSAPP_DATABASE_URL=
WHATSAPP_DIRECT_URL=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=      # fallback single-tenant
WHATSAPP_ACCESS_TOKEN=         # fallback single-tenant

# Meta Embedded Signup
META_APP_ID=
META_APP_SECRET=
META_EMBEDDED_SIGNUP_CONFIG_ID=

# Auth (JWT para dashboard)
JWT_SECRET=
COOKIE_DOMAIN=                 # opcional

# URL base (checkout, callback)
NEXT_PUBLIC_WHATSAPP_APP_URL=https://devflowlabs.com.br
# ou NEXT_PUBLIC_APP_URL

# Supabase (opcional — webhook logs, conversations)
WHATSAPP_SUPABASE_URL=
WHATSAPP_SUPABASE_SERVICE_ROLE_KEY=

# Stripe / billing WhatsApp (trackUsage, enforcement, checkout)
WHATSAPP_STRIPE_SECRET_KEY=
WHATSAPP_STRIPE_WEBHOOK_SECRET=
WHATSAPP_STRIPE_PRICE_STARTER=
WHATSAPP_STRIPE_PRICE_PRO=
WHATSAPP_STRIPE_PRICE_SCALE=
# Metered (mensagens / IA) — ver .env.example para nomes completos
```

Há fallback documentado no `.env.example` (ex.: `STRIPE_SECRET_KEY` se `WHATSAPP_STRIPE_SECRET_KEY` estiver ausente), conforme implementação nos módulos Stripe do whatsapp-platform.

---

## Resolução de tenant

1. **WhatsappPhoneNumber** (Embedded Signup) — prioridade
2. **Tenant legado** (`phoneNumberId` no Tenant)
3. **Env fallback** — `WHATSAPP_PHONE_NUMBER_ID` + `WHATSAPP_ACCESS_TOKEN`

---

## Auth do dashboard

O dashboard usa **JWT** do whatsapp-platform (`getAuthFromRequest`). Para logar:

- Acesse o login do whatsapp-platform (se houver) ou
- Configure um adapter Supabase → tenantId para usar o auth do root

---

## Path aliases relevantes

Além de `@wa/*` e `@/modules/whatsapp/*` (whatsapp-platform), o root define:

- **`@/modules/whatsapp-legacy/*`** → `src/modules/whatsapp/*` — handler demo/legado (`handleIncomingMessage`) e código que não deve colidir com o `webhookHandler` unificado.

---

## Pendências / próximos passos

1. **Migrations:** Garantir deploy das migrations do `prisma/whatsapp.schema.prisma` no banco apontado por `WHATSAPP_DATABASE_URL` (produção).
2. **Auth unificado (opcional):** Mapear usuário do auth do site → `tenantId` para o dashboard, se quiser abandonar JWT dedicado do fluxo WhatsApp.
3. **Teste E2E:** Login → `/dashboard/whatsapp` → Embedded Signup → mensagem inbound → webhook → tenant correto → IA → envio → `trackUsage` / Stripe.

**Concluído em relação à versão anterior:** erros de TypeScript do build (Supabase `conversations`, imports do controller, Suspense) foram resolvidos; `pnpm build` está verde.

---

## Arquitetura descrita neste doc (histórica)

```
Meta → (URL do portal / raiz — legado)
     → app raiz (Next.js)
     → …
```

**Canónico hoje:** `Meta → https://whatsapp.devflowlabs.com.br/api/webhook/whatsapp → whatsapp-platform` — ver `docs/whatsapp/WEBHOOK_META_CHECKLIST.md`.

---

## Como testar (legado; não aplicável ao cutover actual)

1. Configure `WHATSAPP_DATABASE_URL` e faça migrations.
2. Configure `WHATSAPP_VERIFY_TOKEN`, `META_*`.
3. Em produção actual, use o host do **`whatsapp-platform`**:  
   `https://whatsapp.devflowlabs.com.br/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=TOKEN&hub.challenge=999`
4. **Callback URL** na Meta: mesma base do deploy `whatsapp-platform` (não o portal).
5. **OAuth Redirect URI:** `https://whatsapp.devflowlabs.com.br/dashboard/whatsapp/callback` (ou o domínio que servir o app).
