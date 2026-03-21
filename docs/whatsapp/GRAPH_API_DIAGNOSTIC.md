# Diagnóstico via Graph API — App, WABA e Phone Number ID

## Contexto

- **App:** DevFlow Labs
- **WABA ID:** 1646490656385716
- **Phone Number ID atual (backend):** 1027838990414844
- **Phone Number ID em logs antigos:** 1065301256661411
- **Problema:** mensagem real não gera POST no webhook

Use `WHATSAPP_ACCESS_TOKEN` ou `META_WHATSAPP_ACCESS_TOKEN` do app. Token precisa das permissões `whatsapp_business_management` e `whatsapp_business_messaging`.

**Base URL:** `https://graph.facebook.com/v22.0` (ou a versão em `META_API_VERSION`)

---

## 1. Queries Graph API

### Query 1 — WABA por ID

**Objetivo:** Validar se o WABA existe e se o token tem acesso.

**Query:**
```
GET https://graph.facebook.com/v22.0/1646490656385716?fields=id,name,status,message_template_namespace&access_token=SEU_ACCESS_TOKEN
```

**Resposta esperada (OK):**
```json
{
  "id": "1646490656385716",
  "name": "Nome do WABA",
  "status": "ACTIVE",
  "message_template_namespace": "..."
}
```

**Sinais de erro:**
- `400` / `(#100) Invalid parameter` — WABA ID inválido
- `190` / `Invalid OAuth 2.0 Access Token` — token inválido ou expirado
- `200` / `Permissions error` — falta permissão no token
- `200008` — WABA sem números vinculados

---

### Query 2 — Phone numbers da WABA

**Objetivo:** Listar todos os números vinculados ao WABA e verificar qual Phone Number ID corresponde ao número da DevFlow.

**Query:**
```
GET https://graph.facebook.com/v22.0/1646490656385716/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,name_status&access_token=SEU_ACCESS_TOKEN
```

**Resposta esperada (OK):**
```json
{
  "data": [
    {
      "id": "1027838990414844",
      "display_phone_number": "55 11 99999-9999",
      "verified_name": "DevFlow Labs",
      "quality_rating": "GREEN",
      "name_status": "VERIFIED"
    }
  ]
}
```

**Interpretação:**
- `data[]` — lista de números
- `id` — Phone Number ID (usado no webhook e no envio)
- `display_phone_number` — número exibido ao usuário
- Se `1027838990414844` não estiver na lista → backend está usando um número que não pertence a esse WABA
- Se `1065301256661411` aparecer e `1027838990414844` não → você pode estar olhando o número errado

**Sinais de erro:**
- `data` vazio — WABA sem números ou token sem permissão
- Phone Number ID do backend não está em `data` — binding errado

---

### Query 3 — Phone number por ID (validação direta)

**Objetivo:** Checar se um Phone Number ID específico existe e retorna dados.

**Query (ID atual do backend):**
```
GET https://graph.facebook.com/v22.0/1027838990414844?fields=id,display_phone_number,verified_name,quality_rating&access_token=SEU_ACCESS_TOKEN
```

**Query (ID antigo dos logs):**
```
GET https://graph.facebook.com/v22.0/1065301256661411?fields=id,display_phone_number,verified_name,quality_rating&access_token=SEU_ACCESS_TOKEN
```

**Resposta esperada (OK):**
```json
{
  "id": "1027838990414844",
  "display_phone_number": "55 11 99999-9999",
  "verified_name": "DevFlow Labs",
  "quality_rating": "GREEN"
}
```

**Interpretação:**
- Se ambos os IDs retornam 200 → você tem dois números; o webhook pode estar configurado para um e o backend esperando o outro
- Se um retorna 200 e o outro erro → confirma qual número existe nesse contexto
- `100` / "Unsupported get request" — ID não existe ou não pertence ao app/token

---

### Query 4 — Apps inscritos no webhook (WABA)

**Objetivo:** Ver quais apps recebem webhooks desse WABA.

**Query:**
```
GET https://graph.facebook.com/v22.0/1646490656385716/subscribed_apps?access_token=SEU_ACCESS_TOKEN
```

**Resposta esperada (OK):**
```json
{
  "data": [
    {
      "id": "APP_ID_DO_DEVFLOW"
    }
  ]
}
```

**Interpretação:**
- O App ID do DevFlow Labs deve estar em `data`
- Se não estiver → nenhum app está inscrito no webhook desse WABA; eventos não serão entregues
- Se houver mais de um app → confirme qual tem a Callback URL correta

**Formato real da resposta (pós-inscrição):**
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

---

### Query 5 — Teste de envio (opcional)

**Objetivo:** Validar se o token e o Phone Number ID permitem enviar mensagem.

**Query:**
```
POST https://graph.facebook.com/v22.0/1027838990414844/messages
Content-Type: application/json

{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "5511999999999",
  "type": "text",
  "text": { "body": "Teste Graph API" }
}
```

Headers: `Authorization: Bearer SEU_ACCESS_TOKEN`

**Resposta esperada (OK):**
```json
{
  "messaging_product": "whatsapp",
  "contacts": [...],
  "messages": [{ "id": "wamid.xxx" }]
}
```

