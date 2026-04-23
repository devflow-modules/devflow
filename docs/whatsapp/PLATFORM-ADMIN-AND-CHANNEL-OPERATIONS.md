# `platform_admin`, menus, inbox, CRM e split operacional

Documento de produto/engenharia: comportamento **actual** no monorepo, sem novo RBAC.  
A app WhatsApp vive em `apps/whatsapp-platform`. O CRM outbound (`/admin/leads`) vive no **portal** (`src/…`); a ponte para o inbox usa `NEXT_PUBLIC_WHATSAPP_APP_URL`.

---

## 1. Modelo de roles (fonte de verdade e enforcement)

### Definição

- Tipo: `UserRole` em `apps/whatsapp-platform/src/modules/auth/authService.ts`: `operator` | `manager` | `platform_admin`.
- **Significado:** comentário no ficheiro — `operator` atendimento; `manager` admin do tenant; `platform_admin` staff interno (acesso alargado).

### Origem do role em cada pedido

1. **Base de dados:** o campo do utilizador na tabela alvo do Prisma (`user.role`) é a referência.
2. **Resolução:** `validateAuthToken` (em `verifyToken.ts`) após assinatura JWT: carrega a sessão e o utilizador da DB; devolve `role` (e `tenantId`, etc.) **sincronizados com a DB**, não um token stale.
3. **UI (sidebar):** `SessionRoleContext` chama `GET /api/auth/verify` e usa `user.role` devolvido.

### Constantes e guards

- `ROLES_OPERATIONAL` — `operator`, `manager`, `platform_admin`.
- `ROLES_MANAGER_PLUS` — `manager`, `platform_admin`.
- `ROLES_PLATFORM_ONLY` — `["platform_admin"]` (exportada; enforcement principal está em `admin-page-guard` + `ROUTE_META.platformOnly` na UI).
- `STAFF_ROLES` = alias de `ROLES_OPERATIONAL` (até nas rotas `/api/admin/conversations*`, o nome é enganador).

`requireRole` em `verifyToken.ts` devolve 401/403 quando a role não está na lista permitida.

**Middleware** (`apps/whatsapp-platform/src/middleware.ts`): exige sessão JWT em rotas autenticadas, mas em `/admin/*` **não** aplica o role no edge. Páginas sensíveis usam `requireJwtAdminPage` / `requireAdminOrMetricsSecretPage` em `lib/admin-page-guard.ts` (e bypass por cookie de segredo para algumas rotas em produção).

**Inventário curto de enforcement por área**

| Área | Mecanismo |
|------|-----------|
| Muitas APIs de inbox | `getAuthFromRequest` + 401; **várias** não chamam `requireRole` (apenas “tem sessão?”) |
| Algumas inbox (ex. queue, team, metrics) | `requireRole(..., ROLES_OPERATIONAL)` |
| Billing, Stripe, IA config, muitas métricas tenant | `ROLES_MANAGER_PLUS` |
| Páginas `/admin/*` internas | Guards em servidor + (para conversas plataforma) `requireJwtAdminPage` no layout de `conversations` |

### Rotas / páginas sensíveis à role (resumo)

- **Navegação:** `nav-config.ts` + `lib/navigation/nav-matrix.ts` (`ROUTE_META`, `platformOnly`).
- **Superfície tenant:** `manager` e `platform_admin` vêem painel, settings, billing; `operator` é limitado no menu a inbox/automações (e conversas, etc.) sem secção “Conta e canais”.
- **Superfície plataforma:** itens e rotas com `platformOnly: true` e guards JWT `platform_admin` (e segredo onde documentado).

---

## 2. Navegação: o que cada role vê

