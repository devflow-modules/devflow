# Configuração de IA por tenant (gestor)

## Camadas

- **Comportamento (produto):** nome do assistente, contexto do negócio, objetivo, tom, listas (regras, restrições, handoff), respostas automáticas / fora de horário (campo texto), override opcional de motor.
- **Runtime (técnico):** modelo, temperatura, tokens máximos, prompt legado — secção **Avançado** na UI; chaves `OPENAI_*` / `ANTHROPIC_*` apenas no servidor.

## APIs

- `GET /api/ai/config` — config + presets (`manager` / `platform_admin`).
- `PUT /api/ai/config` — atualização parcial; incrementa `configVersion`, `updatedByUserId`, `AuditLog`.
- `POST /api/ai/test` — simulação com `draft` opcional; rate limit em memória; não persiste.

## Prompt

O texto de sistema efectivo vem de `buildAgentSystemPrompt` (`src/modules/ai/prompt/agentSystemPrompt.ts`). Se não houver campos estruturados, usa-se o prompt legado (`system_prompt`).

## Migração

Aplicar migrações Prisma na base WhatsApp (`WHATSAPP_DATABASE_URL` / `WHATSAPP_DIRECT_URL`).
