# Correção do webhook via Graph API — Inscrever app na WABA

## Contexto

- **WABA ID:** 1646490656385716
- **Phone Number ID correto:** 1027838990414844
- **App ID:** 3926869380951661 (DevFlow Labs)
- **Callback URL:** https://devflowlabs.com.br/api/webhook/whatsapp
- **Situação anterior:** `GET /subscribed_apps` retornava `{"data":[]}` — nenhum app inscrito
- **Resolução:** POST aplicado em Mar 2025 — app inscrito com sucesso

**Requisito:** Token com permissões `whatsapp_business_management` e `whatsapp_business_messaging`. O token precisa ser do **app** que será inscrito (DevFlow Labs) e ter acesso à WABA.

---

## 1. Inscrição via POST subscribed_apps

### Versão simples (só inscrever o app)

**Objetivo:** Associar o app à WABA para receber webhooks. A Meta usa a Callback URL e os campos configurados no **App Dashboard** (WhatsApp > Configuration).

**Comando:**
```bash
curl -X POST "https://graph.facebook.com/v22.0/1646490656385716/subscribed_apps?access_token=SEU_ACCESS_TOKEN"
```

**Resposta esperada (OK):**
```json
{
  "success": true
}
```

**Interpretação:**
- `"success": true` → app inscrito com sucesso
- Sem body no POST; o token vai na query string (`access_token=...`)

---

### Versão com subscribed_fields (mensagens e status)

**Objetivo:** Garantir explicitamente que o webhook receba `messages` e `statuses`. Útil se a inscrição simples não ativar os campos.

**Comando:**
```bash
curl -X POST "https://graph.facebook.com/v22.0/1646490656385716/subscribed_apps" \
  -d "subscribed_fields=messages" \
  -d "subscribed_fields=message_template_status_update" \
  -d "access_token=SEU_ACCESS_TOKEN"
```

Ou com `messages` e `statuses` (status de entregas):
```bash
curl -X POST "https://graph.facebook.com/v22.0/1646490656385716/subscribed_apps" \
  -d "subscribed_fields=messages" \
  -d "subscribed_fields=message_template_status_update" \
  -d "access_token=SEU_ACCESS_TOKEN"
```

**Campos comuns para WhatsApp:**
- `messages` — mensagens recebidas e enviadas (inclui echoes)
- `message_template_status_update` — status de templates aprovados/rejeitados
- Alguns relatórios mencionam também `messaging_handover` etc.

**Resposta esperada (OK):**
```json
{
  "success": true
}
```

**Nota:** A API pode ignorar `subscribed_fields` em alguns setups. Se retornar `success: true`, a inscrição foi feita; os campos podem ser herdados do App Dashboard.

---

## 2. Token na query string

A Meta espera o token na **query string**, não só no header. Exemplo correto:

```bash
# ✅ Correto
curl -X POST "https://graph.facebook.com/v22.0/1646490656385716/subscribed_apps?access_token=SEU_ACCESS_TOKEN"

# ❌ Pode falhar (alguns cenários)
curl -X POST "https://graph.facebook.com/v22.0/1646490656385716/subscribed_apps" \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN"
```

Use `?access_token=...` ou combine com form-data se enviar `subscribed_fields`.

---

## 3. Validar a inscrição

**Comando:**
```bash
curl -s "https://graph.facebook.com/v22.0/1646490656385716/subscribed_apps?access_token=SEU_ACCESS_TOKEN"
```

**Antes da correção:**
```json
{"data":[]}
```

**Depois da correção (sucesso):**
```json
{
  "data": [{
    "whatsapp_business_api_data": {
      "link": "https://www.facebook.com/games/?app_id=3926869380951661",
      "name": "DevFlow Labs",
      "id": "3926869380951661"
    }
  }]
}
```

**Interpretação:**
- `data` com pelo menos um objeto `{ "id": "..." }` → app inscrito
- `id` deve ser o App ID do DevFlow Labs (confira no Meta for Developers)
- `data` vazio após o POST → inscrição falhou ou token sem permissão

---

## 4. Sinais de erro no POST

