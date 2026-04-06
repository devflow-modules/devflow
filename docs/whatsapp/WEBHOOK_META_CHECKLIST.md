# Checklist operacional — Webhook WhatsApp Cloud API no Meta

## Contexto

- **Cutover:** o webhook **não** está no portal (`devflowlabs.com.br`); a rota canónica é **`apps/whatsapp-platform`** no host público do app (ex.: `whatsapp.devflowlabs.com.br`).
- Rota no app: `/api/webhook/whatsapp`
- URL produção (DevFlow): `https://whatsapp.devflowlabs.com.br/api/webhook/whatsapp` — ajustar se o teu domínio for outro.
- **Causa raiz identificada (Mar 2025):** App não inscrito em `subscribed_apps` — corrigido via `POST /{WABA}/subscribed_apps`

---

## Checklist passo a passo

### 1. Acessar o app correto

1. Abra [Meta for Developers](https://developers.facebook.com/)
2. Faça login com a conta que gerencia o app da DevFlow
3. **Clique no app** que possui o produto WhatsApp e o número da DevFlow
4. Verifique: o nome do app e o App ID são os esperados

### 2. Ir até a configuração do WhatsApp

1. No menu lateral esquerdo: **Produtos** (ou "Add Product")
2. Localize **WhatsApp** e clique
3. Clique em **Configuração** (ou "Configuration")

### 3. Configurar Callback URL

1. Na seção **Webhook**, localize o campo **URL de retorno de chamada** (Callback URL)
2. Insira exatamente:
   ```
   https://whatsapp.devflowlabs.com.br/api/webhook/whatsapp
   ```
3. Sem barra no final, sem espaços, HTTPS
4. Clique em **Verificar e salvar** (ou "Verify and save")

### 4. Configurar Verify Token

1. No mesmo bloco do Webhook, localize **Token de verificação** (Verify Token)
2. Defina um valor secreto (ex.: token aleatório de 32+ caracteres)
3. **Copie esse valor** — ele deve ser idêntico a `WHATSAPP_VERIFY_TOKEN` no Vercel
4. Salve

### 5. Subscrever os Webhook fields

1. Na mesma página, encontre **Campos do Webhook** (Webhook fields) ou **Subscrições**
2. Marque **`messages`** — obrigatório para receber mensagens inbound
3. Opcionalmente: `message_template_status_update`, `message_echoes`
4. Salve as alterações

### 6. Confirmar nível de inscrição

1. O webhook deve estar inscrito em **WhatsApp Business Account** (WABA)
2. Alguns dashboards mostram "User" vs "WhatsApp Business Account"
3. Se houver opção, escolha **WhatsApp Business Account**
4. O nível errado gera payload com estrutura diferente e pode não trazer `messages`

### 7. Checar Override Callback URL (WABA)

1. Acesse [Meta Business Suite](https://business.facebook.com/) ou **WhatsApp Manager**
2. **Configurações** → **WhatsApp** → **Configuração da API**
3. Ou: App → WhatsApp → **Configuração do número de telefone** (Phone Number)
4. Procure **"Override callback URL"** ou **"URL de retorno de chamada substituta"**
5. Se estiver preenchida com outra URL (ngrok, staging, antiga):
   - Apague OU
   - Substitua por: `https://whatsapp.devflowlabs.com.br/api/webhook/whatsapp`
6. Salve

### 8. Confirmar vínculo WABA e Phone Number ID

1. Em **WhatsApp Manager** → **Configuração da API** ou **Números de telefone**
2. Confirme que o número da DevFlow está listado e ativo
3. Anote o **Phone Number ID** — deve ser `1027838990414844`
4. Confirme que o app usado (da etapa 1) tem acesso a esse WABA/número

---

## Erros mais comuns

| Erro | O que acontece | Como corrigir |
|------|----------------|---------------|
| **Callback URL errada** | Meta envia POST para URL inexistente ou outro app | Usar exatamente `https://whatsapp.devflowlabs.com.br/api/webhook/whatsapp` |
| **Override ativo** | Override no WABA redireciona para ngrok/outro domínio | Remover override ou apontar para a URL correta |
| **`messages` não inscrito** | Só status/templates chegam; mensagens reais não | Marcar campo `messages` em Webhook fields |
| **Nível errado (User)** | Payload diferente; `messages` pode vir em outro formato | Inscrição em WhatsApp Business Account |
| **Número em outro app** | Número vinculado a outro app; eventos vão para outro webhook | Usar o app correto ou migrar o número |
| **Verify Token diferente** | GET de verificação falha; Meta pode não confiar na URL | Igualar Verify Token ao `WHATSAPP_VERIFY_TOKEN` no Vercel |
| **App em modo desenvolvimento** | Número de teste; restrições de envio | Ativar app em produção ou adicionar número como testador |
| **subscribed_apps vazio** | `GET /{WABA}/subscribed_apps` retorna `{"data":[]}` — Meta não envia POST | `POST /{WABA}/subscribed_apps` com token válido (ver WEBHOOK_SUBSCRIPTION_FIX.md) |

---

## Resultado esperado (como validar)

### 1. Verificação GET (Status verde)

No Meta, ao salvar o webhook, o status deve ficar **verde** (Verificado).

Teste manual:
```bash
curl "https://whatsapp.devflowlabs.com.br/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=SEU_TOKEN&hub.challenge=999"
```
- **Esperado:** resposta com `999` (texto puro)
- **Se retornar JSON:** Verify Token não confere

### 2. Envio de mensagem real

1. Envie uma mensagem de texto do seu WhatsApp para o número da DevFlow
2. Aguarde 5–10 segundos
3. Verifique os logs na Vercel (Project → Logs ou Deployments → Functions)

**Esperado nos logs:**
- `[WHATSAPP][DEBUG] POST received`
- `[WHATSAPP][DEBUG] raw payload structure`
- `[WHATSAPP][DEBUG] normalized` com `messagesCount: 1` ou maior
- `[WHATSAPP][DEBUG] processing text message`

### 3. Resposta do bot

- O bot deve responder à mensagem enviada (conforme regras/IA configuradas)

---

## Plano B — Se o POST ainda não chegar

### B1. Conferir múltiplos apps

- Você pode ter mais de um app com WhatsApp
- Confirme qual app está vinculado ao WABA/número da DevFlow
- Meta for Developers → Apps → verificar cada app com produto WhatsApp

### B2. Conferir múltiplos WABAs

- Um Business pode ter vários WABAs
- O número pode estar em outro WABA com webhook diferente
- WhatsApp Manager → ver qual WABA contém o número

### B3. Testar com número de teste (Development)

- Em modo Development, adicione seu número como testador
- App → WhatsApp → API Setup → "Add phone number" (teste)
- Envie mensagem do número adicionado como testador

### B4. Conferir domínio no Vercel

- Vercel → Project → Settings → Domains
- `devflowlabs.com.br` deve estar atribuído ao projeto correto
- Sem redirects que quebrem o path `/api/webhook/whatsapp`

### B5. Logs do Meta (se disponível)

- Meta pode oferecer logs de entrega de webhook em algumas contas
- Procurar em: App → WhatsApp → Webhook → Logs ou Diagnostics

### B6. Contato Meta Business Support

- Se tudo estiver correto e ainda não chegar POST, abrir ticket no suporte da Meta
- Incluir: App ID, Phone Number ID, Callback URL, descrição do problema

---

## Resumo rápido

| Item | Valor |
|------|-------|
| **URL** | `https://whatsapp.devflowlabs.com.br/api/webhook/whatsapp` |
| **Verify Token** | Mesmo do `WHATSAPP_VERIFY_TOKEN` (Vercel) |
| **Campo obrigatório** | `messages` |
| **Nível** | WhatsApp Business Account |
| **Override** | Vazio ou mesma URL |
| **Phone Number ID** | `1027838990414844` |
