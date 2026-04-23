# Isolamento de dados, origens de lead e multi-operador

## 1. Isolamento por tenant (WhatsApp Platform)

- **Regra:** praticamente todo o dado operacional (threads, mensagens, filas, agentes, automações) é filtrado por `tenantId` no Prisma / serviços. O JWT de sessão carrega o `tenantId` do utilizador; as APIs usam `getAuthFromRequest` e escopam a esse tenant.
- **DevFlow Sales vs clientes:** desde que utilizadores comerciais **só** tenham contas no tenant **DevFlow Sales** (e números WABA ligados a esse `tenantId`), não há mistura com dados de clientes — são linhas distintas na mesma base.
- **Correcção relevante:** a listagem de **Conversas (plataforma)** em `/admin/conversations` deixou de usar o primeiro tenant vindo de `listTenants()` (Supabase) e passa a listar **apenas** conversas do `tenantId` da **sessão JWT** do `platform_admin`. Isto evita vazamento visual entre tenant interno e qualquer outro.

**`platform_admin`:** continua a ser um papel **global** (Ferramentas internas). Quando abre o inbox no contexto de um login, o `tenantId` do token é o da **conta** a que o utilizador pertence (ex.: DevFlow Sales). A administração multi-tenant global faz-se noutros ecrãs (ex.: `/admin/tenants`), não pela lista de conversas por “primeiro tenant do Supabase”.

## 2. Origens de lead (portal — CRM)

Valores canónicos (`src/lib/outbound-lead-origins.ts`):

| Valor | Uso sugerido |
|--------|----------------|
| `outbound_whatsapp` | Prospecção ativa no WhatsApp |
| `lead_finder_google_maps` | Leads do fluxo lead-finder (Maps) |
| `inbound_site` | Formulário / site |
| `demo` | Demos, pedidos de teste |

- **POST** `/api/admin/leads`: só aceita `origin` dentro desta lista (ou omissão / `null`). Texto livre é rejeitado.
- **PATCH** `/api/admin/leads/:id`: aceita o catálogo ou textos **legados** (1–120) para leads antigos, até migração completa.
- A UI de `/admin/leads` usa `<select>` alinhado ao catálogo, com opção de legado quando a linha já tinha outro `origin`.

## 3. Vários operadores no inbox

- **Propriedade da conversa:** `WaInboxThread.assignedToUserId` (ver `threadAssignmentService.ts` no WhatsApp Platform).
- **Cada operador** do mesmo tenant vê as conversas do tenant; pode atribuir a si ou a outro utilizador **do mesmo tenant** (API de assign com validação de utilizador no tenant).
- **Interferência:** não partilham a mesma “sessão de edição” — conflitos são mitigados por *realtime* / re-fetch; regra de negócio fina (ex.: só o assignee envia) ainda depende de política interna, não de RBAC adicional.
- **Escalabilidade:** múltiplos `operator` com o mesmo `tenantId` (ex.: toda a equipa de SDR no DevFlow Sales) é o modelo suportado; use **filas e etiquetas** para organizar.

## 4. Referência de código

- `apps/whatsapp-platform/src/app/admin/(shell)/conversations/page.tsx` — isolamento por `tenantId` da sessão.
- `src/lib/outbound-lead-origins.ts` — catálogo e validação.
- `src/app/api/admin/leads/route.ts`, `src/app/api/admin/leads/[id]/route.ts` — regras POST/PATCH.
- `docs/whatsapp/DEVFLOW-SALES-TENANT.md` — contexto do tenant comercial interno.
