---
name: nextjs-ui-polish
description: >-
  Ajustes de UI no monorepo DevFlow (App Router, tokens, componentes) sem
  alterar regras de negócio nem contratos de API. Usar para polish visual,
  responsividade, consistência com design system.
---

# Next.js — polish de UI seguro

Leia [`AGENTS.md`](../../AGENTS.md) e `.cursor/rules/03-nextjs-app-router.mdc`. No WhatsApp Platform, seguir também `whatsapp-platform-design.mdc` e `apps/whatsapp-platform/docs/DESIGN_SYSTEM.md`.

## Instruções

1. **Inspeccionar** componentes irmãos, tokens (`globals.css`, classes `df-*`, `packages/ui`) e padrões de layout já usados na mesma rota antes de editar.
2. **Preservar** intenção **Server vs Client Component**, limites de **auth** (layouts protegidos) e **routing** (não mudar paths sem governança de rotas).
3. **Evitar mudança de lógica de negócio** — foco em apresentação, acessibilidade, espaçamento, estados vazios/erro/loading quando já existirem padrões.
4. **Reutilizar** tokens, componentes partilhados e classes existentes; não introduzir paleta ou sombras ad hoc.
5. **Responsivo** — verificar breakpoints e overflow (tabelas, inbox, modais) coerentes com o resto da página.
6. **Analytics** — preservar eventos, atributos `data-*` ou hooks de tracking já presentes; não remover sem confirmação.
7. **APIs / route handlers** — não alterar salvo pedido explícito; polish de UI não deve mudar contratos HTTP.

## Expectativas de validação

- Revisão visual rápida (local ou story) nas larguras relevantes.
- Testes de UI ou smoke existentes que cubram a rota, se houver; caso contrário, checklist manual curto.

## Não fazer

- Não mover lógica sensível para o cliente só para “simplificar” o componente.
- Não quebrar design system nem copiar estilos de outro produto sem alinhamento.
- Não alterar `middleware.ts`, `next.config` ou cutover de apps sem tarefa explícita.

## Princípios gerais

- **Diffs pequenos e revistos**, um assunto visual por PR quando possível.
