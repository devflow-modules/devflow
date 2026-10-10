# `apps/site` — status

Classificação: **LEGACY BUT STILL REFERENCED**.

## O que é

Pacote `@devflow/app-site`. Espelho histórico de marketing. O portal canónico é `src/` na raiz, publicado pelo projeto Vercel `devflow` (root do repositório) em `devflowlabs.com.br`.

## Por que permanece

- O workspace inclui `apps/*`, então o pacote entra no lockfile.
- A remoção total está marcada como fase posterior, com confirmação humana (`apps/site/README.md`, issue #173, `docs/architecture/ROUTING_MIGRATION_EXECUCAO.md`).
- `docs/whatsapp-platform/REPOSITORY-PURITY-STATUS.md` classifica o pacote como LEGACY / FREEZE / BLOCKED.
- Nenhum projeto Vercel deste time usa `rootDirectory=apps/site`. Os projetos atuais são `devflow` (raiz), `devflow-whatsapp`, `devflow-financeiro` e `devflow-applyflow`.
- O workflow de CI não trata `@devflow/app-site` como owner do portal, mas um `pnpm -r` ainda enxerga o pacote.

## O que não fazer

- Não editar Header, navegação ou copy comercial aqui.
- Não sincronizar o espelho com o portal canónico.
- Não apagar o diretório neste ciclo: a exclusão muda workspace e lockfile e ainda depende de confirmação humana.

## Bloqueio para remoção

Confirmação humana de que nenhum deploy, script ou consumidor fora deste inventário ainda usa o pacote, seguida da retirada do workspace e do lockfile.
