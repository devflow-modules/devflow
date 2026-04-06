# Auditoria definitiva — Configuração do webhook WhatsApp Cloud API

## Diagnóstico

- **curl manual** → ✅ 200 OK  
- **POST forçado** → ✅ gera logs  
- **Mensagem real do WhatsApp** → ❌ nenhum log (antes da correção)

**Conclusão:** A Meta não estava entregando eventos. O problema era de **configuração externa no Meta**, não do código.

**Causa raiz identificada (Mar 2025):** `GET /{WABA}/subscribed_apps` retornava `{"data":[]}` — nenhum app inscrito na WABA. A correção foi inscrever o app via `POST /{WABA}/subscribed_apps`. Ver [WEBHOOK_SUBSCRIPTION_FIX.md](./WEBHOOK_SUBSCRIPTION_FIX.md) e [GRAPH_API_DIAGNOSTIC.md](./GRAPH_API_DIAGNOSTIC.md).

---

## 1. Rota real do webhook

| Item | Valor |
|------|--------|
| **Arquivo** | `apps/whatsapp-platform/src/app/api/webhook/whatsapp/route.ts` |
| **App** | **`apps/whatsapp-platform`** (deploy canónico), não o portal na raiz |
| **Path** | `/api/webhook/whatsapp` |
| **Métodos** | GET (verificação), POST (eventos) |

Após o **cutover**, o portal em `devflowlabs.com.br` **não** serve este endpoint; a Meta deve apontar para o **host público do app** (ex.: Vercel do `whatsapp-platform`).

---

## 2. URL final exata a cadastrar na Meta

Usar a origem do deploy do **whatsapp-platform**, por exemplo:

```
https://whatsapp.devflowlabs.com.br/api/webhook/whatsapp
```

**Importante:** sem barra no final na URL base do callback, HTTPS obrigatório. Substituir pelo teu domínio real se diferente.

---

## 3. Possíveis desencontros de configuração

| Cenário | O que verificar |
|---------|------------------|
| **Callback URL errada** | Meta apontando para o **portal** (`devflowlabs.com.br`) ou host antigo em vez do **app canónico** (`whatsapp.devflowlabs.com.br` ou equivalente) |
| **Override ativo** | Override no WABA apontando para outra URL (ngrok antigo, staging, etc.) |
| **Webhook no nível User** | Inscrição em "User" em vez de "WhatsApp Business Account" — estrutura de payload diferente |
| **Campo `messages` não inscrito** | Só `message_template_status_update` ou outros campos; `messages` precisa estar marcado |
| **App / WABA / número desvinculados** | App diferente do que gerencia o número; WABA diferente; número em outro WABA |
| **Domínio antigo / ngrok** | Callback ainda apontando para URL de desenvolvimento antiga |
| **App não inscrito em subscribed_apps** | `GET /{WABA}/subscribed_apps` retorna `{"data":[]}` — Meta não envia POST. Corrigir via `POST /{WABA}/subscribed_apps` |

---

## 4. Checklist técnico — Meta Dashboard

### 4.1 App (Meta for Developers)

- [ ] **App correto** — App que possui o produto WhatsApp e gerencia o número da DevFlow
- [ ] **WhatsApp → Configuration** — Seção "Webhook" acessível
- [ ] **Callback URL** = `https://devflowlabs.com.br/api/webhook/whatsapp`
- [ ] **Verify Token** = valor idêntico a `WHATSAPP_VERIFY_TOKEN` no Vercel
- [ ] **Status** = Verde (verificado) — testar com GET `?hub.mode=subscribe&hub.verify_token=TOKEN&hub.challenge=999`

### 4.2 Campos subscritos (Webhook fields)

- [ ] **`messages`** — obrigatório para mensagens inbound
- [ ] **`message_template_status_update`** — opcional (status de templates)
- [ ] **`message_echoes`** — opcional (eco de mensagens enviadas)

### 4.3 Nível de inscrição

- [ ] Webhook inscrito em **WhatsApp Business Account** (WABA), não apenas em "User"

### 4.4 WABA e Override

- [ ] **WhatsApp Manager** → Phone Numbers → número da DevFlow vinculado ao WABA correto
- [ ] **Override callback URL** (se existir): remover ou ajustar para `https://devflowlabs.com.br/api/webhook/whatsapp`
- [ ] Confirmar que o Override não aponta para ngrok, localhost ou outro domínio

### 4.5 Phone number

- [ ] **Phone Number ID** = `1027838990414844` (conforme usado nos testes)
- [ ] Número ativo e conectado ao WABA
- [ ] App com permissão para esse número

---

## 5. Checklist Vercel

- [ ] Projeto correto — deployment em `devflowlabs.com.br`
- [ ] Domínio `devflowlabs.com.br` configurado em Settings → Domains
- [ ] `WHATSAPP_VERIFY_TOKEN` definido e igual ao Meta
- [ ] `WHATSAPP_PHONE_NUMBER_ID` = `1027838990414844`
- [ ] `WHATSAPP_ACCESS_TOKEN` válido (não expirado)
- [ ] Build do app raiz (não apenas whatsapp-platform como projeto separado)

---

## 6. Teste de verificação (GET)

```bash
curl "https://devflowlabs.com.br/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=SEU_VERIFY_TOKEN&hub.challenge=999"
```

**Esperado:** resposta `999` (ou o valor de `hub.challenge`). Se retornar JSON, o token não confere.

---

## 7. Veredito final

| Item | Status |
|------|--------|
| **Código** | ✅ Correto — rota existe, handler funciona, curl responde |
| **Deploy Vercel** | ✅ Endpoint acessível em produção |
| **Configuração Meta** | ✅ **Corrigido (Mar 2025)** — app inscrito via `POST /{WABA}/subscribed_apps` |

**Causa raiz confirmada:** App não inscrito em `subscribed_apps`. A Meta não enviava POST porque nenhum app estava registrado para receber eventos dessa WABA.

**Ação aplicada:** `POST https://graph.facebook.com/v22.0/1646490656385716/subscribed_apps?access_token=...` → `{"success":true}`. App `3926869380951661` (DevFlow Labs) agora listado em `subscribed_apps`.

**Checklist contínuo:** Callback URL, Verify Token, campo `messages`, Override vazio ou correto — manter conferido. Ver [WEBHOOK_META_CHECKLIST.md](./WEBHOOK_META_CHECKLIST.md).
