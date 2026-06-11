# WhatsApp Platform — Product UI Audit

**Versão:** 1.1 · **Data:** 2026-06-10  
**Referência:** [DEVFLOW-PRODUCT-UI-SYSTEM.md](../brand/DEVFLOW-PRODUCT-UI-SYSTEM.md)  
**Âmbito:** `apps/whatsapp-platform` — **P0 visual pass implementado** (2026-06-09)

---

## 1. Resumo executivo

### Aderência geral: **Médio**

O app operacional já possui **base sólida de tokens** (`apps/whatsapp-platform/src/app/globals.css` — `--df-*`, utilities `.df-inbox-*`, `.df-badge-*`, `.df-message-panel-*`) e a **inbox** é a área mais alinhada ao Product UI System: estados de conversa com texto, SLA semântico, compositor com alvo de envio confortável e shell com dimensões próximas do especificado.

A desalinhamento principal está na **mistura de paletas Tailwind “marketing/claro”** (`emerald-*`, `amber-*`, `red-50`, `sky-50`, `violet-50`, `blue-600`) em dashboard, billing, onboarding, admin e alguns painéis da inbox — especialmente em fundos claros dentro de um tema escuro premium. Isso quebra contraste previsível, semântica de cor e a regra “brand ≠ success”.

### Principais problemas visuais

1. **Duas linguagens visuais** — dark product (`--df-bg-app`) vs blocos light-theme espalhados (ex.: `DashboardAiClient`, `AiAnalyticsClient`, `df-panel-ai-preview`, `EvaluationModeRibbon`).
2. **Cores soltas** — dezenas de ficheiros com `emerald-*` / `amber-*` em vez de `--df-success-*` / `--df-warning-*`.
3. **Fundo da thread** — `MessageList` usa gradiente `to-slate-100/60` (claro) incompatível com tema escuro.
4. **Micro-tipografia** — chips e badges a **9–10px** na lista de conversas (risco de legibilidade e AA).
5. **Ações críticas ocultas** — “Assumir” / “Fechar” na lista só em **hover** (teclado e touch comprometidos).
6. **Focus inconsistente** — auth legacy com `focus:ring-blue-600`; dropdown items sem `focus-visible` explícito.

### Riscos para operação real

| Risco | Impacto |
|-------|---------|
| SLA/handoff pouco legível em monitores fracos | Operador perde urgência |
| Status de entrega só por cor (`sky-200` ticks) | Confusão sent/failed/read |
| Ações hover-only na lista | Falha em touch / acessibilidade |
| Painéis IA claros no dark | Fadiga visual, contraste irregular |
| `PENDING` sem família warning dedicada na UI | Handoff humano menos óbvio que `awaiting_agent` |

### Prioridade de correção

1. **P0** — inbox thread background, contraste de ticks de mensagem, ações da lista, painéis IA no compositor.  
2. **P1** — unificar dashboard/billing/settings para tokens `--df-*`; chips ≥11px onde legíveis.  
3. **P2** — polish de gradientes, glow brand no mobile header, densidade opcional.

---

## 2. Critérios usados

Auditoria baseada nas secções do [Product UI System](../brand/DEVFLOW-PRODUCT-UI-SYSTEM.md):

| Critério | O que foi verificado no código |
|----------|-------------------------------|
| Escala de espaçamento | `--df-space-*`, paddings Tailwind ad hoc (`px-2.5`, `py-3.5`, `gap-3.5`) |
| Densidade | inbox comfortable vs admin compact vs onboarding spacious |
| Layout shell | `AppShell.tsx` — sidebar `lg:w-60` (240px), header `h-14` (56px) |
| Cores por função | uso de `--df-brand-*` vs Tailwind semântico solto |
| Contraste | pares texto/fundo em dark + painéis light |
| Focus | `focus-visible:ring-[var(--df-brand-500)]` vs `ring-blue-600` |
| Target size | `.df-inbox-send-primary` (48px), `df-inbox-row-action` (~28px), `icon-xs` (24px) |
| Tipografia | 9–15px na inbox; 24–32px métricas dashboard |
| Estados operacionais | `conversationStateUi.tsx`, SLA, `ChatHeader` status |
| Componentes prioritários | ficheiros em `src/components/inbox/`, `globals.css`, `packages/ui` |

**Método:** inspeção estática de componentes e `globals.css`; sem medição automatizada de contraste (marcado “não confirmado” onde aplicável).

---

## 3. Inventário de telas/componentes

