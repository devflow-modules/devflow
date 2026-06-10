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
3. **Thread**: conversas com status **CLOSED** na inbox não recebem resposta automática da IA (fila humana). Status **PENDING** (handoff `needs_human`) também bloqueia novas respostas automáticas.

## Handoff automático mínimo (P0-04)

Quando a IA/regra detecta necessidade de humano:

| Gatilho | Serviço |
|---------|---------|
| LLM `needs_human: true` | `aiAutomationService` → `applyNeedsHumanHandoff` |
| `handoffTriggers` na config | `evaluateAutomationRules` |
| Keywords sensíveis no guard | `shouldAiReply` → handoff |

**Persistência:** `WaInboxThread.status = PENDING`, `priority = HIGH`, tag `needs_human`, audit `handoff_requested`.  
**Assign opcional:** `WHATSAPP_HANDOFF_DEFAULT_USER_ID` ou primeiro `manager`/`platform_admin` do tenant.  
**Fila opcional:** `WHATSAPP_HANDOFF_DEFAULT_QUEUE_SLUG` ou slugs `human`/`geral`/etc.

Código: `src/modules/inbox/needsHumanHandoffService.ts`.

## Safe mode piloto (P0-07)

Política **assistiva e controlada** para piloto real — implementada em `aiPilotDecision.ts` + `aiGuard.ts` + `aiAutomationService.ts`.

| Config / env | Default piloto | Efeito |
|--------------|----------------|--------|
| `WHATSAPP_AI_SAFE_MODE` | `1` (activo) | Temas comerciais/críticos e intents sensíveis → handoff |
| `WHATSAPP_AI_MIN_CONFIDENCE` | `0.65` | Structured output abaixo do limiar → handoff |
| `AiAgentConfig.fallbackToHuman` | `true` | Erro LLM / resposta vazia → handoff (não lança excepção) |

### Decisão explícita (`AiDecision`)

Cada inbound passa por:

1. **Guard** (`shouldAiReply`) — bloqueia vazio, IA off, thread `PENDING`/`CLOSED`, humano atribuído, keywords sensíveis.
2. **Regras** (`evaluateAutomationRules`) — `handoffTriggers`, saudação curta.
3. **Safe pre-LLM** — preço/orçamento/reembolso/jurídico/etc. em safe mode → handoff.
4. **LLM structured** — `needs_human`, confiança, intent `suporte`, parse incerto, erro → handoff via `commitAiDecision`.
5. **Auto-reply** — só quando decisão `action: auto_reply`.

Motivos auditados em `AiMessageLog.decisionReason` (sem corpo integral da mensagem): ex. `low_confidence|intent:informação|conf:0.42`, `pilot_safe_topic:orçamento`, `llm_error`.

### Handoff vs no-reply

| Situação | Acção |
|----------|--------|
| Keyword sensível / safe topic / LLM incerto | **Handoff** (`applyNeedsHumanHandoff`) |
| Thread já `PENDING` | **no_reply** (sem novo handoff) |
| IA desligada / quota | **no_reply** |

Desactivar safe mode (apenas ambientes controlados): `WHATSAPP_AI_SAFE_MODE=0`.

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
