# Design system — WhatsApp Platform (DevFlow)

Padrão visual e de layout do app **WhatsApp Platform**: SaaS B2B claro, legível e consistente (Next.js 15+, Tailwind v4).

**Fonte de verdade dos tokens e classes utilitárias:** `src/app/globals.css` (prefixo `df-`).

## Princípios

1. **Neutros primeiro** — fundos e texto em escala `slate`; marca em ações e foco.
2. **Hierarquia clara** — eyebrow → título → descrição (`df-text-page-description`).
3. **Configuração ≠ operação** — `PageHeader` com `tone="admin"` + selo `df-admin-badge`.
4. **Movimento mínimo** — `transition` curta; sem animação decorativa desnecessária.

## Tokens CSS (`:root`)

Cores de marca (`--df-brand-*`), admin (`--df-admin-*`), feedback (sucesso/perigo/aviso), espaçamento, raio, sombras — ver comentários em **`globals.css`**.

## Tipografia por função

| Classe | Uso |
|--------|-----|
| `df-eyebrow` | Rótulo de secção / contexto (uppercase pequeno) |
| `df-eyebrow-admin` | Eyebrow em contexto administrativo |
| `df-text-page-title` | Título principal de página |
| `df-text-page-title-sm` | Título compacto (Inbox / denso) |
| `df-text-section-title` | Título de cartão ou secção |
| `df-text-body` | Corpo padrão |
| `df-text-muted` | Texto secundário / apoio |
| `df-text-page-description` | Parágrafo sob o título no `PageHeader` |
| `df-label` | Label de campo |

**Componente:** `PageHeader` consolida título + descrição + quick actions; preferir sempre a páginas com conteúdo principal.

## Layout e ritmo vertical

| Classe | Uso |
|--------|-----|
| `df-shell-main` | Equivalente ao conteúdo principal do `AppShell` (`max-w-6xl` + gutters) |
| `df-page-narrow` | Formulários e settings (`max-w-3xl`) |
| `df-page-medium` | Conteúdo um pouco mais largo (`max-w-4xl`) |
| `df-stack` | Blocos principais (gap 8) |
| `df-stack-relaxed` | Secções mais espaçadas |
| `df-stack-tight` | Listas / passos (gap 4) |
| `df-stack-dense` | Form secções internas (gap 6) |

## Botões

**Código:** `src/components/ui/button.tsx` — variantes `primary`, `secondary`, `ghost`, `destructive`, `admin`.

- **primary:** CTA principal (marca).
- **secondary:** ação secundária sobre fundo claro.
- **ghost:** ações terciárias / toolbars.
- **destructive:** eliminar, revogar, ações perigosas.
- **admin:** ações em contexto de configuração (âmbar discreto).

Usar `<Button variant={...} />` ou `buttonClassName("primary")` em `<Link>`.

## Campos de formulário

Classes globais: **`df-field-control`**, **`df-textarea-control`**, **`df-field-compact`**.

**Código:** `FormField`, `FormSection`, `fieldInputClassName` / `fieldSelectClassName` / `fieldTextareaClassName` em `form-field.tsx` (alinhados às classes acima).

## Cartões

| Classe | Uso |
|--------|-----|
| `df-card` | Padding médio (padrão do componente `Card` md) |
| `df-card-sm` / `df-card-lg` | Variantes de densidade |
| `df-form-section` | Bloco de secção de formulário (borda + sombra) |

**Componente:** `Card`, `CardHeader`.

## Badges

Classes: `df-badge`, `df-badge-brand`, `df-badge-admin`, `df-badge-success`, `df-badge-danger`, `df-badge-muted`.

**Componente:** `AppBadge` (`src/components/ui/app-badge.tsx`) com variantes alinhadas às classes acima.

## Estados vazios / carregamento / erro

| Classe | Uso |
|--------|-----|
| `df-state-loading` | Área de loading centrada |
| `df-state-empty` | Lista vazia / sem dados |
| `df-state-error` | Erro com tratamento |

**Componentes:** `StateLoading`, `StateEmpty`, `StateError` em `app-states.tsx`.

## Feedback inline (banners)

`df-feedback-success`, `df-feedback-warning`, `df-feedback-danger`, `df-feedback-info` — mensagens após ações ou avisos de estado.

## Tabelas administrativas

- `df-table-wrap` — scroll horizontal + borda.
- `df-table` — tabela base; `th` / `td` estilizados no `@layer components`.

## Outros utilitários

- **`df-quick-action`** — atalhos no `PageHeader`.
- **`df-focus-brand`** — foco teclado alinhado à marca.

## Core operacional (Inbox / Chat)

Páginas full-bleed sem `PageHeader` global; hierarquia mantém-se com **títulos de conversa** (`df-text-section-title` no cabeçalho de thread) e texto de apoio `df-text-muted`.

| Classe / ficheiro | Uso |
|-------------------|-----|
| `df-inbox-header` | Barra superior do chat (`ChatHeader`) |
| `df-badge-sla-ok` … `df-badge-sla-critical` | Badges de SLA por nível (tempo de espera + rótulo) |
| `df-chip-conv-state` | Estado da conversa (máquina de estados) |
| `df-chip-status-open` / `closed` / `pending` | Estado do ticket (aberta/fechada/pendente) |
| `df-inbox-sla-wait-*` | Espera compacta na lista (`ConversationItem`) |
| `df-inbox-toolbar-btn`, `df-inbox-dropdown`, `df-inbox-dropdown-item` | Atribuir, estado, tags |
| `df-inbox-pill-notes`, `df-inbox-pill-audit-on/off` | Notas internas e separador de histórico |
| `df-inbox-row-action-primary` / `secondary` | Ações rápidas na lista (assumir/fechar) |
| `df-timeline-day`, `df-timeline-unread` | Separadores na timeline de mensagens |
| `df-message-panel-inbound` / `outbound` | Bolhas de mensagem |
| `df-inbox-template-chip`, `df-inbox-ai-chip` | Atalhos e “Gerar com IA” no compositor |
| `df-panel-ai-preview`, `df-panel-playbook` | Pré-visualizações IA / playbook |
| `df-inbox-filter-empty-card`, `df-inbox-empty-icon-*` | Estado vazio da lista com filtro |

Constantes de mapeamento SLA: `src/components/inbox/inboxOperationalStyles.ts`.

## Ficheiros de referência

- `src/app/globals.css`
- `src/components/ui/page-header.tsx`, `button.tsx`, `form-field.tsx`, `card.tsx`, `app-states.tsx`, `app-badge.tsx`
- `src/components/shell/AppShell.tsx`
- Inbox: `src/components/inbox/ChatHeader.tsx`, `ConversationItem.tsx`, `MessageList.tsx`, `MessageBubble.tsx`, `MessageInput.tsx`, `InboxSidebarEmpty.tsx`, `PlaybookSuggest.tsx`

---

Alterações devem manter contraste legível e foco visível em controlos interativos.