| Área | Caminho provável | Função | Aderência | Observações |
|------|------------------|--------|-----------|-------------|
| Inbox shell | `components/inbox/InboxShell.tsx` | Layout 3 colunas, filtros | **Médio** | Estrutura boa; filtros com mix de tokens e Tailwind |
| Lista de conversas | `components/inbox/ConversationsList.tsx`, `ConversationItem.tsx` | Fila operacional | **Médio–Alto** | SLA/estado semânticos; muitos chips 9px; ações hover-only |
| Thread / mensagens | `components/inbox/MessageList.tsx`, `MessageBubble.tsx` | Histórico chat | **Médio** | Bolhas com `.df-message-panel-*`; fundo lista claro; ticks `sky`/`amber` |
| Composer | `MessageInput.tsx`, `InboxComposerTextField.tsx` | Envio humano | **Alto** | `.df-inbox-send-primary` 48px; mobile `min-h-11`; tokens feedback |
| Header da thread | `components/inbox/ChatHeader.tsx` | Assign, status, tags | **Médio** | `.df-inbox-header`; `emerald` em typing; toolbar compacta 32px |
| Badges / status | `conversationStateUi.tsx`, `ResponseAlertBadge.tsx`, `globals.css` | Semântica | **Alto** (core) | Labels textuais; excepções: deal pending `amber-100` |
| Filtros / filas | `ConversationsList.tsx`, `queues/QueuesClient.tsx` | Triagem | **Médio** | Fila com cor dinâmica; fallback claro `rgb(241 245 249)` |
| Sidebar / topbar | `components/shell/AppShell.tsx`, `AppSidebar.tsx`, `SidebarRail.tsx` | Navegação | **Médio** | 240px sidebar OK; `df-glow-brand` no logo mobile; logout `red-600` solto |
| Dashboard | `app/dashboard/ai/DashboardAiClient.tsx`, `DashboardClient.tsx` | KPIs gestor | **Baixo–Médio** | Muitos `emerald-50`/`red-50` light; cards usam `--df-bg-elevated` |
| Admin tenants | `app/admin/(shell)/tenants/TenantsAdminListClient.tsx` | Lista plataforma | **Médio** | Tabela `px-4 py-3`; badges locais; poucos tokens inbox |
| Settings WhatsApp | `app/dashboard/whatsapp/*`, `components/admin/whatsapp/*` | Canal / ativação | **Baixo–Médio** | `WhatsappConnectClient` emerald marketing; drawers mistos |
| Settings IA | `app/settings/ai/AiSettingsForm.tsx` | Safe mode / IA | **Médio** | Form com tokens; erros `red-50`; safe mode copy OK |
| AI analytics | `app/settings/ai-analytics/AiAnalyticsClient.tsx` | Métricas IA | **Baixo** | Predominância `emerald-50`/`red-50` light |
| Billing tenant | `components/dashboard/billing/*`, `settings/billing/` | Plano / uso | **Baixo–Médio** | `OverageCard`, `HowUsageWorksSection` — emerald light |
| Billing admin | `app/admin/(shell)/billing/BillingDashboardClient.tsx` | Ops financeiras | **Não confirmado** | Não inspeccionado linha a linha nesta auditoria |
| Empty states | `InboxSidebarEmpty.tsx`, `components/ui/empty-state.tsx` | Vazio operacional | **Alto** (inbox) | `.df-inbox-filter-empty-card`; genérico pode variar |
| Error states | `df-feedback-*`, forms `text-red-600` | Erros | **Médio** | Inbox usa `.df-feedback-danger`; auth usa `red-600` solto |
| Modals | `SupportModal.tsx`, `ActivateChannelModal.tsx` | Diálogos | **Médio** | Support com tokens brand; outros variam |
| Toast | `components/ui/simple-toast.tsx` | Feedback rápido | **Baixo** | Sem semântica success/error; `text-white` em `bg-muted` — contraste não confirmado |
| Auth | `login/`, `signup/`, `PasswordField.tsx` | Entrada | **Médio** | Login com brand ring; password `blue-600` legacy |
| Demo ribbon | `ShowcaseDemoBanner.tsx`, `EvaluationModeRibbon.tsx` | Vitrine / eval | **Baixo** (esperado) | Light banners — aceitável se isolado; eval `sky-50` destoa |

---

## 4. Espaçamento e densidade

### O que está alinhado

- Tokens `--df-space-1` … `--df-space-12` definidos (4–48px); escala 8px parcialmente coberta.
- Lista de conversas: `px-2.5` / `py-2.5` ≈ **10–12px** (próximo do spec 12–16px).
- Cards dashboard AI: `p-5` / `p-6` (20–24px).
- Composer: `gap-3` (12px) entre textarea e enviar.
- Shell gutters: `--df-shell-px` 16→24→40px responsivo.

### Problemas

