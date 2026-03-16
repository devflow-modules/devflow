# Banco de dados — WhatsApp Platform

Este produto deve usar **um projeto Supabase próprio**, separado de outros apps (financeiro, etc.).

## Uso de pacotes

- Clientes: `@devflow/supabase-utils` (`createServerClient`, `createBrowserClient`).
- Não misturar schemas com outros produtos.

## Tabelas (a criar no Supabase do produto)

- `tenants` — configuração por tenant (phone_number_id, token, settings).
- `conversations` — ciclo de vida, atribuição, estado.
- `messages` — mensagens ligadas a conversas e metadados.
- `agents` — agentes e vínculo com filas.
- `queues` — filas e prioridades.
- `events` — eventos de negócio para auditoria.
- `webhook_logs` — log de payloads recebidos (opcional, para debug).

Migrações e tipos ficam no app; acesso via repositórios em `modules/*`.
