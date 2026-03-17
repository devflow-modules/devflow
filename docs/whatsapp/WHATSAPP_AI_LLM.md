# IA com LLM — WhatsApp Platform

Uso de modelos de linguagem (OpenAI/Anthropic) no produto WhatsApp Platform, com fallback para respostas por regras.

---

## 1. Configuração

- **@devflow/ai-core** exporta `createLlmProvider()` e `isLlmConfigured()`.
- Provedor escolhido por env: `OPENAI_API_KEY` (OpenAI) ou `ANTHROPIC_API_KEY` (Anthropic).
- No app WhatsApp, definir `WHATSAPP_ENABLE_LLM=true` para tentar LLM; caso contrário só regras.

## 2. Variáveis de ambiente (WhatsApp)

| Variável | Descrição |
|----------|-----------|
| `WHATSAPP_ENABLE_LLM` | `true` para habilitar respostas via LLM (com fallback para regras em erro). |
| `OPENAI_API_KEY` | Chave da API OpenAI (usa modelo em `OPENAI_MODEL`). |
| `OPENAI_MODEL` | Opcional; padrão `gpt-4o-mini`. |
| `ANTHROPIC_API_KEY` | Chave da API Anthropic (usa modelo em `ANTHROPIC_MODEL`). |
| `ANTHROPIC_MODEL` | Opcional; padrão `claude-3-5-haiku-20241022`. |

## 3. Fluxo

1. Mensagem recebida → se `WHATSAPP_ENABLE_LLM=true` e `isLlmConfigured()` → chama `generateAiReply` com `createLlmProvider()`.
2. Sucesso → envia resposta e registra evento `whatsapp.ai_response_generated_llm`.
3. Erro (rede, quota, etc.) → usa `getReplyForMessage` (regras) e registra `whatsapp.ai_fallback_used`.
4. Se LLM não estiver habilitado ou configurado → só regras (comportamento anterior).

## 4. Eventos analytics

- `whatsapp.ai_response_generated_llm` — resposta gerada pelo LLM.
- `whatsapp.ai_fallback_used` — fallback para regras após falha do LLM.

Visíveis em `/admin/metrics` (Métricas do produto).
