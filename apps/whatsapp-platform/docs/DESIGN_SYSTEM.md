# Design system — WhatsApp Platform (DevFlow)

Padrão visual e de layout do app **WhatsApp Platform**: superfície **operacional dark** (não marketing SaaS claro), legível sob uso prolongado (Next.js 15+, Tailwind v4).

**Fonte de verdade dos tokens e classes utilitárias:** `src/app/globals.css` (prefixo `df-*`).
**Runtime:** `--df-bg-app` / `--df-bg-elevated` / `--df-text-*` + marca verde (`--df-brand-*`).
**UIZZE:** fatias de densidade Inbox 0–6 = **KEEP**. Referências externas do catálogo UIZZE = **TBD pelo humano** (não inventar links).

---

## Princípios

1. **Dark operacional primeiro** — fundos e texto via tokens semânticos `df-*` (não `slate-50` / `white` / sky-emerald Tailwind direct).
2. **Hierarquia clara** — eyebrow → título → descrição (`df-text-page-description`); na Inbox, ver contrato abaixo.
3. **Configuração ≠ operação** — `PageHeader` com `tone="admin"` + selo `df-admin-badge` em settings; Inbox prioriza a conversa, não um dashboard.
4. **Movimento mínimo** — `transition` curta; sem animação decorativa, glow de IA ou pills só estéticas.
5. **Badges só para estado** — SLA, unread, pending, delivery, sync — não decoração.

---

## Contrato visual — Inbox (canónico)

| Campo | Decisão |
|-------|---------|
| **Screen job** | Operador localiza, entende e responde conversas WhatsApp rapidamente. |
| **Primary action** | **Enviar** (após Assumir / activação quando aplicável). |
| **Hierarquia** | 1) fila e urgência · 2) thread e composer · 3) contexto do cliente **sob demanda**. |
| **Layout** | Full-bleed (sem `df-shell-main` / `max-w-6xl` no conteúdo). Lista ≈ **260–300px**. CRM: side em **xl**; drawer / stack conforme breakpoint. Mobile: **lista XOR conversa**. |
| **Linguagem** | Dark operacional; tipografia densa (`df-text-page-title-sm`, muted); CTA primário Enviar (`df-inbox-send-primary` / `Button` primary). |
| **Evidência** | Fatias densidade 0–6 KEEP; `globals.css` dark; ecrãs UIZZE externos ainda TBD. |

### Estados obrigatórios (documentar / preservar na UI)

`loading` · `empty` · `filtered-empty` · `error` + retry · `syncing` · `offline` · `degraded` · `disabled` composer · `send-fail` · `success` · `permission` · `activation` · `mobile`.

Usar `StateLoading` / `StateEmpty` / `StateError`, `df-state-*`, `df-feedback-*`, locks de composer e pills de realtime existentes — **não** inventar um segundo sistema de estados.

### Forbidden defaults (bloqueiam entrega)

- Orientar agentes a **SaaS claro / slate / white** como default do produto.
- Métricas / KPI strips como **hero** da Inbox.
- Cards filler, dashboards genéricos, CTAs vagos.
- `sky-*` / `emerald-*` Tailwind direct (smoke `inbox-ui1a-tokens` rejeita residual claro).
- Glow de IA, pills decorativas, branding copiado de outros produtos.
- Cores fora de `df-*` / tokens semânticos.
- Redesign total sem evidência e sem fatia autorizada.
- Tratar referências UIZZE inventadas como facto.

---

## Tokens CSS (`:root`)

Ver comentários em **`globals.css`**:

- Superfícies: `--df-bg-app`, `--df-bg-elevated`, `--df-border-*`
- Texto: `--df-text-primary`, `--df-text-secondary`, `--df-text-muted`
- Marca: `--df-brand-*` (acções, links, foco)
- Admin: `--df-admin-*` (âmbar — configuração sensível)
- Feedback: `--df-success-*`, `--df-danger-*`, `--df-warning-*`
- Inbox: `--df-inbox-sheet-*`, `--df-msg-inbound-*`, `--df-inbox-soft-shadow`

---

## Tipografia por função

| Classe | Uso |
|--------|-----|
| `df-eyebrow` | Rótulo de secção / contexto (uppercase pequeno) |
| `df-eyebrow-admin` | Eyebrow em contexto administrativo |
| `df-text-page-title` | Título principal de página |
| `df-text-page-title-sm` | Título compacto (Inbox / denso) |
| `df-text-section-title` | Título de cartão, secção ou thread |
| `df-text-body` | Corpo padrão |
| `df-text-muted` | Texto secundário / apoio |
| `df-text-page-description` | Parágrafo sob o título no `PageHeader` |
| `df-label` | Label de campo |

**Componente:** `PageHeader` em páginas com conteúdo principal (settings, billing, etc.). Inbox usa chrome próprio (`InboxShell` / `ChatHeader`) — não forçar `PageHeader` de marketing.

---

## Layout e ritmo vertical

| Classe | Uso |
|--------|-----|
| `df-shell-main` | Conteúdo principal do `AppShell` (`max-w-6xl` + gutters) — **não** na Inbox |
| `df-page-narrow` | Formulários e settings (`max-w-3xl`) |
| `df-page-medium` | Conteúdo um pouco mais largo (`max-w-4xl`) |
| `df-stack` | Blocos principais (gap 8) |
| `df-stack-relaxed` | Secções mais espaçadas |
| `df-stack-tight` | Listas / passos (gap 4) |
| `df-stack-dense` | Form secções internas (gap 6) |