| Secção / destino | `operator` | `manager` | `platform_admin` |
|------------------|------------|-----------|-------------------|
| Painel `/dashboard` | Não (menu) | Sim | Sim |
| Inbox | Sim | Sim | Sim |
| Conversas `/conversations` | Sim | Sim | Sim |
| Automações | Sim | Sim | Sim |
| Conta, canais, billing, definições | Não | Sim | Sim |
| Equipa, filas | Sim | Sim | Sim |
| **Ferramentas internas** (`/admin/metrics`, `billing` interno, `affiliates`, `tenants`, `agents`, `conversations`, `whatsapp`, …) | Não | Não | Sim |
| Rodapé «Distribuir próxima» | Sim | Sim | Sim |

O CRM do portal **não** é um item de menu desta app; a matriz aplica-se ao produto `apps/whatsapp-platform` apenas.

---

## 3. Consistência menu ↔ acesso

- **`platform_admin`** vê a secção interna e, com sessão e guards, **acede** a essas rotas. Excepção: fluxos de segredo (métricas/billing) em produção, conforme env.
- **Não** se exige que **toda** a rota em `ROUTE_META` tenha entrada na sidebar (ex.: `onboarding` entra muitas vezes por CTA do dashboard ou fluxo de signup).
- **Atenção:** a listagem em `/admin/conversations` (server) pode usar lógica de **tenant** via `listTenants()`; tratar como dívida de produto se a operação for multi-tenant.
- **Correção de ponte CRM:** o portal agora liga a `…/admin/conversations/{id}`. A app WA inclui `GET /admin/chat?conversationId=` → **redirect** para a rota canónica (compatibilidade).

---

## 4. Capacidades de acção (real, API)

*Nota: muitas rotas de conversa de inbox não diferenciam operator/manager no backend — o escopo é o **tenant** do JWT.*

| Acção (típico) | `operator` | `manager` | `platform_admin` |
|----------------|------------|-----------|-------------------|
| Listar/ver conversas (tenant) | Sim (se autenticado) | Sim | Sim |
| Enviar mensagem (`POST …/send`) | Sim* | Sim* | Sim* |
| Atribuir a si / outro utilizador do tenant (`POST …/assign`) | Sim* | Sim* | Sim* |
| Desatribuir | Sim* | Sim* | Sim* |
| API queue next (`/api/inbox/queue/next`, …) com `ROLES_OPERATIONAL` | Sim | Sim | Sim |
| Billing, checkout, Stripe, várias definições IA, alguns exports | Não (403) | Sim | Sim |
| Ferramentas plataforma `/api/...` que exigem `platform_admin` / guard específico | Não | Não | Sim |

\*Desde que `getAuthFromRequest` ok, thread no `tenantId`, e limites de negócio (ex. uso, canal). Não é obrigatório na API ser o `assignedToUserId` para enviar (comportamento actual).

**Propriedade (ownership):** `WaInboxThread.assignedToUserId` + estado auxiliar em `agentStatus`; ver `threadAssignmentService.ts` e `docs/.../CONVERSATION_OWNERSHIP_AND_HANDOFF` se existir no repositório.

Comparação **técnica** entre as três roles no inbox: **a mesma** a nível de API em larga medida; a diferenciação forte está em **billing** / **configuração tenant** e em **`/admin/*` interna**.

---

## 5. Inbox e chat (comportamento)

- **Quem vê conversas:** utilizadores com sessão válida no tenant (lista e detalhe filtrados por `tenantId`).
- **Quem responde:** o mesmo, sujeito a canais/usage no envio; o compositor no cliente pode bloquear se o outbound da linha não estiver ativo, não só por atribuição.
- **Quem atribui/desatribui:** qualquer utilizador autenticado do tenant, via API; a UI incentiva “assumir / libertar” com base em `isAssignedToMe`.

---

## 6. CRM (`/admin/leads` no portal) ↔ inbox (WhatsApp Platform)

- O modelo `Lead` (Prisma no repo raiz) tem `conversationRef`: **string** opcional = id da thread (inbox) no WA app.
- **Preenchimento manual:** colar o ID (UUID da thread) e “Vincular conversa” (`PATCH` no portal).
- **“Abrir conversa”** no portal resolve para `NEXT_PUBLIC_WHATSAPP_APP_URL` + `/admin/conversations/{conversationRef}` (e legacy `/admin/chat?conversationId=` **redirect** na app WA).
- O utilizador continua a precisar de **sessão válida** na app WhatsApp (possivelmente domínio/cookie diferente do portal).

