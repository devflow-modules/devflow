# Checklist de revisão visual (PR) — WhatsApp Platform

Usar em PRs que toquem UI (`apps/whatsapp-platform`). Não substitui testes nem acessibilidade formal; reforça **consistência com o design system**.

## Tokens e classes

- [ ] Novos estilos usam tokens `df-*` ou componentes existentes (`PageHeader`, `Card`, `Button`, `FormField`, `StateEmpty`, …)?
- [ ] Evitadas strings longas de Tailwind duplicadas quando existe utilitário (`df-stack`, `df-quick-action`, `df-feedback-*`, etc.)?
- [ ] Cores fora de `slate` / tokens de marca / admin só para semântica (sucesso, erro, aviso)?

## Tipografia e hierarquia

- [ ] Página com conteúdo principal usa `PageHeader` (ou justificação clara se for exceção, ex.: Inbox)?
- [ ] Títulos de secção usam `df-text-section-title` ou `CardHeader`?
- [ ] Texto de apoio usa `df-text-muted` / `df-text-page-description` em vez de cinzentos arbitrários?

## Layout

- [ ] Conteúdo geral respeita o shell (`max-w-6xl` / `df-shell-main`) salvo rotas full-bleed (ex.: Inbox)?
- [ ] Settings / formulários longos usam `df-page-narrow` ou `df-page-medium` + `df-stack`?
- [ ] Espaçamento vertical entre blocos principais usa `df-stack` / `df-stack-tight` / `df-stack-relaxed`?

## Interação

- [ ] Botões usam `Button` ou `buttonClassName` com variante adequada (incl. `destructive` / `admin` quando aplicável)?
- [ ] Foco de teclado visível (`df-focus-brand` ou anel de marca nos controlos)?
- [ ] Estados de lista vazia / erro / loading usam `StateEmpty` / `StateError` / `StateLoading` ou classes `df-state-*`?

## Feedback e dados

- [ ] Banners de sucesso / erro / info usam `df-feedback-*`?
- [ ] Tabelas administrativas usam `df-table-wrap` + `df-table` quando faz sentido?

## Regressões comuns

- [ ] Não regressão de contraste (texto claro sobre fundo claro sem tom suficiente).
- [ ] Não misturar realce **admin** (âmbar) com **aviso** de negócio sem intenção clara.

## Inbox / Chat (operacional)

- [ ] SLA e estados usam `df-badge-sla-*`, `df-chip-*` ou `inboxOperationalStyles` — sem cores soltas fora deste conjunto?
- [ ] Cabeçalho de conversa usa `df-inbox-header` e toolbar `df-inbox-toolbar-btn` / dropdowns padronizados?
- [ ] Timeline: `df-timeline-day` / `df-timeline-unread`; bolhas: `df-message-panel-*`?
- [ ] Compositor: `df-feedback-warning` (follow-up), `df-feedback-danger` (erro envio), `df-inbox-template-chip` / `df-inbox-ai-chip`, `df-panel-*` para pré-visualizações?
- [ ] Lista vazia com filtro: `df-inbox-filter-empty-card`?

## Referência rápida

Documento completo: **`docs/DESIGN_SYSTEM.md`** · tokens: **`src/app/globals.css`**.