| Resposta | Significado |
|----------|-------------|
| `Unsupported post request. Object with ID '...' does not exist, cannot be loaded due to missing permissions...` | Token sem permissão ou WABA não acessível ao app |
| `Application does not have permission for this action` | App não vinculado ao Business no Business Manager ou token inadequado |
| `Invalid OAuth 2.0 Access Token` | Token expirado ou inválido |
| `400` / `(#100)` | Parâmetros inválidos |
| `200` com `success: false` ou sem `success` | Operação não concluída — checar permissões e vínculo App ↔ WABA |

**Solução típica:** Usar token do System User do Business com tarefas corretas e garantir que o app está em **Business Manager > Account > Apps**.

---

## 5. Checklist pós-inscrição

### 5.1 Validar subscribed_apps
```bash
curl -s "https://graph.facebook.com/v22.0/1646490656385716/subscribed_apps?access_token=SEU_ACCESS_TOKEN"
```
- [ ] `data` não está vazio
- [ ] O `id` retornado é o App ID do DevFlow Labs

### 5.2 Conferir configuração no App Dashboard
- [ ] **Meta for Developers** → App DevFlow Labs → WhatsApp → **Configuration**
- [ ] Callback URL = `https://devflowlabs.com.br/api/webhook/whatsapp`
- [ ] Verify Token = valor em `WHATSAPP_VERIFY_TOKEN`
- [ ] Campos assinados: **messages** (e outros desejados)

### 5.3 Enviar mensagem real
- [ ] Enviar WhatsApp do celular **para** o número +55 13 99138-8591 (DevFlow Digital)
- [ ] Aguardar 5–10 segundos

### 5.4 Observar logs da Vercel
- [ ] **Vercel Dashboard** → Projeto → **Logs** (ou Runtime Logs)
- [ ] Filtro por rota `/api/webhook/whatsapp` ou pelo domínio
- [ ] Confirmar POST 200 e logs do webhook handler
- [ ] Se não houver POST → verificar Callback URL, campos assinados e DNS/SSL

### 5.5 Teste com curl (opcional)
```bash
curl -X POST "https://devflowlabs.com.br/api/webhook/whatsapp" \
  -H "Content-Type: application/json" \
  -d '{"object":"whatsapp_business_account","entry":[{"id":"1646490656385716","changes":[{"value":{"messaging_product":"whatsapp","metadata":{"phone_number_id":"1027838990414844"},"messages":[{"from":"5511999999999","id":"test","type":"text","text":{"body":"teste"}}]}}]}]}'
```
- [ ] Resposta 200
- [ ] Logs indicam processamento do evento

---

## 6. Comandos prontos (copiar e colar)

```bash
# Variáveis (ajuste o token)
TOKEN="seu_whatsapp_access_token"
VER="v22.0"
WABA="1646490656385716"

# 1. Inscrever app (versão simples)
curl -X POST "https://graph.facebook.com/$VER/$WABA/subscribed_apps?access_token=$TOKEN"

# 2. Validar inscrição
curl -s "https://graph.facebook.com/$VER/$WABA/subscribed_apps?access_token=$TOKEN"

# 3. (Opcional) Inscrição com subscribed_fields
curl -X POST "https://graph.facebook.com/$VER/$WABA/subscribed_apps" \
  -d "subscribed_fields=messages" \
  -d "subscribed_fields=message_template_status_update" \
  -d "access_token=$TOKEN"
```

---

## 7. Fluxo resumido

1. **POST** `/{WABA}/subscribed_apps` com token válido
2. Resposta `{"success": true}`
3. **GET** `/{WABA}/subscribed_apps` → `data` com o App ID
4. Callback URL e campos corretos no App Dashboard
5. Enviar mensagem real e conferir logs na Vercel

---

## 8. Resolução aplicada (Mar 2025)

- **POST executado:** `curl -X POST "https://graph.facebook.com/v22.0/1646490656385716/subscribed_apps?access_token=..."` → `{"success":true}`
- **GET de validação:** App `3926869380951661` (DevFlow Labs) listado em `subscribed_apps`
- **Log esperado após mensagem real:** `POST received` → `normalized` → `messagesCount: 1` → `processing text message`
- **Causa raiz confirmada:** Ausência de inscrição do app na WABA — não era código, tenant, Prisma ou `WHATSAPP_PHONE_NUMBER_ID`