**Sinais de erro:**
- `131047` — Número do destinatário não está em formato válido
- `131031` — Conta bloqueada
- `100` — Parâmetros inválidos
- Se enviar OK mas o webhook não receber o echo → problema é só de entrega de webhook, não de permissão de envio

---

## 2. Cenários que indicam binding errado

| Cenário | Indicação |
|---------|-----------|
| **1027838990414844 não está em** `/{WABA}/phone_numbers` | Backend espera número que não pertence a esse WABA |
| **1065301256661411 está na lista, 1027838990414844 não** | Webhook provavelmente recebe eventos do 1065...; backend está configurado para 1027... |
| **Nenhum app em** `/{WABA}/subscribed_apps` | Webhooks não estão inscritos; Meta não envia POST |
| **App do DevFlow não está em subscribed_apps** | Webhook pode estar em outro app; esse WABA não envia para o DevFlow |
| **GET em 1027838990414844 retorna erro** | Número não existe ou token sem acesso |
| **GET em 1065301256661411 retorna 200** | Esse número existe; pode ser o que recebe mensagens (e cujo webhook está configurado em outro app) |

---

## 3. Concluir: webhook configurado para um número, backend esperando outro

**Fluxo de diagnóstico:**

1. Rodar **Query 2** — listar números da WABA.
2. Identificar qual `id` corresponde ao número que você envia mensagem (pelo `display_phone_number`).
3. Comparar com `WHATSAPP_PHONE_NUMBER_ID` no backend:
   - Se forem iguais → backend e Meta estão alinhados; o problema tende a ser Callback URL ou campos do webhook.
   - Se forem diferentes → **binding errado**:
     - **Opção A:** Atualizar `WHATSAPP_PHONE_NUMBER_ID` e o banco (Tenant/WhatsappPhoneNumber) para o Phone Number ID real.
     - **Opção B:** Configurar o webhook e o número na Meta para usar o ID que o backend já espera.
4. Rodar **Query 4** — confirmar que o app do DevFlow está em `subscribed_apps`.
5. Conferir no Meta: App → WhatsApp → Configuration → Callback URL e campos `messages`.

---

## 4. Resumo das queries (curl)

```bash
TOKEN="seu_access_token"
VER="v22.0"
WABA="1646490656385716"
PHONE_CURRENT="1027838990414844"
PHONE_OLD="1065301256661411"

# 1. WABA
curl -s "https://graph.facebook.com/$VER/$WABA?fields=id,name,status&access_token=$TOKEN"

# 2. Números da WABA
curl -s "https://graph.facebook.com/$VER/$WABA/phone_numbers?fields=id,display_phone_number,verified_name&access_token=$TOKEN"

# 3a. Phone Number ID atual
curl -s "https://graph.facebook.com/$VER/$PHONE_CURRENT?fields=id,display_phone_number,verified_name&access_token=$TOKEN"

# 3b. Phone Number ID antigo
curl -s "https://graph.facebook.com/$VER/$PHONE_OLD?fields=id,display_phone_number,verified_name&access_token=$TOKEN"

# 4. Apps inscritos
curl -s "https://graph.facebook.com/$VER/$WABA/subscribed_apps?access_token=$TOKEN"
```

---

## 5. Resultado esperado (binding correto)

- **Query 1:** WABA retorna `status: ACTIVE`
- **Query 2:** Lista contém o número da DevFlow com `id` = `1027838990414844` (ou o ID que você usa no backend)
- **Query 3:** O Phone Number ID do backend retorna 200 com dados do número
- **Query 4:** App ID do DevFlow Labs está em `subscribed_apps`
- `WHATSAPP_PHONE_NUMBER_ID` e banco usam o mesmo `id` que aparece em `/{WABA}/phone_numbers` para o número da DevFlow

---

## 6. Resolução aplicada (Mar 2025)

**Diagnóstico realizado:** `GET /subscribed_apps` retornou `{"data":[]}` — nenhum app inscrito.

**Causa raiz:** O app DevFlow Labs não estava inscrito na WABA via `subscribed_apps`. A Meta não enviava POST para o webhook porque nenhum app estava registrado para receber eventos dessa WABA.

**Resultados das queries:**
- **Query 1:** WABA `1646490656385716` existe, `status: ACTIVE`, nome "DevFlow Labs"
- **Query 2:** Um número: `1027838990414844` (+55 13 99138-8591, DevFlow Digital, CONNECTED)
- **Query 3:** `1027838990414844` = número real; `1065301256661411` = número de teste Meta (+1 555-138-2947)
- **Query 4 (antes):** `{"data":[]}` — problema identificado
- **Correção:** `POST /{WABA}/subscribed_apps` → `{"success": true}`
- **Query 4 (depois):** App `3926869380951661` (DevFlow Labs) inscrito

**Não era problema:** código, tenant, Prisma, `WHATSAPP_PHONE_NUMBER_ID`. A correção foi apenas inscrever o app na WABA via Graph API. Ver [WEBHOOK_SUBSCRIPTION_FIX.md](./WEBHOOK_SUBSCRIPTION_FIX.md).