| ID | Problema | Classificação |
|----|----------|---------------|
| SP-1 | `MessageList` gap `3.5` (14px) — fora da escala 8px preferida | P2 |
| SP-2 | Chips na lista com `text-[9px]` e `py-0.5` — densidade **compact** excessiva para texto PT | **P0** |
| SP-3 | `ConversationItem` muito denso quando CRM + prospect + SLA + fila activos (≥6 chips) | **P1** |
| SP-4 | Dashboard/billing cards light com padding generoso mas visual “marketing spacious” | P1 |
| SP-5 | Falta tokens `--df-space-0.5` (2px) e `--df-space-5` (20px) documentados no Product UI | P2 |

### Densidade por modo

| Modo | Onde deveria estar | Estado actual |
|------|-------------------|---------------|
| **Comfortable** | Inbox lista/chat | Mostly OK; chips ultracompactos |
| **Compact** | Admin tables | OK (`text-sm`, `py-3`) |
| **Spacious** | Onboarding, empty | Empty inbox OK; onboarding usa `emerald` marketing |

---

## 5. Cor e semântica

### Alinhado

- SLA: `.df-badge-sla-*`, `.df-inbox-sla-wait-*` — warning/danger com texto.
- Estados de conversa: `df-badge-error` / `info` / `warning` + labels em `conversationStateUi.tsx`.
- Bolhas: inbound `--df-msg-inbound-*`; outbound gradient brand (ação equipa).
- Feedback: `.df-feedback-success|warning|danger|info` no compositor e banners.

### Desalinhado — ocorrências representativas

| Padrão | Exemplos (ficheiros) | Problema |
|--------|---------------------|----------|
| `emerald-*` solto | `DashboardAiClient`, `AiAnalyticsClient`, `WhatsappConnectClient`, `OnboardingProgress`, `OverageCard` | Success/brand marketing, fundos claros |
| `red-50` / `red-600` solto | `AgentsClient`, `AiSettingsForm`, `SystemHealthPanel` | Danger fora de `--df-danger-*` |
| `amber-*` solto | `ConversationItem` (deal pending), `DashboardClient` steps | Warning não tokenizado |
| `sky-*` / `blue-600` | `MessageBubble` ticks, `EvaluationModeRibbon`, auth forms | Info/focus inconsistente |
| `violet-50` | `df-panel-ai-preview`, preview label `text-violet-900` | Painel IA fora do dark system |
| `df-glow-brand` | `AppShell` mobile logo | Glow tipo marketing no produto |
| Gradient outbound | `.df-message-panel-outbound` | Aceitável como “equipa activa”; não confundir com success global |

### Status só por cor

| Local | Detalhe |
|-------|---------|
| `MessageBubble` `StatusTicks` | `sky-200` / `amber-200` sem label visível (só `title`) — **P0** |
| `WhatsappStatusSummary` | Dot `bg-emerald-500` sem texto adjacente — **P1** |
| Queue chip | Cor de fundo `${queue.color}33` — nome presente; cor pode falhar contraste — **P1** (não confirmado por fila) |

### Brand usado como contador

- `df-badge-pending-count` e unread badge usam **`--df-brand-600`** — semanticamente é “atenção pendente”, não CTA; Product UI sugere **warning** — **P1**.

---

## 6. Contraste e legibilidade

| Área | Avaliação | Risco |
|------|-----------|-------|
| Texto principal inbox | `--df-text-primary` em `--df-bg-elevated` | Baixo (design intencional) |
| Preview lista `text-[12px]` secondary | OK em teoria | Médio se `--df-text-muted` no preview |
| Timestamps `11px` muted | Secundário aceitável | Baixo |
| Chips `9px` bold | Muito pequeno | **Alto — P0** |
| Placeholder compositor | `df-field-control` + muted | Não confirmado AA — **P1** |
| Painéis `emerald-50` / `red-50` no dark app | Alto contraste local, baixa coerência | Médio (fadiga) |
| `simple-toast` `text-white` on `bg-muted` | Contraste **não confirmado** | P1 |
| Tags coloridas texto branco | Depende de `tag.color` user-defined | **P1** — risco em cores claras |
| Mensagem outbound branca em brand gradient | Geralmente OK | Baixo |
| Disabled controls `opacity-50` | Pode falhar 3:1 em ícones | P2 |

**MessageList** — fundo `from-muted/40 … to-slate-100/60` cria **ilha clara** no meio do app escuro: legibilidade das bolhas inbound pode degradar nas bordas — **P0**.

---

## 7. Focus e navegação por teclado

### Com focus visível (bom)

- `.df-btn-*`, `.df-inbox-toolbar-btn*`, `.df-inbox-send-primary`
- `AppShell` menu mobile `h-10 w-10` com ring brand
- `InboxComposerTextField` via `.df-field-control` (verificar se ring em todos os estados)
- Vários forms settings com `focus:ring-[var(--df-brand-500)]`

