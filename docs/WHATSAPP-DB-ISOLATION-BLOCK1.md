# WhatsApp DB Isolation — Block 1 (Concluído)

Preparação do produto WhatsApp para uso de banco dedicado (Supabase/PostgreSQL), sem alterar o Financeiro e sem cutover de produção.

---

## 1. Arquivos alterados

| App | Arquivo | Alteração |
|-----|---------|-----------|
| whatsapp-webhook-api | `prisma/schema.prisma` | Datasource: `url = env("WHATSAPP_DATABASE_URL")`, `directUrl = env("WHATSAPP_DIRECT_URL")` |
| whatsapp-webhook-api | `.env.example` | `DATABASE_URL` → `WHATSAPP_DATABASE_URL`; adicionado `WHATSAPP_DIRECT_URL` |
| whatsapp-platform | `prisma/schema.prisma` | Datasource: `url = env("WHATSAPP_DATABASE_URL")`, `directUrl = env("WHATSAPP_DIRECT_URL")` |
| whatsapp-platform | `src/lib/supabase-server.ts` | Envs: `NEXT_PUBLIC_SUPABASE_URL` → `WHATSAPP_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` → `WHATSAPP_SUPABASE_SERVICE_ROLE_KEY` |
| whatsapp-platform | `.env.example` | Supabase e DB: uso de `WHATSAPP_*`; adicionados Prisma `WHATSAPP_DATABASE_URL` / `WHATSAPP_DIRECT_URL` |

Nenhum arquivo do Financeiro foi alterado.

---

## 2. Variáveis de ambiente (WhatsApp)

### Introduzidas / atualizadas

- **WHATSAPP_DATABASE_URL** — URL de conexão PostgreSQL (Prisma) para o projeto WhatsApp.
- **WHATSAPP_DIRECT_URL** — URL direta para migrações (Prisma), mesmo projeto.
- **WHATSAPP_SUPABASE_URL** — URL do projeto Supabase dedicado ao WhatsApp.
- **WHATSAPP_SUPABASE_SERVICE_ROLE_KEY** — Service role do projeto Supabase WhatsApp.
- **WHATSAPP_SUPABASE_ANON_KEY** — (opcional) Chave anon para cliente público; documentada no `.env.example` do platform.

### Removidas / não usadas no WhatsApp

- **DATABASE_URL** / **DIRECT_URL** — não são mais lidos pelo Prisma do WhatsApp (webhook-api nem platform).
- **NEXT_PUBLIC_SUPABASE_URL** / **SUPABASE_SERVICE_ROLE_KEY** — não são mais lidos pelo whatsapp-platform; uso apenas de `WHATSAPP_SUPABASE_*`.

---

## 3. Schema Prisma e tabelas

Ambos os apps (webhook-api e platform) referenciam o mesmo conjunto de tabelas no banco dedicado:

| Modelo Prisma | Tabela (PostgreSQL) |
|---------------|---------------------|
| Tenant | whatsapp_tenants |
| User | whatsapp_users |
| Conversation | whatsapp_conversations |
| Message | whatsapp_messages |
| FAQ | whatsapp_faqs |
| ConversationQueue | whatsapp_conversation_queue |
| AgentStatus | whatsapp_agent_status |
| MessageFeedback | whatsapp_message_feedback |

O schema está alinhado e pronto para um único banco WhatsApp.

---

## 4. Fluxo de migração (seguro)

- **Se o banco dedicado já existir com migrations aplicadas:** usar `prisma migrate deploy` em cada app (webhook-api e platform) com `WHATSAPP_DATABASE_URL` e `WHATSAPP_DIRECT_URL` apontando para esse banco.
- **Se for setup inicial controlado (ex.: dev/staging):** usar `prisma migrate dev` uma vez no app que for considerado fonte das migrations (ex.: webhook-api), depois `prisma migrate deploy` no outro e em outros ambientes.
- Não executar migrações destrutivas nem dropar bancos compartilhados neste bloco.

---

## 5. Checklist de validação local (Block 1)

- [ ] **Prisma (webhook-api):** `cd apps/whatsapp-webhook-api && pnpm prisma generate` — gera o client sem erro.
- [ ] **Prisma (platform):** `cd apps/whatsapp-platform && pnpm prisma generate` — gera o client sem erro.
- [ ] **Envs isoladas:** `.env` / `.env.local` só usam `WHATSAPP_DATABASE_URL`, `WHATSAPP_DIRECT_URL`, `WHATSAPP_SUPABASE_*` para o WhatsApp; nenhum `DATABASE_URL`/`DIRECT_URL`/Supabase genérico para o produto WhatsApp.
- [ ] **Schema aponta só para o DB WhatsApp:** em ambos os `schema.prisma`, `url` e `directUrl` usam apenas `env("WHATSAPP_DATABASE_URL")` e `env("WHATSAPP_DIRECT_URL")`.
- [ ] **Nenhum módulo WhatsApp depende do DB do Financeiro:** buscas por `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` nos apps whatsapp-webhook-api e whatsapp-platform não retornam uso ativo (apenas comentários ou docs se houver).
- [ ] **Boot local (webhook-api):** com `WHATSAPP_*` configuradas, a API sobe e o Prisma conecta (ex.: health ou primeiro request).
- [ ] **Boot local (platform):** com `WHATSAPP_*` e Supabase WhatsApp configurados, `pnpm dev` sobe; login e rotas que usam Prisma e Supabase funcionam (tenants, conversas, agentes, etc.).
- [ ] **Repositórios/serviços:** inicialização de repositórios e serviços que usam Prisma ou `getSupabaseServiceClient()` não falha no startup.

---

## 6. Notas para Block 2 (cutover)

- **Cutover de produção:** no Block 2, apontar `WHATSAPP_DATABASE_URL` e `WHATSAPP_DIRECT_URL` para o banco Supabase/PostgreSQL dedicado em produção; idem para `WHATSAPP_SUPABASE_*`.
- **Dados:** definir estratégia de migração de dados do banco antigo para o novo (se houver dados legados no shared DB); não fazer isso no Block 1.
- **CI/CD e secrets:** garantir que os pipelines e secrets usem apenas as variáveis `WHATSAPP_*` para os serviços WhatsApp; remover qualquer dependência de `DATABASE_URL`/Supabase genérico para o produto WhatsApp.
- **Financeiro:** manter sempre `DATABASE_URL`/Supabase próprios do Financeiro; nenhuma alteração no código ou config do Financeiro é necessária para o Block 1 nem para o Block 2 do WhatsApp.
