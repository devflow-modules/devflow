# Sprint OpenAI — Camada de produção para WhatsApp

## 1. Plano de arquivos

### Novos
| Arquivo | Descrição |
|---------|-----------|
| `src/modules/ai/openai/client.ts` | Cliente OpenAI: fetch, timeout, tratamento 401/429/5xx |
| `src/modules/ai/openai/structuredOutput.ts` | Schema JSON estruturado (reply, intent, confidence, needs_human) |
| `src/modules/ai/openai/prompts.ts` | System prompts profissionais por cenário |
| `src/modules/ai/openai/costEstimator.ts` | Estimativa de custo por mensagem (tokens × preço) |
| `src/modules/ai/openai/config.ts` | Config centralizada (envs, defaults, validação) |
| `src/modules/ai/openai/index.ts` | Barrel export |
| `src/modules/ai/__tests__/openai/client.test.ts` | Testes do cliente (mock fetch) |

### Modificados
| Arquivo | Alteração |
|---------|-----------|
| `src/modules/ai/openaiReplyService.ts` | Refatorar para usar `openai/client`, structured output, contexto |
| `src/modules/ai/aiAutomationService.ts` | Usar nova camada, config por tenant, observabilidade |
| `src/modules/ai/aiProvider.ts` | Manter para fluxo full; openaiReplyService fica independente |
| `prisma/schema.prisma` | Migration: `ai_model` em AiAgentConfig (opcional) |
| `.env.example` | Documentar `OPENAI_*` (server-side only) |

### Documentação
| Arquivo | Descrição |
|---------|-----------|
| `docs/whatsapp/OPENAI_ENV_AND_FLOW.md` | Envs e fluxo de decisão |

---

## 2. Sequência de implementação

| Etapa | Descrição | Dependências |
|-------|-----------|--------------|
| **E1** | Config + segurança (envs server-side) | — |
| **E2** | Cliente OpenAI (client.ts): timeout, 401/429/5xx | E1 |
| **E3** | Prompts profissionais + structured output | E2 |
| **E4** | Contexto (últimas N mensagens, limite tokens) | E3 |
| **E5** | Consolidar openaiReplyService | E2–E4 |
| **E6** | Fallback garantido (try/catch, nunca bloquear) | E5 |
| **E7** | Uso por tenant + costEstimator | E5 |
| **E8** | Config por tenant (AiAgentConfig) | E7 |
| **E9** | Observabilidade (logs request, response, latência, fallback) | E5–E8 |
| **E10** | Testes (mocks, sucesso, timeout, 401, 429, vazio, fallback) | E2, E5 |

---

## 3. Patch por etapa

### E1 — Config e segurança

**`openai/config.ts`**
```typescript
// Configuração centralizada. Chave NUNCA no client.
export const OPENAI_CONFIG = {
  get apiKey(): string | undefined {
    if (typeof window !== "undefined") return undefined;
    return process.env.OPENAI_API_KEY?.trim() || undefined;
  },
  model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  maxTokens: 512,
  temperature: 0.7,
  timeoutMs: 10_000,
} as const;
export function isOpenAiConfigured(): boolean {
  return !!OPENAI_CONFIG.apiKey;
}
```

**`.env.example`**
```env
# OpenAI — SERVER-SIDE ONLY (nunca expor ao client)
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OPENAI_TIMEOUT_MS=10000
```

---

### E2 — Cliente OpenAI

**`openai/client.ts`**
- `callChatCompletion(messages, options)` com AbortController
- Tratamento: 401 (auth), 429 (quota), 5xx (retry opcional)
- Timeout configurável
- Retorno: `{ text, tokensUsed, durationMs, error?, statusCode? }`

---

### E3 — Prompts e structured output

**`openai/prompts.ts`**
- `DEFAULT_SYSTEM_PROMPT` — atendimento WhatsApp
- `buildSystemPrompt(tenantPrompt?: string)` — merge com prompt por tenant

**`openai/structuredOutput.ts`**
- Schema: `{ reply, intent, confidence, needs_human }`
- Uso de `response_format: { type: "json_object" }` (OpenAI)
- Parse seguro com fallback para reply texto

---

### E4 — Contexto

- Últimas 10 mensagens da thread (já existe em aiAutomationService)
- Limite: ~2k tokens de contexto (estimar ~4 chars/token)
- Incluir no array `messages` antes da mensagem atual

---

### E5 — Consolidar openaiReplyService

- Usar `openai/client`, `openai/structuredOutput`, `openai/prompts`
- Interface única: `generateReply(input)` → `{ reply, intent, confidence, needsHuman, tokensUsed, durationMs, error? }`
- Suportar contexto opcional

---

### E6 — Fallback garantido

- `openaiReplyService.generateReply`: nunca throw; retorna `{ error }` em falha
- `aiAutomationService`: em `error`, chama `processLegacyInboundAutoReply` (já existe)
- Garantir que webhookHandler sempre envia resposta

---

### E7 — Uso e custo

- `trackUsage(tenantId, UsageEventType.AI_RESPONSE, { metadata: { tokensUsed } })` — já existe
- `costEstimator.ts`: `estimateCost(tokensIn, tokensOut)` → USD aproximado (gpt-4o-mini)
- Log de custo estimado por request

---

### E8 — Config por tenant

- AiAgentConfig já tem: `systemPrompt`, `maxTokens`, `temperature`
- Migration opcional: `ai_model` (TEXT, default "gpt-4o-mini")
- Fallback para env quando não configurado no tenant

---

### E9 — Observabilidade

- Log antes do request: `[OPENAI] request tenant=... model=...`
- Log após: `[OPENAI] response tenant=... durationMs=... tokens=... fallback=false`
- Log em fallback: `[OPENAI] fallback tenant=... reason=...`

---

### E10 — Testes

- Mock `global.fetch` para OpenAI
- Casos: sucesso, timeout, 401, 429, 5xx, resposta vazia
- Verificar fallback para legacy

---

## 4. Checklist final de rollout

- [x] **Segurança**: OPENAI_API_KEY apenas em server env; nunca em `NEXT_PUBLIC_*`
- [x] **Config**: Envs documentados em `.env.example` e `OPENAI_ENV_AND_FLOW.md`
- [x] **Cliente**: Timeout, 401/429/5xx tratados (openai/client.ts)
- [x] **Structured output**: reply, intent, confidence, needs_human (openai/structuredOutput.ts)
- [x] **Contexto**: Últimas 10 mensagens incluídas no standalone
- [x] **Fallback**: Em qualquer falha OpenAI → legacy path; reply sempre enviado
- [x] **Uso**: trackUsage por tenant; costEstimator para log
- [x] **Tenant**: systemPrompt, maxTokens, temperature via AiAgentConfig
- [x] **Logs**: [OPENAI] request, response, fallback
- [x] **Testes**: Mocks, sucesso, 401, 429, vazio (openai/client.test.ts)
- [ ] **Deploy**: Variáveis em Vercel; validar webhook e legacy em produção
