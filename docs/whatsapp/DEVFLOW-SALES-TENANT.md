# DevFlow Sales — tenant interno no WhatsApp Platform

## 1. O que é e porquê

**DevFlow Sales** é o **workspace comercial interno** da DevFlow no mesmo produto **multi-tenant** que os clientes usam. Permite correr **prospecção, qualificação e fecho** no inbox/conversas/filas **sem** misturar dados com tenants de clientes, desde que a equipa use **contas e números distintos** (processo) e, opcionalmente, o marcador de base de dados `isInternal` no tenant.

Não introduz outro auth nem outro product — só um **tenant** (como qualquer outro) com `name = "DevFlow Sales"` e `isInternal = true` após a migração e o script de provisão.

## 2. Modelo de dados (existente)

- **Tenant** (`whatsapp_tenants`): isolamento de canais, inbox, billing, regras, filas, etc.
- **User** (`whatsapp_users`): um `tenantId` por utilizador, `role` = `operator` | `manager` | `platform_admin` (string na mesma tabela; não há tabela de membership separada).
- **platform_admin** vive na **mesma tabela** que os outros, mas a UI restringe **Ferramentas internas** (`/admin/*` de plataforma) a essa role; o resto do comportamento (inbox, atribuição) é o mesmo de qualquer outro user no **seu** tenant.

## 3. Roles e responsabilidade

| Papel | Uso no DevFlow Sales | Notas |
|--------|----------------------|--------|
| **platform_admin** (opcional) | Pessoal que **também** administra a plataforma (métricas internas, tenants, provisão). | Raramente precisa ser o SDR: é **global**, não “só comercial”. Preferir comercial em **manager** / **operator**. |
| **manager** | Líder de vendas / closer: painel, follow-up, billing do tenant, definições, vê filas, pode assumir conversas qualificadas, fechar. | Mesmo menu que manager de cliente. |
| **operator** | Prospecção: inbox, conversas, automações (visíveis), filas, **sem** secção “Conta e canais” (billing/settings). | Adequado a SDR. |

A separação **outbound vs closer** assenta em **processo** (filas, assign, notas) e, se desejado, em **fila/etiqueta**; o código de roles já diferencia operador (sem billing) e manager (completo no tenant).

## 4. Inserção e provisão

- **Migração Prisma:** `is_internal` em `whatsapp_tenants` (default `false`). Clientes e tenants antigos inalterados.
- **Script:** a partir de `apps/whatsapp-platform`:

  ```bash
  pnpm db:migrate
  pnpm ops:provision-devflow-sales
  ```

  Só cria/actualiza o tenant **DevFlow Sales**, subscrição FREE, regras padrão de automação, e (opcionalmente) utilizadores:

  ```bash
  pnpm ops:provision-devflow-sales -- \
    --manager-email "gustavo@exemplo.com" --manager-password "********" \
    --operator-email "sdr@exemplo.com" --operator-password "********"
  ```

- **Ligar número WABA** ao tenant como em qualquer cliente: fluxo de WhatsApp / Meta no mesmo tenant. **Conta e número** devem ser **exclusivos** de comercial, não a linha “oficial” de suporte se quiserem isolar ainda mais por processo.

- **Criação manual (alternativa):** criar tenant (SQL ou painel) com `name` e `isInternal`, depois `User` com `role` apropriado, ou sign-up + ajuste de `tenantId` (menos comum). O script acima evita enganos.

## 5. Navegação e “home”

Comportamento **já alinhado** a este modelo, **sem** redesign:

- **operator** → início lógico `/inbox`; vê o essencial e conversas, sem ecrãs de conta.
- **manager** → início lógico `/dashboard/ai` (como outros tenants).

Nada específico “só para DevFlow Sales” é obrigatório na nav; a badge **Interno** na listagem de tenants em `/admin/tenants` ajuda a distingui-los (operador `platform_admin`).

Ver também: [DATA-ISOLATION-LEADS-AND-OPERATORS.md](./DATA-ISOLATION-LEADS-AND-OPERATORS.md) (isolamento, origens de lead, multi-operador).

## 6. CRM (portal) ↔ inbox (WhatsApp Platform)

Fluxo operacional recomendado (processo, não módulo novo no WA):

1. **Lead** criado no portal: `/admin/leads` (e, se usado, `/admin/lead-finder`).
2. `origin` sugerido: `devflow_sales` (ou rótulo da campanha) — filtrável no CRM.
3. SDR (operator) faz outbound (wa.me / link do CRM); quando houver **thread** no **tenant DevFlow Sales**, colar o **ID da conversa** no field **conversation ref** e **Vincular conversa**.
4. “Abrir conversa” leva à app WA em `/admin/conversations/{id}` (sessão nesse tenant) — ver `LEADS-CRM.md` e `PLATFORM-ADMIN-AND-CHANNEL-OPERATIONS.md`.
5. Closer (manager) supervisiona no painel / entra em conversa atribuída; **atribuição** via inbox existente.
6. **Conversão comercial** no portal: `POST /api/admin/leads/:id/convert` (marca o lead, **não** cria automático vínculo à thread — manter `conversationRef` se quiser rastreio pós-fecho).

Isto isola comercial (tenant interno) de clientes; o CRM continua a ser **camada** no portal, não o inbox em si.

## 7. Escalabilidade (múltiplos operadores SDR)

- Adicionar mais **user**s com `role: operator` no **mesmo** `tenantId` (DevFlow Sales) — a mesma inbox e filas.
- Afinar com **filas** (`/queues`) e, se fizer sentido, **atribuição** por regra; não exige colunas novas além de `isInternal` no tenant.

## 8. Diferenças em relação a “customer tenant”

| | Cliente | DevFlow Sales |
|---|---------|---------------|
| Dados e isolamento | `tenantId` | Idem (mais atenção a não misturar números) |
| Plano e billing | Contrato comercial | Pode manter-se FREE/operacional interno |
| Marcador | `isInternal: false` (padrão) | `isInternal: true` |
| Objetivo | Uso pago/implantado | Comercial interno |

## 9. O que ainda depende de processo

- Controlo de **quem** fala com quem (qual número / qual WABA) — fora de uma flag na BD.
- Sessões **portal** vs **WhatsApp app** (domínio/cookie) se forem **deploys** diferentes.
- Política de quem responde sem estar atribuído: hoje a API muitas vezes só exige pertença ao tenant; alinhar regras de negócio na equipa.

---

*Referência de implementação: `prisma/schema.prisma` (Tenant), `scripts/provision-devflow-sales-tenant.ts`, `docs/whatsapp/PLATFORM-ADMIN-AND-CHANNEL-OPERATIONS.md`.*