---

## 7. Conversão de lead (`POST /api/admin/leads/:id/convert`)

- Garante `isAdminLeadsApiAllowed` (em prod, não basta `platform_admin` do WA — outro controle: JWT/segredo; em dev, mais permissivo).
- Define `convertedAt`, `convertedToType: "whatsapp_platform"`, `convertedToRef: null`, `status: "fechado"`, actualiza `lastContactAt`.
- **Não** cria thread, **não** preencre `conversationRef` automaticamente. O operador liga o registo comercial à conversa **à mão** se quiser rastreio pós-conversão.

**Fluxo pós-conversão:** ainda usável: lead marcado; integração com WA exige `conversationRef` se quiserem link directo.

---

## 8. UX operacional e atalhos

- **Dentro do WA app:** `platform_admin` reúne o que o `manager` tem a nível de tenant + ferramentas internas.
- **Cruzamento portal ↔ WA:** autenticação e cópia de ID continuam a ser o ponto de fricção; o link de conversa **deve** abrir a rota correcta (corrigida neste documento).
- **Falta de atalho único** entre leads e tenants no código: em grande parte **processo** (dois deploys, duas contas, dois logins se aplicável).

---

## 9. Modelo de duas contas (recomendado)

| | Conta A (oficial / fecho) | Conta B (prospecção) |
|---|---------------------------|----------------------|
| **Número / WABA** | Canónico, cliente, qualificação | Outbound, cold, volume |
| **Roles** | `platform_admin` onde a equipa interna precisa de `/admin/*` | `operator` / `manager` sem `platform_admin` se possível |
| **Código** | A separação é em **tenant + utilizadores**; o produto **não** oferece um “modo campanha” em segundo role |

A role `platform_admin` é **adequada** para a **conta oficial/operacional interna** no produto WA; a separação com a prospecção é em **conta/tenant/linha**, não outra categoria de role obrigatória.

---

## 10. Melhorias mínimas aplicadas (referência)

- Menu WA: `Conversas` (`/conversations`) no principal; rodapé “Distribuir próxima” alinhado a `operator` + `manager` + `platform_admin` (`isTenantManager`); ícone no rail.
- `admin/(shell)/conversations/layout.tsx`: `requireJwtAdminPage` (alinhado a `platformOnly`).
- **Ponte CRM:** `AdminLeadsClient` com URL canónica `/admin/conversations/{id}`; página de **redirect** `/admin/chat` no WA app para query strings antigas.

Nenhum novo sistema de permissões nem refactor transversal.

---

## 11. Ficheiros de referência (principais)

- `apps/whatsapp-platform/src/modules/auth/authService.ts`, `verifyToken.ts`, `getAuthFromRequest` / `requireRole`
- `apps/whatsapp-platform/src/lib/admin-page-guard.ts`, `src/middleware.ts`
- `apps/whatsapp-platform/src/lib/navigation/nav-matrix.ts`, `src/components/shell/nav-config.ts`, `AppSidebar.tsx`
- `apps/whatsapp-platform/src/modules/inbox/threadAssignmentService.ts`, rotas em `src/app/api/inbox/`
- Portal: `src/app/admin/leads/AdminLeadsClient.tsx`, `src/app/api/admin/leads/**/*.ts`, `prisma/schema.prisma` → `Lead`

---

## 12. Melhorias futuras (opcionais)

- Expor na UI de `/admin/conversations` um **selector** de tenant fiável em vez de depender de lógica global de `listTenants()`.
- Opcional: reforçar `requireRole(ROLES_OPERATIONAL)` em todas as rotas de inbox para consistência explícita.
- Opcional: política de negócio no envio só com assignee (se desejado).
- Opcional: após `convert`, preencher `convertedToRef` ou vincular `conversationRef` com body JSON.