---

## Botões

**Código:** `src/components/ui/button.tsx` — variantes `primary`, `secondary`, `ghost`, `destructive`, `admin`.

- **primary:** CTA principal (marca) — na Inbox, **Enviar**.
- **secondary:** acção secundária sobre superfície elevated.
- **ghost:** acções terciárias / toolbars (`df-inbox-toolbar-btn`).
- **destructive:** eliminar, revogar, acções perigosas.
- **admin:** acções em configuração (âmbar discreto).

Usar `<Button variant={...} />` ou `buttonClassName("primary")` em `<Link>`.

---

## Campos de formulário

Classes globais: **`df-field-control`**, **`df-textarea-control`**, **`df-field-compact`**.

**Código:** `FormField`, `FormSection`, `fieldInputClassName` / `fieldSelectClassName` / `fieldTextareaClassName` em `form-field.tsx`.

---

## Cartões

| Classe | Uso |
|--------|-----|
| `df-card` | Padding médio (padrão do componente `Card` md) |
| `df-card-sm` / `df-card-lg` | Variantes de densidade |
| `df-form-section` | Bloco de secção de formulário (borda + sombra) |

Na Inbox, preferir folhas `df-inbox-sheet-*` / painéis existentes a cards genéricos de dashboard.

---

## Badges

Classes: `df-badge`, `df-badge-brand`, `df-badge-admin`, `df-badge-success`, `df-badge-danger`, `df-badge-muted` (+ variantes Inbox SLA / chips).

**Componente:** `AppBadge` (`src/components/ui/app-badge.tsx`).

---

## Estados vazios / carregamento / erro

| Classe | Uso |
|--------|-----|
| `df-state-loading` | Área de loading centrada |
| `df-state-empty` | Lista vazia / sem dados |
| `df-state-error` | Erro com tratamento |

**Componentes:** `StateLoading`, `StateEmpty`, `StateError` em `app-states.tsx`.

---

## Feedback inline (banners)

`df-feedback-success`, `df-feedback-warning`, `df-feedback-danger`, `df-feedback-info` — mensagens após acções ou avisos de estado (incl. activação, send-fail).

---

## Tabelas administrativas

- `df-table-wrap` — scroll horizontal + borda.
- `df-table` — tabela base; `th` / `td` estilizados no `@layer components`.

---

## Outros utilitários

- **`df-quick-action`** — atalhos no `PageHeader`.
- **`df-focus-brand`** — foco teclado alinhado à marca.

---

## Core operacional (Inbox / Chat)

Superfície **full-bleed**. Hierarquia: fila → thread + composer → contexto sob demanda. Modo foco (`df-inbox-focus-mode`) reduz chrome auxiliar — não redesenhar capacidades das fatias 0–6 KEEP.

| Classe / ficheiro | Uso |
|-------------------|-----|
| `df-inbox-header` | Barra superior do chat (`ChatHeader`) |
| `df-badge-sla-ok` … `df-badge-sla-critical` | Badges de SLA por nível |
| `df-chip-conv-state` | Estado da conversa |
| `df-chip-status-open` / `closed` / `pending` | Estado do ticket |
| `df-inbox-sla-wait-*` | Espera compacta na lista (`ConversationItem`) |
| `df-inbox-toolbar-btn`, `df-inbox-dropdown`, `df-inbox-dropdown-item` | Atribuir, estado, tags |
| `df-inbox-pill-notes`, `df-inbox-pill-audit-on/off` | Notas internas e histórico |
| `df-inbox-row-action-primary` / `secondary` | Ações rápidas na lista (assumir/fechar) |
| `df-timeline-day`, `df-timeline-unread` | Separadores na timeline |
| `df-message-panel-inbound` / `outbound` | Bolhas de mensagem |
| `df-inbox-template-chip`, `df-inbox-ai-chip` | Atalhos e assistência IA no compositor (não hero) |
| `df-panel-ai-preview`, `df-panel-playbook` | Pré-visualizações IA / playbook |
| `df-inbox-filter-empty-card` (+ `--clear` / `--filtered`, …) | Empty / filtered-empty da lista |
| `df-inbox-send-primary` | CTA Enviar |

Constantes de mapeamento SLA: `src/components/inbox/inboxOperationalStyles.ts`.

---

## Ficheiros de referência

- `src/app/globals.css`
- `src/components/ui/page-header.tsx`, `button.tsx`, `form-field.tsx`, `card.tsx`, `app-states.tsx`, `app-badge.tsx`
- `src/components/shell/AppShell.tsx`
- Inbox: `InboxShell.tsx`, `ChatHeader.tsx`, `ConversationItem.tsx`, `MessageList.tsx`, `MessageBubble.tsx`, `MessageInput.tsx`, `LeadDataPanel.tsx`, `InboxSidebarEmpty.tsx`, `PlaybookSuggest.tsx`
- Checklist PR: `docs/VISUAL_REVIEW_CHECKLIST.md`
- Rule Cursor: `.cursor/rules/whatsapp-platform-design.mdc`

---

Alterações devem manter contraste legível em **fundo dark**, foco visível, e tokens `df-*`. Fatia U1 (chrome Inbox) e referências UIZZE externas ficam **fora** deste documento até autorização / evidência humana.
