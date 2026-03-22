# OpenAI — Envs e fluxo de decisão

## Variáveis de ambiente (server-side only)

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `OPENAI_API_KEY` | Chave da API OpenAI | — |
| `OPENAI_MODEL` | Modelo (ex: gpt-4o-mini) | gpt-4o-mini |
| `OPENAI_TIMEOUT_MS` | Timeout em ms | 10000 |

**Segurança:** Nunca usar `NEXT_PUBLIC_` para chaves. Apenas server-side.

---

## Fluxo de decisão

1. Mensagem recebida no webhook
2. `checkTenantAiAutomationReady`:
   - Se `OPENAI_API_KEY` existe → `ready: true` (modo standalone)
   - Senão: verifica config do tenant (enabled, thread, driver, etc.)
3. Se ready:
   - `enforceUsageOrThrow` (limites de billing)
   - `generateReply` (openaiReplyService)
   - Em falha → fallback para legacy (regras)
4. Se não ready → legacy path

---

## Config por tenant (AiAgentConfig)

- `systemPrompt` — prompt customizado
- `maxTokens` — limite de tokens (64–4096)
- `temperature` — criatividade (0–2)
- `enabled` — liga/desliga IA

---

## Tratamento de erros

| Código | Ação |
|--------|------|
| 401 | Fallback legacy |
| 429 | Fallback legacy (quota) |
| 5xx | Fallback legacy |
| Timeout | Fallback legacy |

Nunca bloquear o reply. Sempre enviar resposta (IA ou legacy).