### Sem focus adequado ou inconsistente

| Local | Problema | Prioridade |
|-------|----------|------------|
| `PasswordField.tsx`, `ForgotPasswordForm.tsx` | `focus:ring-blue-600` | **P1** |
| `df-inbox-dropdown-item` | Hover sim; **sem `focus-visible`** explícito | **P0** (assign/status/tags) |
| `ConversationItem` row | É `Button` — OK; acções hover-only **fora da tab order prática** | **P0** |
| Tag remove `×` ghost | Target e focus não confirmados | P1 |
| `NavCommandPalette` | `outline-none` + ring — OK | — |
| Lista: seleccionar conversa | Focus no botão full-row — OK | — |

**Conversation list keyboard:** item focável; acções “Assumir/Fechar” só aparecem no hover — utilizador teclado não as vê sem descoberta — **P0**.

---

## 8. Target size e ações críticas

| Acção | Implementação | Tamanho estimado | vs spec |
|-------|---------------|------------------|---------|
| Enviar mensagem | `.df-inbox-send-primary` `min-h-[3rem]` | **48px** | OK |
| Mobile quick bar | `min-h-11` | **44px** | OK |
| Menu mobile | `h-10 w-10` | **40px** | OK |
| Toolbar header compact | `min-height: 2rem` | **32px** | OK desktop |
| Assumir / Fechar na lista | `.df-inbox-row-action-*` `py-1.5` `text-[10px]` | **~28–32px** | **Abaixo do ideal P0** |
| Template chips | `py-1` `text-[10px]` | **~24–28px** | Limite técnico — P1 |
| `packages/ui` `icon-xs` | `size-6` | **24px** | Mínimo técnico |
| Tag remove × | ghost sem size | **Provável &lt;24px** | P1 |
| Admin filter selects | `py-1.5` | **~32px** | OK |

**Crítico:** assumir conversa na lista — alvo pequeno + hover-only — **P0** para piloto comercial/operacional.

---

## 9. Estados operacionais

| Estado | Onde aparece | Texto UI | Família cor | Ícone | Só cor? | Notas |
|--------|--------------|----------|-------------|-------|---------|-------|
| `OPEN` | Status dropdown | “Aberta” | Neutro | Não | Não | OK |
| `PENDING` | Status dropdown | “Pendente” | Neutro no menu | Não | Não | **Falta badge warning persistente** no header quando handoff — **P1** |
| `CLOSED` | Badge “Encerrada”, row muted | Sim | Muted | Não | Não | OK |
| `HIGH` | CRM priority, SLA | “Prioridade CRM — alta” | danger/warning | Não | Não | OK |
| `needs_human` | Tag `needs_human` (backend) | Via tag nome | Depende tag | Não | Parcial | UI inbox usa `conversationState` derivado |
| `handoff_requested` | Não exposto literal na UI | — | — | — | — | **Gap** — só `PENDING` / awaiting_agent — **P1** |
| `sent` | `StatusTicks` | `title` only | muted/white | ✓ | **Sim** | **P0** |
| `failed` | `StatusTicks` `!`, `df-text-error` | Parcial | amber/red | ! | Parcial | Copy de erro presente |
| `queued` | “Sem responsável” chip | Sim | warning soft | Não | Não | OK |
| `resolved` | CLOSED / deal won | Sim | success/muted | Não | Não | OK |
| `ai_safe` | Settings IA | Copy | info/neutral | Não | Não | Pouco na thread — **P2** |
| `ai_handoff` | Bolha “Assistente IA” + PENDING | Parcial | brand/warning | Não | Parcial | OK operacional |
| `tenant_unresolved` | Admin/logs | Não na inbox tenant | — | — | — | Correcto |
| `signature_invalid` | Ops/admin | Não confirmado na UI | — | — | — | Ver logs |

### Estados derivados (`conversationState`)

| Estado | Label | Família | Aderência |
|--------|-------|---------|-----------|
| `awaiting_agent` | Precisa resposta | error badge | **Alto** |
| `in_progress` | Em atendimento | info | **Alto** |
| `awaiting_customer` | Aguardando cliente | warning/success chip | **Alto** |
| `closed` | Encerrada | muted | **Alto** |

---

## 10. Componentes prioritários

### Inbox item (`ConversationItem.tsx`)

| | |
|-|-|
| **Aderência** | Médio–Alto |
| **Problemas** | Chips 9px; CRM row crowded; deal `amber-100`; ações hover; queue fallback claro |
| **Sugestão** | Extrair `.df-inbox-item`; chips min 11px; warning para pending count; ações sempre visíveis ou menu ⋯ 32px |

