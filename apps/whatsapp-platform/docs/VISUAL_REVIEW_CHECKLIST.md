# Checklist de revisão visual (PR) — WhatsApp Platform

Usar em PRs que toquem UI (`apps/whatsapp-platform`). Não substitui testes nem acessibilidade formal; reforça **consistência com o design system dark** (`df-*`).

## Tokens e classes

- [ ] Novos estilos usam tokens `df-*` ou componentes existentes (`PageHeader`, `Card`, `Button`, `FormField`, `StateEmpty`, …)?
- [ ] Evitadas strings longas de Tailwind duplicadas quando existe utilitário (`df-stack`, `df-quick-action`, `df-feedback-*`, etc.)?
- [ ] Cores só via tokens semânticos / marca / admin / feedback — **sem** `slate-50`/`white`/`sky-*`/`emerald-*` direct como default?
- [ ] Nenhum glow de IA, pill decorativa ou card filler sem estado real?

## Tipografia e hierarquia

- [ ] Página com conteúdo principal usa `PageHeader` (excepção justificada: Inbox full-bleed)?
- [ ] Títulos de secção usam `df-text-section-title` ou `CardHeader`?
- [ ] Texto de apoio usa `df-text-muted` / `df-text-page-description` (tokens), não cinzentos arbitrários?

## Layout

- [ ] Conteúdo geral respeita o shell (`max-w-6xl` / `df-shell-main`) salvo rotas full-bleed (Inbox)?
- [ ] Settings / formulários longos usam `df-page-narrow` ou `df-page-medium` + `df-stack`?
- [ ] Espaçamento vertical entre blocos principais usa `df-stack` / `df-stack-tight` / `df-stack-relaxed`?

## Interação

- [ ] Botões usam `Button` ou `buttonClassName` com variante adequada (incl. `destructive` / `admin` quando aplicável)?
- [ ] Foco de teclado visível (`df-focus-brand` ou anel de marca)?
- [ ] Estados loading / empty / error usam `StateLoading` / `StateEmpty` / `StateError` ou `df-state-*`?

## Feedback e dados

- [ ] Banners usam `df-feedback-*`?
- [ ] Tabelas administrativas usam `df-table-wrap` + `df-table` quando faz sentido?
- [ ] Contraste legível em **fundo dark** (não assumir fundo claro)?

## Regressões comuns

- [ ] Não reintroduzir “SaaS claro” / marketing slate como orientação ou estilo default.
- [ ] Não misturar realce **admin** (âmbar) com **aviso** de negócio sem intenção clara.
- [ ] Não tratar métricas da Inbox como hero acima da fila.

## Inbox / Chat (operacional)

- [ ] Hierarquia preservada: fila → thread+composer → contexto sob demanda?
- [ ] CTA primário continua **Enviar**; lista ≈ 260–300px; mobile lista XOR conversa?
- [ ] SLA e estados usam `df-badge-sla-*`, `df-chip-*` ou `inboxOperationalStyles`?
- [ ] Cabeçalho: `df-inbox-header` + toolbar `df-inbox-toolbar-btn` / dropdowns?
- [ ] Timeline: `df-timeline-day` / `df-timeline-unread`; bolhas: `df-message-panel-*`?
- [ ] Compositor: `df-feedback-warning` / `df-feedback-danger`, chips `df-inbox-*`, `df-panel-*`?
- [ ] Empty / filtered-empty: `df-inbox-filter-empty-card` (+ variantes)?
- [ ] Fatias densidade 0–6 KEEP — sem reinterpretar capacidades nesta PR?

## Referência rápida

Documento completo: **`docs/DESIGN_SYSTEM.md`** · tokens: **`src/app/globals.css`** · rule: **`.cursor/rules/whatsapp-platform-design.mdc`**.
UIZZE ecrãs externos: TBD humano — não inventar links na PR.
