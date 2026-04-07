# Setup WhatsApp Cloud API — DevFlow Labs

Guia para configurar o robô de atendimento no WhatsApp antes e depois do número estar ativo.

> ⚠️ **Arquitetura:** O webhook neste repositório é **PoC/protótipo**. Para produção, use o **devflow-whatsapp-platform** como backend oficial. Ver [ARQUITETURA-DELEGACAO.md](./ARQUITETURA-DELEGACAO.md).

---

## Pré-requisitos

- Conta Facebook
- Número de telefone (novo chip ou existente) para WhatsApp Business

---

## 1️⃣ Criar conta no Meta Developers

1. Acesse [Meta for Developers](https://developers.facebook.com)
2. Login com Facebook
3. **My Apps** → **Create App**
4. Tipo: **Business**
5. Nome sugerido: **DevFlow WhatsApp Platform**

---

## 2️⃣ Adicionar o produto WhatsApp

1. Dentro do app: **Add Product**
2. **WhatsApp** → **Set Up**
3. Cria automaticamente:
   - WhatsApp Business Account
   - Ambiente da WhatsApp Cloud API

Você verá (mesmo sem número):
- **Phone Number ID** (temporário ou do API tester)
- **API tester** para testes

---

## 3️⃣ Configurar variáveis de ambiente

### No backend (Vercel / produção)

| Variável | Onde pegar | Exemplo |
|----------|------------|---------|
| `WHATSAPP_ACCESS_TOKEN` | Meta Developers → WhatsApp → API Setup → Token | `EAAx...` |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta Developers → WhatsApp → Phone numbers | `123456789` |
| `WHATSAPP_VERIFY_TOKEN` | Você escolhe (string qualquer) | `devflow_verify_123` |
| `WHATSAPP_DEMO_MODE` | Opcional: `true` para mensagem demo especial | `false` |

### No frontend (já existente)

| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Número com DDI (ex: `5513999999999`) |
| `NEXT_PUBLIC_WHATSAPP_DEFAULT_TEXT` | Mensagem ao clicar no botão |

---

## 4️⃣ Configurar o webhook

### URL do webhook

```
https://whatsapp.devflowlabs.com.br/api/webhook/whatsapp
```

(Se usar API separada: `https://api.devflowlabs.com.br/webhook/whatsapp`)

### No Meta Developers

1. **WhatsApp** → **Configuration**
2. **Webhook** → **Edit**
3. **Callback URL:** `https://whatsapp.devflowlabs.com.br/api/webhook/whatsapp`
4. **Verify Token:** o mesmo valor de `WHATSAPP_VERIFY_TOKEN`
5. Clique em **Verify and Save**
6. Em **Webhook fields**, marque: **messages**

### Teste com ngrok (desenvolvimento local)

```bash
ngrok http 3000
# App whatsapp-platform em dev (porta típica 3000). Use: https://xxxx.ngrok.io/api/webhook/whatsapp
```

---

## 5️⃣ Conectar o número (quando o chip estiver ativo)

1. Meta Developers → **WhatsApp** → **Phone numbers**
2. **Add phone number** (ou usar o do API tester para testes)
3. Validar o número via SMS/ligação
4. Copiar o **Phone Number ID** gerado
5. Atualizar `WHATSAPP_PHONE_NUMBER_ID` na Vercel
6. Novo deploy

---

## 6️⃣ Estrutura do módulo WhatsApp

```
src/modules/whatsapp/
├── messages.ts       # Mensagens padrão (boas-vindas, menu, etc.)
├── messageParser.ts  # Parser de intenção (1, 2, 3, menu, etc.)
├── sendMessage.ts    # Envio via WhatsApp Cloud API
├── webhookHandler.ts # Lógica de resposta
└── index.ts          # Exports
```

### Fluxo do robô

```
Mensagem recebida
       ↓
Parse (menu, 1, 2, 3, oi, etc.)
       ↓
Resposta correspondente
```

### Mensagens configuradas

- **Boas-vindas** — Oi, olá, bom dia, etc.
- **Menu** — menu, ajuda, 0
- **Opção 1** — Como funciona a automação
- **Opção 2** — Link da demo
- **Opção 3** — Falar com especialista
- **Modo demo** — Se `WHATSAPP_DEMO_MODE=true`, mensagem "demo" especial
- **Fallback** — Não entendi, envie "menu"

---

## 7️⃣ Checklist pós-número ativo

- [ ] Número validado no Meta Developers
- [ ] `WHATSAPP_PHONE_NUMBER_ID` atualizado
- [ ] `WHATSAPP_ACCESS_TOKEN` configurado (token permanente)
- [ ] `WHATSAPP_VERIFY_TOKEN` igual no Meta e no .env
- [ ] Deploy novo na Vercel
- [ ] Testar enviando mensagem para o número

---

## 8️⃣ Links úteis

- [Meta for Developers](https://developers.facebook.com)
- [WhatsApp Cloud API — Webhooks](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks)
- [WhatsApp Cloud API — Send Messages](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages)