### Message bubble (`MessageBubble.tsx`)

| | |
|-|-|
| **Aderência** | Médio |
| **Problemas** | Ticks sky/amber; failed hint `text-white/90`; labels origem OK |
| **Sugestão** | `.df-thread-bubble`; ticks com `.df-status-*` + aria-label; failed usa `.df-feedback-danger` |

### Status badge (`globals.css` + `conversationStateUi.tsx`)

| | |
|-|-|
| **Aderência** | Alto (núcleo) |
| **Problemas** | Excepções pontuais amber/emerald fora do sistema |
| **Sugestão** | Mapa único enum→`.df-status-*` exportado |

### Queue badge (`ConversationItem` inline style)

| | |
|-|-|
| **Aderência** | Médio |
| **Problemas** | Fallback `rgb(241 245 249)`; contraste cor user |
| **Sugestão** | `.df-queue-badge` com `color-mix` tokenizado + validação contraste |

### Thread header (`ChatHeader.tsx`)

| | |
|-|-|
| **Aderência** | Médio |
| **Problemas** | Muitos controlos compactos; typing `emerald`; dropdown sem focus |
| **Sugestão** | Agrupar acções primárias 40px; `.df-status-pending-human` quando `PENDING` |

### Composer (`MessageInput` + `InboxComposerTextField`)

| | |
|-|-|
| **Aderência** | Alto |
| **Problemas** | `df-panel-ai-preview` violet light; template chips pequenos |
| **Sugestão** | Preview IA com `.df-panel-inset` dark; chips `.df-touch-target` min 32px |

### Admin table (`TenantsAdminListClient.tsx`)

| | |
|-|-|
| **Aderência** | Médio |
| **Problemas** | Badge helper local; borders `border-border` genéricos |
| **Sugestão** | `.df-admin-table` compact; status badges tokenizados |

### Metric card (`DashboardAiClient.tsx`)

| | |
|-|-|
| **Aderência** | Médio–Baixo |
| **Problemas** | Sub-cards `emerald-50`/`red-50`; função `intentChipClass` com Tailwind light |
| **Sugestão** | `.df-metric-card` só `--df-bg-elevated`; semântica via `.df-bg-*-soft` |

### Modal (`SupportModal.tsx` — referência)

| | |
|-|-|
| **Aderência** | Médio |
| **Problemas** | Não auditados todos os modais admin |
| **Sugestão** | Padding 24px padrão `.df-modal-body` |

### Toast (`simple-toast.tsx`)

| | |
|-|-|
| **Aderência** | Baixo |
| **Problemas** | Sem variantes success/error; estilo genérico |
| **Sugestão** | `.df-toast` + `role` + cores `--df-feedback-*` |

### Empty state (`InboxFilterEmpty.tsx`)

| | |
|-|-|
| **Aderência** | Alto |
| **Problemas** | Gradiente pesado no card — aceitável |
| **Sugestão** | Manter; alinhar ícone success a `--df-success-soft` sem `rgb(16 185 129)` solto |

### Error state (`df-feedback-danger`, forms)

| | |
|-|-|
| **Aderência** | Médio |
| **Problemas** | Duplicação `red-50` vs `df-feedback-danger` |
| **Sugestão** | Um único `.df-error-state` para forms e inbox |

---

## 11. Dívidas visuais priorizadas

### P0 — Corrigir antes do piloto comercial

| ID | Item | Ficheiro(s) | Estado |
|----|------|-------------|--------|
| P0-1 | Fundo claro da lista de mensagens (`slate-100` gradient) | `MessageList.tsx`, `globals.css` `.df-message-list-scroll` | ✅ Corrigido |
| P0-2 | Ticks de entrega só cor (`sky`/`amber`) — adicionar texto/aria e tokens | `MessageBubble.tsx`, `globals.css` `.df-delivery-status-*` | ✅ Corrigido |
| P0-3 | Ações Assumir/Fechar hover-only e &lt;32px | `ConversationItem.tsx`, `globals.css` `.df-inbox-row-actions` | ✅ Corrigido |
| P0-4 | Chips críticos 9px na lista (SLA, CRM, stage) — subir para ≥11px | `ConversationItem.tsx`, `conversationStateUi.tsx`, `ResponseAlertBadge.tsx`, `globals.css` `.df-inbox-list-chip` | ✅ Corrigido |
| P0-5 | Painel pré-visualização IA tema claro (`violet-50`) no compositor | `globals.css` `.df-panel-ai-preview`, `MessageInput.tsx` | ✅ Corrigido |
| P0-6 | Dropdown inbox sem focus visible (assign/status/tags) | `globals.css` `.df-inbox-dropdown-item` | ✅ Corrigido |

