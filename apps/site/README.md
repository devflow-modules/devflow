# `@devflow/app-site` — LEGACY (não canónico)

**Não editar este pacote como fonte de verdade do portal marketing.**

| | |
|--|--|
| **Portal canónico** | Raiz do monorepo: `src/` (`src/components/layout/header.tsx`, `body-chrome.tsx`, …) |
| **Este pacote** | Espelho / variante histórica de marketing (`apps/site`) |
| **Deploy** | Sem `vercel.json` neste diretório; o site público é o Next.js da **raiz** |
| **CI** | O workflow principal da raiz **não** trata este app como owner do portal |
| **Decisão** | Nav F6 / [#173](https://github.com/devflow-modules/devflow/issues/173) — opção **(A)**: marcar LEGACY; **não** sincronizar Header com `src/`; remoção total do pacote fica para fase posterior com confirmação humana |

## O que fazer

- Alterações de Header, BodyChrome, rotas públicas ou CTAs → **`src/`** e docs em `docs/site/HEADER-E-NAVEGACAO.md`.
- Não abrir features novas aqui.
- Não unificar shells de produto (WhatsApp / Financeiro) a partir deste pacote.

## Referências

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md)
- [`docs/site/HEADER-E-NAVEGACAO.md`](../../docs/site/HEADER-E-NAVEGACAO.md)
- [`docs/architecture/ROUTING_POLICY.md`](../../docs/architecture/ROUTING_POLICY.md)
