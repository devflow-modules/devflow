# Migração do webhook Meta — 5 minutos

## Objetivo

Unificar o webhook no **whatsapp-platform** para que:
- tenant resolution use `WhatsappPhoneNumber`
- Prisma correto
- IA + billing funcionem

---

## Checklist

### 1. Meta Dashboard

Caminho: **WhatsApp** → **Configuration** → **Webhook**

### 2. Atualizar URL

| Campo | De | Para |
|-------|-----|------|
| Callback URL | `https://devflowlabs.com.br/api/webhook/whatsapp` | `https://app.devflowlabs.com.br/api/webhook/whatsapp` |

### 3. Verify Token

Manter: `devflow_8f3a2e9c1b7d4f6a0e5c8b2`

(Dever bater com `WHATSAPP_VERIFY_TOKEN` no .env do whatsapp-platform.)

### 4. Salvar e validar

- Clique em **Salvar**
- Meta fará GET para validar → o whatsapp-platform responde o challenge
- Status deve ficar **verde**

### 5. Teste imediato

- Clique em **"Enviar webhook de teste"** (ou equivalente)
- Verifique logs do whatsapp-platform: `[WHATSAPP] inbound tenant=...`

---

## Deploy

Garantir que `app.devflowlabs.com.br` aponte para o deploy do **whatsapp-platform** (não o app raiz).

---

## Arquitetura final

```
Meta → https://app.devflowlabs.com.br/api/webhook/whatsapp
     → whatsapp-platform
     → tenantResolutionService (WhatsappPhoneNumber)
     → Prisma
     → IA / billing / Stripe
```