**Notas da implementação (2026-06-09):** thread com gradiente escuro tokenizado; `DeliveryStatus` com glifo + label curto + `aria-label`; coluna lateral de acções sempre visível (`min-h-8`); chips lista ≥11px; preview IA em superfície elevated escura; dropdown com `focus-visible:ring-2` e offset. Testes `inboxUi.test.tsx` e `conversationStateUi.test.ts` verdes.

### Product UI Pass P1 — Dashboard and Cards (2026-06-09)

| Área | Estado | Ficheiros principais |
|------|--------|----------------------|
| Dashboard IA / KPIs | ✅ Corrigido | `DashboardAiClient.tsx`, `KpiCardEnhanced.tsx`, `SystemHealthPanel.tsx` |
| Dashboard principal | ✅ Corrigido | `DashboardClient.tsx`, `PostActivationGuide.tsx` |
| Billing no dashboard | ✅ Corrigido | `OverageCard.tsx`, `UsageCard.tsx`, `HowUsageWorksSection.tsx`, `HowFreePlanWorksSection.tsx`, `PlanComparisonMatrix.tsx`, `BillingAlerts.tsx` (já tokenizado) |
| WhatsApp dashboard | ✅ Corrigido | `WhatsappConnectSuccessBanner.tsx`, `WhatsappConnectClient.tsx`, `WhatsappStatusSummary.tsx`, `WhatsappPhoneNumberCard.tsx`, `callback/page.tsx` |
| Utilities CSS | ✅ Novo | `globals.css` — `.df-metric-card`, `.df-metric-panel`, `.df-metric-subcard--*`, `.df-status-summary-banner--*`, `.df-check-step--*`, `.df-progress-bar-*`, `.df-plan-column-highlight` |
| Empty state partilhado | ✅ Corrigido | `empty-state.tsx` (tom `positive` dark) |

**Ocorrências claras removidas no dashboard:** `emerald-50/100`, `red-50`, `amber-50/100`, `indigo-50`, `violet-100`, `teal-100`, `bg-emerald-500/700` decorativos; badges de log/evento migrados para `df-badge-*`; sub-cards de oportunidades com famílias semânticas.

**Fora de escopo deste pass (próximos P1):** `AiAnalyticsClient` (settings), `EvaluationModeRibbon`, onboarding (`OnboardingProgress`), admin/settings (`AiSettingsForm`, `AgentsClient`), auth legacy, inbox (salvo `empty-state` partilhado).

**Próximo P1 recomendado:** auth legacy (`PasswordField`, `ForgotPasswordForm`), shell navigation (`SidebarRail`), axe/Playwright.

### Product UI Pass P1 — Billing and Onboarding (2026-06-09)

| Área | Estado | Ficheiros principais |
|------|--------|----------------------|
| Billing settings / página consumo | ✅ Corrigido | `BillingSettingsClient.tsx`, `BillingPageClient.tsx` |
| Onboarding / activação | ✅ Corrigido | `OnboardingProgress.tsx`, `ActivationGuidedFlow.tsx`, `EvaluationModeRibbon.tsx` |
| Settings IA | ✅ Corrigido | `AiSettingsForm.tsx`, `AiAnalyticsClient.tsx` |
| Equipa / agentes | ✅ Corrigido | `AgentsClient.tsx` |
| Admin tenants / conversas / WhatsApp | ✅ Corrigido | `TenantsAdminListClient.tsx`, `TenantAdminClient.tsx`, `conversations/page.tsx`, `ChannelActivationDrawer.tsx` |
| Cabeçalhos admin | ✅ Corrigido | `page-header.tsx` (`.df-admin-header-ring`) |
| Utilities CSS | ✅ Novo | `.df-evaluation-ribbon`, `.df-admin-header-ring`, `.df-onboarding-card`, `.df-onboarding-success-icon` |

**Ocorrências claras removidas:** `emerald-50/100/800`, `red-50`, `amber-50/800`, `sky-50`, `violet-100`, `purple-50`, `blue-50/50`, `teal-100` em billing/onboarding/settings/admin.

**Fora de escopo deste pass:** inbox, dashboard (já P1 anterior), `/demo` público, auth login/signup completo, `SupportModal`, `SidebarRail` logout hover.

**Próximo P1 recomendado:** contraste automatizado axe/Playwright; auth legacy focus rings; seed demo comercial P1.

### P1 — Corrigir antes de escalar

