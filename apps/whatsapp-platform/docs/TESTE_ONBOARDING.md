# Teste do fluxo de onboarding — Embedded Signup

## 0. Webhook unificado (obrigatório)

O webhook **deve** apontar para o whatsapp-platform:

| Meta Dashboard | URL |
|----------------|-----|
| WhatsApp → Configuration → Webhook | `https://whatsapp.devflowlabs.com.br/api/webhook/whatsapp` (host do `whatsapp-platform`) |
| Verify Token | `devflow_8f3a2e9c1b7d4f6a0e5c8b2` (igual ao WHATSAPP_VERIFY_TOKEN) |

Fluxo correto: **Meta → host do whatsapp-platform → Prisma → tenantResolution → IA → Stripe**

---

## 1. Preparação

### .env.local

```bash
META_APP_ID=<preenchido>
META_APP_SECRET=<preenchido>
META_EMBEDDED_SIGNUP_CONFIG_ID=<preenchido>
NEXT_PUBLIC_WHATSAPP_APP_URL=http://localhost:3000   # para teste local
```

### Meta App — Valid OAuth Redirect URIs

Adicione **ambas** as URIs em Facebook Login → Settings:

- **Produção:** `https://devflowlabs.com.br/dashboard/whatsapp/callback`
- **Local:** `http://localhost:3000/dashboard/whatsapp/callback`

### Meta App — Permissões da Config

- `whatsapp_business_management`
- `whatsapp_business_messaging`

---

## 2. Executar app

```bash
cd apps/whatsapp-platform && pnpm dev
```

Acesse: http://localhost:3000

---

## 3. Teste passo a passo

### 3.1 Login

1. Faça login (ou crie conta via signup)
2. O JWT deve conter `tenantId`

### 3.2 Conectar número

1. Acesse `/dashboard/whatsapp`
2. Clique em **"Conectar novo número"**
3. **Log esperado:** `[WHATSAPP] onboard start tenant=<id> redirect_uri=...`
4. Deve redirecionar para Meta OAuth

### 3.3 Fluxo Meta

1. Login no Facebook (se necessário)
2. Selecione o Business
3. Selecione o número WhatsApp
4. Autorize as permissões
5. Meta redireciona para `/dashboard/whatsapp/callback?code=XXX&state=tenantId`

### 3.4 Callback

1. A página callback lê `code` e `state` da URL
2. POST para `/api/whatsapp/onboard/callback`
3. **Log esperado:** `[WHATSAPP] onboard success tenant=<id> phone_number_id=<id>`
4. Redireciona para `/dashboard/whatsapp?success=1`
5. O número aparece na lista

### 3.5 Verificar banco

```sql
SELECT id, tenant_id, phone_number_id, display_phone_number, waba_id, status, created_at
FROM whatsapp_phone_numbers
ORDER BY created_at DESC;
```

Esperado: `status = 'ACTIVE'`, `access_token` preenchido.

### 3.6 Teste inbound (webhook)

**Importante:** O webhook em produção está no deploy **`whatsapp-platform`** (ex.: `https://whatsapp.devflowlabs.com.br/api/webhook/whatsapp`), não no portal. Para testar localmente, use ngrok na porta **3000** e configure temporariamente no Meta.

1. Envie mensagem para o número conectado
2. **Log esperado:** `[WHATSAPP] inbound tenant=<id> wa_id=<user> type=text msg_id=<id>`
3. Mensagem persistida no WaInbox

### 3.7 Teste outbound (IA)

Se o tenant tiver IA habilitada (AiAgentConfig.enabled, systemPrompt, aiDriver configurado):

1. **Log esperado:** `[WHATSAPP] outbound tenant=<id> wa_id=<to>`
2. Resposta recebida no WhatsApp

### 3.8 Billing

- `UsageEvent` com `MESSAGE_SENT` e `AI_RESPONSE`
- `UsageAggregate` atualizado por tenant/período

---

## 4. Logs críticos

| Evento        | Log                                                        |
|---------------|------------------------------------------------------------|
| Onboard start | `[WHATSAPP] onboard start tenant=<id> redirect_uri=...`     |
| Onboard OK    | `[WHATSAPP] onboard success tenant=<id> phone_number_id=<id>` |
| Inbound       | `[WHATSAPP] inbound tenant=<id> wa_id=<wa_id> type=<type>`  |
| Outbound      | `[WHATSAPP] outbound tenant=<id> wa_id=<to>`                |
| Erro          | `[WHATSAPP][ERROR] ...`                                    |

---

## 5. Erros comuns

| Erro                         | Causa                          | Solução                                         |
|-----------------------------|--------------------------------|-------------------------------------------------|
| `state` inválido            | state ≠ tenantId do JWT        | Verificar que o usuário está logado             |
| Redirect URI inválido       | URI não na lista Meta          | Adicionar em Valid OAuth Redirect URIs          |
| Token não retornado         | Code expirado ou usado         | O code é one-time; tentar novamente             |
| Número não ACTIVE           | Erro ao salvar                 | Ver logs do callback                            |
| Tenant não encontrado       | phone_number_id sem match      | Verificar WhatsappPhoneNumber e tenantResolution |

---

## 6. Isolamento multi-tenant

1. Crie tenant A (conta 1) → conecte número A
2. Crie tenant B (conta 2) → conecte número B
3. Envie msg para número A → não deve aparecer no inbox de B
4. Billing de A e B separados em UsageEvent/UsageAggregate
