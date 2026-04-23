# Propriedade de leads (multi-operador)

## O que é `assignedOperatorId`

Campo opcional no modelo `Lead` (tabela `outbound_leads`) que guarda o **identificador do operador comercial responsável** pelo follow-up do lead.

- O valor referencia o utilizador no **WhatsApp Platform** — coluna `User.id` na base de dados da app WhatsApp, não a tabela de utilizadores do portal DevFlow.
- Não existe `@relation` Prisma para o `User` do outro banco: mantemos apenas um `String?` e validamos a existência, o tenant e o papel via o cliente Prisma da aplicação WhatsApp (`getWhatsappCrmPrisma` / `assertWhatsappUserIsAssignable`).

## Porque existe

- Cada lead tem um dono comercial claro, preparando o CRM para **vários operadores no mesmo tenant** (vendas B2B, SDR, closer, etc.).
- A lista e os filtros em `/admin/leads` respeitam a atribuição sem introduzir RBAC pesado: as regras mínimas são *mesmo tenant* e papel *operator*, *manager* ou *platform_admin* no WhatsApp.

## Atribuição automática (criação)

- Em **POST** `/api/admin/leads` (incluindo criação manual e **lead finder**), o backend tenta atribuir o lead ao **utilizador autenticado** na sessão CRM (cookie com JWT do WhatsApp).
- Se a sessão não existir ou o utilizador não for atribuível, o lead fica com `assignedOperatorId = null`.

## Reatribuição (PATCH)

- **PATCH** `/api/admin/leads/:id` aceita `assignedOperatorId` (string) ou `null` para desatribuir.
- Exige **sessão CRM** quando se envia um `assignedOperatorId` **não nulo**; a API valida que o utilizador escolhido é do **mesmo tenant** e com papel permitido.

## Listagem e filtros (GET)

- **GET** `/api/admin/leads` devolve, por lead, `assignedOperator` (nome/email para exibição) e `currentUserId` (identificador do operador com sessão, quando existir).
- Parâmetros de query (além de `status`, `origin`, `stale`, `followup`, etc.):
  - `scope=mine` — apenas leads cujo `assignedOperatorId` é o utilizador da sessão.
  - `scope=unassigned` — leads sem responsável.
  - `operatorId=…` — filtrar por um operador (combinável com o resto; a API valida o acesso a esse operador).
- Sincronização leve (opcional): `syncFromConversation=1` aplica, nos primeiros 50 leads com `conversationRef` e ainda sem responsável, a função `syncLeadAssigneeFromThreadIfEmpty`: se a **thread** da conversa tiver `assignedToUserId` e for um utilizador atribuível, o lead recebe o mesmo `assignedOperatorId`. **Não** mantém a conversa e o lead permanentemente em sync bidirecional; é um preenchimento útil ao carregar o painel.

## Integração com conversas WhatsApp

- `conversationRef` aponta para a thread; `assignedToUserId` nessa thread é a regra de atribuição do inbox.
- A sincronização listada acima só preenche o lead quando ainda estava vazio, evitando conflito com reatribuição manual.
- Cada ponto (conversa vs. lead) pode ser gerido de forma independente, com uma ponte **opcional** e previsível.

## Operação com vários operadores

- Vários `whatsapp_users` com papel operacional no **mesmo `tenantId`**.
- Cada operador vê o conjunto de leads alinhado com os filtros escolhidos; “**Meus leads**” restringe ao `assignedOperatorId` = eu.
- Reatribuição em tempo real altera o campo; não há lógica de concorrência especial—em produção, convém políticas de equipa (quem reatribui) por processo, não hardcoded além do tenant/role.

## Ficheiros relevantes

- `prisma/schema.prisma` — modelo `Lead` e `@@index` em `assignedOperatorId`
- `src/lib/lead-operator-service.ts` — assert, listagem de operadores, filtro, sync da thread
- `src/app/api/admin/leads/route.ts` e `src/app/api/admin/leads/[id]/route.ts`
- `src/app/admin/leads/AdminLeadsClient.tsx` — coluna “Responsável”, filtros, reatribuição, destaque visual para “Você”
