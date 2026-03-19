# IA de atendimento automático (multi-tenant)

## Visão

Camada opcional por tenant que responde mensagens **inbound de texto** no WhatsApp usando LLM (OpenAI ou Claude), com **timeout (~5s)**, **logs** e **fallback para humano** quando a IA falha ou está desligada.

## Arquitetura

| Camada | Responsabilidade |
|--------|------------------|
| `src/modules/ai/aiProvider.ts` | Chamadas HTTP ao provedor com `AbortSignal` (timeout padrão 5s), extração de tokens quando disponível. |
| `src/modules/ai/aiService.ts` | Monta system prompt (tenant + tom + regras WhatsApp), últimas mensagens do thread, chama o provider. |
| `src/modules/ai/aiAutomationService.ts` | Regras de negócio: config por tenant, thread **OPEN**, dedupe por `waMessageId`, envio via `sendWebhookAutoReply`, `AiMessageLog`. |
| Webhook `POST /api/webhooks/whatsapp` | Após persistir inbox: se IA pronta → `void runTenantAiAutoReply(...)` (não bloqueia 200); senão → fluxo legado (regras / `WHATSAPP_ENABLE_LLM`). |

Chaves **OPENAI_API_KEY** / **ANTHROPIC_API_KEY** ficam só no servidor (env do deploy do webhook).

## Modelos (Prisma)

- **`AiAgentConfig`** (1 por tenant): `enabled`, `systemPrompt`, `tone`, `maxTokens`, `temperature`, `fallbackToHuman`.
- **`AiMessageLog`**: `promptUsed`, `responseGenerated`, `tokensUsed`, `durationMs`, `errorMessage`, vínculos opcionais com thread e IDs WhatsApp.

Migration: `prisma/migrations/20260317120000_ai_agent_config_and_logs/`.

## Fluxo no webhook

1. Normalizar payload, resolver tenant, persistir log (Supabase) e **Wa Inbox** (Prisma).
2. Para cada mensagem **texto** com corpo não vazio:
   - `prepareInboundConversation` (Supabase + mensagem inbound).
   - `checkTenantAiAutomationReady(tenantId, from)`:
     - Tenant real (não `env`).
     - `AiAgentConfig.enabled`.
     - Thread Wa Inbox **OPEN** para o número.
     - `Tenant.aiDriver` = `openAI` ou `claude` + chave correspondente no env.
     - `systemPrompt` não vazio.
   - Se **pronto** → dispara IA em background.
   - Senão → `processLegacyInboundAutoReply` (comportamento anterior).

## Configuração por tenant

1. **Motor**: em `/settings`, escolher **OpenAI** ou **Claude** (`aiDriver`).
2. **Prompt e toggle**: `/settings/ai` — ativar IA, editar prompt, tom, tokens e temperature.
3. **Thread**: conversas com status **CLOSED** na inbox não recebem resposta automática da IA (fila humana).

## Exemplos de system prompt

- *Suporte*: “Você é o suporte da Empresa X. Esclareça dúvidas sobre pedidos, prazos e devolução. Se não souber, diga que um humano vai responder.”
- *Vendas*: “Você é consultor comercial. Apresente benefícios, pergunte necessidade, sugira próximo passo (demo ou orçamento).”
- *FAQ curta*: “Responda só com base no catálogo: [lista]. Fora disso, peça para aguardar atendente.”

## Limitações

- Só **mensagens de texto** inbound disparam IA (mídia não gera resposta automática por IA).
- **Tenant `env`** (fallback por variáveis) não usa IA multi-tenant.
- Provedor e modelo vêm do **env global**; por tenant só se escolhe OpenAI vs Claude via `aiDriver`.
- Webhook retorna 200 rápido; falhas na IA são tratadas em background (log + sem envio).
- Escalabilidade futura: fila (BullMQ / SQS) para `runTenantAiAutoReply`.

## API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/ai/config` | Lê ou cria config padrão (JWT tenant). |
| POST | `/api/ai/config` | Atualiza campos (body JSON parcial). |

## Checklist sprint

- [x] Models + migration
- [x] `aiProvider` + `aiService` + automação
- [x] Webhook assíncrono + legado quando IA off
- [x] Envio via `sendWebhookAutoReply`
- [x] GET/POST config
- [x] UI `/settings/ai`
- [x] `AiMessageLog`
- [x] Testes Vitest
- [x] Esta documentação
