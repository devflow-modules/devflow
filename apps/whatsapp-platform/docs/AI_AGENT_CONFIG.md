# Configuração de IA por tenant (gestor)

## Camadas

- **Comportamento (produto):** nome do assistente, contexto do negócio, objetivo, tom, listas (regras, restrições, handoff), playbook por fase, respostas automáticas / fora de horário (campo texto), override opcional de motor.
- **Runtime (técnico):** modelo, temperatura, tokens máximos — secção **Avançado** na UI; chaves `OPENAI_*` / `ANTHROPIC_*` apenas no servidor. Não existe prompt em texto livre na `AiAgentConfig`; o sistema é montado só a partir dos campos estruturados.

## APIs

- `GET /api/ai/config` — config + presets (`manager` / `platform_admin`).
- `PUT /api/ai/config` — atualização parcial; incrementa `configVersion`, `updatedByUserId`, `AuditLog`.
- `POST /api/ai/test` — simulação com `draft` opcional; rate limit em memória; não persiste.

## Prompt

O texto de sistema efectivo vem de `buildAgentSystemPrompt` (`src/modules/ai/prompt/agentSystemPrompt.ts`), combinando identidade, tom, contexto, objetivo, listas e funil. Com a IA ativada, a API exige pelo menos um desses campos preenchidos. Se, por inconsistência de dados, não houver campos estruturados, o runtime usa um mínimo baseado só no tom (rede de segurança — não exposto na UI).

## Migração

Aplicar migrações Prisma na base WhatsApp (`WHATSAPP_DATABASE_URL` / `WHATSAPP_DIRECT_URL`).