| ID | Item | Ficheiro(s) | Estado |
|----|------|-------------|--------|
| P1-1 | Substituir `emerald-*`/`red-50`/`amber-*` em dashboard e billing por `--df-*-soft` | `DashboardAiClient`, `OverageCard`, `AiAnalyticsClient`, etc. | ✅ Dashboard + billing/onboarding/settings (parcial global) |
| P1-2 | `EvaluationModeRibbon` light `sky-50` → variante dark tokenizada | `EvaluationModeRibbon.tsx` | ✅ Corrigido |
| P1-8 | Unificar error states (`red-50` → `df-feedback-danger`) | settings, agents, admin | ✅ Parcial (settings/agents; auth legacy pendente) |
| P1-3 | Auth `focus:ring-blue-600` → brand | `PasswordField`, `ForgotPasswordForm` |
| P1-4 | Badge pending inbound/unread: brand → warning semântico | `globals.css`, `ConversationItem` |
| P1-5 | Indicador `PENDING`/handoff no header da thread (warning) | `ChatHeader.tsx` |
| P1-6 | Queue badge fallback claro e contraste de `tag.color` | `ConversationItem`, `ChatHeader` |
| P1-7 | Toast com variantes semânticas e contraste verificado | `simple-toast.tsx` |

### P2 — Refinamento

| ID | Item | Estado |
|----|------|--------|
| P2-1 | Remover/reduzir `df-glow-brand` no header mobile | Pendente |
| P2-2 | Tokens `--df-space-0.5` e `--df-space-5` | Pendente |
| P2-3 | Toggle densidade compact/comfortable na lista | Pendente |
| P2-4 | Storybook / página design-system interna | Pendente |
| P2-5 | Auditoria contraste automatizada (axe/Playwright) | ✅ (2026-06-09) |
| P2-6 | `MessageList` gap alinhado à escala 8px | Pendente |

#### P2-5 — Validação automatizada (axe + Playwright)

**Spec dedicado:** `apps/whatsapp-platform/tests/a11y/product-ui-a11y.spec.ts`  
**Helper axe:** `tests/a11y/helpers/axe-wcag.ts` (tags `wcag2a`, `wcag2aa`, `wcag21aa`; falha em **critical/serious**)  
**Helper estabilização:** `tests/a11y/helpers/page-stable.ts`

**Comando:**

```bash
cd apps/whatsapp-platform && pnpm test:a11y
```

Para correr só as superfícies Product UI:

```bash
cd apps/whatsapp-platform && pnpm exec playwright test tests/a11y/product-ui-a11y.spec.ts
```

**Rotas cobertas (com credenciais E2E):**

| Rota | Pass visual | Notas |
|------|-------------|-------|
| `/dashboard` | P1 cards | Landmark `main` |
| `/dashboard/ai` | P1 métricas IA | Heading h1 |
| `/inbox` | P0 inbox | Mocks API operacionais |
| `/billing` | P1 billing | Skip se `PRODUCT_MODE≠SAAS` |
| `/dashboard/billing` | P1 billing dashboard | Skip se WL ou redirect role |
| `/settings/billing` | P1 settings billing | Heading h1 |
| `/onboarding` | P1 onboarding | Skip se operator ou onboarding concluído |
| `/settings/ai` | P1 IA settings | Heading h1 |
| `/settings/ai-analytics` | P1 analytics | Heading h1 |
| `/agents` | P1 team | Skip se role sem `canViewTeamPage` |
| `/settings` | P1 settings hub | Heading h1 |
| `/admin/whatsapp` | P1 admin | Skip se não `platform_admin` |
| `/admin/tenants` | P1 admin tenants | Skip se não `platform_admin` |

**Fluxos complementares** (spec `critical-flows.spec.ts`): `/login`, `/conversations`, modal suporte na inbox.

**Regras axe:** todas as regras etiquetadas WCAG 2.1 AA, incluindo **`color-contrast`** (validação indirecta de `df-feedback-*`, `df-badge-*`, `df-onboarding-card`, `df-evaluation-ribbon`, superfícies soft P1).

**Limitações conhecidas:**

- Sem `E2E_WHATSAPP_ADMIN_EMAIL` / `E2E_WHATSAPP_ADMIN_PASSWORD`, testes autenticados são **skipped**; só `/login` em `critical-flows` corre.
- Rotas condicionais (billing SAAS, admin, onboarding, agents) podem skip conforme ambiente.
- Violações **moderate/minor** são logadas no stdout, não bloqueiam CI neste bloco.
- Não existe rota de showcase do design system — contraste das utilities é validado nas telas reais onde aparecem.
- Checklist manual de teclado/foco permanece em `docs/accessibility/WCAG-AA-CHECKLIST.md`.

**Próxima cobertura sugerida:** auth legacy (`PasswordField`), toast semântico, modal de activação de canal, `/conversations` no spec Product UI, trap de foco explícito no modal suporte.

#### P2.1 — Execução autenticada (staging/CI)

**Estado:** ✅ (2026-06-09)

**Autenticação:** login único no `globalSetup` (`tests/setup/global-auth.setup.ts`) → `tests/.auth/whatsapp-admin.json` (gitignored). Specs autenticados reutilizam `storageState` via `useAuthenticatedA11yContext()` e navegam com `navigateAsWhatsappAdmin()` (fallback para login se sessão expirou).

**Variáveis de ambiente:**

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `E2E_WHATSAPP_ADMIN_EMAIL` | Para rotas autenticadas | Conta tenant manager recomendada |
| `E2E_WHATSAPP_ADMIN_PASSWORD` | Para rotas autenticadas | Nunca commitar |
| `E2E_WHATSAPP_BASE_URL` | Opcional | Staging/produção de teste; omitir = `http://127.0.0.1:3099` |
| `E2E_BASE_URL` | Opcional | Alias legado (mesmo efeito) |

**Local sem credenciais:** `pnpm test:a11y` → `/login` passa; autenticados skipped (comportamento esperado).

**Local autenticado:**

```bash
cd apps/whatsapp-platform
# credenciais em .env.local (não versionado)
pnpm test:a11y
# ou só Product UI:
pnpm test:a11y:product-ui
```

**CI:** workflow `.github/workflows/whatsapp-platform-a11y.yml` — secrets `E2E_WHATSAPP_*`; `E2E_WHATSAPP_BASE_URL` opcional (staging desactiva webServer local).

**Skips legítimos restantes:** billing WL/≠SAAS, admin sem `platform_admin`, onboarding concluído/operator, agents sem `canViewTeamPage`.

**Pendências de violações:** a documentar após primeira execução CI/staging com credenciais reais.

---

## 12. Recomendações de implementação

### Ordem sugerida

```
1. Tokens/utilities em falta (sem refactor massivo)
2. Inbox — fundo thread + lista item + dropdown focus
3. Thread/mensagens — bolhas, ticks, failed state
4. Composer — preview IA, chips touch
5. Badges/status — mapa central + PENDING handoff
6. Dashboard/admin/billing — migração tailwind light → df-soft
```

### Utilities/classes desejadas (não implementar nesta fase)

| Classe | Propósito |
|--------|-----------|
| `.df-product-shell` | Wrapper main + gutters shell |
| `.df-product-panel` | Painel lateral 320–400px |
| `.df-inbox-item` | Row lista — padding 12–16px, estados seleccionado/SLA |
| `.df-thread-bubble` | Inbound/outbound + meta |
| `.df-product-focus` | `ring-2 ring-[var(--df-brand-500)] ring-offset-2 ring-offset-[var(--df-bg-app)]` |
| `.df-touch-target` | `min-h-8 min-w-8` (32px) ou `min-h-11` mobile |
| `.df-density-compact` | Variante admin |
| `.df-density-comfortable` | Default inbox |
| `.df-status-pending-human` | Warning soft + label “Aguarda humano” |

### Princípios na implementação

1. **Uma PR por área** (inbox → dashboard → billing) para revisão visual.
2. Não alterar comportamento funcional — só visual/tokens.
3. Verificar dark theme após cada remoção de `*-50` light.
4. Testes existentes `inboxUi.test.tsx`, `conversationStateUi.test.ts` — manter verdes.

---

## 13. Definition of Done da auditoria

| Critério | Estado |
|----------|--------|
| Principais telas/componentes mapeados | ✅ |
| Riscos P0 identificados (6 itens) | ✅ |
| Backlog visual P0/P1/P2 criado | ✅ |
| README whatsapp-platform linkado | ✅ (nesta entrega) |
| P0 visual pass implementado (6 itens) | ✅ (2026-06-09) |
| Contraste AA medido automaticamente | ✅ P2-5 — `pnpm test:a11y` (axe serious/critical) |

---

## Histórico

| Data | Alteração |
|------|-----------|
| 2026-06-10 | Auditoria inicial vs Product UI System v1.0 |
| 2026-06-09 | Product UI Pass P0 — 6 correções na inbox (thread, ticks, ações, chips, preview IA, dropdown focus) |
| 2026-06-09 | Product UI Pass P1 — Dashboard and Cards (métricas, saúde, billing em dashboard, WhatsApp dashboard) |
| 2026-06-09 | Product UI Pass P1 — Billing and Onboarding (settings billing, onboarding, IA analytics, admin tenants) |
| 2026-06-09 | Product UI Pass P2 — validação automatizada axe/Playwright (`product-ui-a11y.spec.ts`) |
| 2026-06-09 | Product UI Pass P2.1 — storageState autenticado, staging/CI documentado |
