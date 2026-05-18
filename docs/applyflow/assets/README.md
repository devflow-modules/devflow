# ApplyFlow — assets oficiais (screenshots)

Esta pasta contém o **conjunto canónico de 6 PNG** referenciado pelo [`apps/applyflow/README.md`](../../../apps/applyflow/README.md) (caminhos relativos `../../docs/applyflow/assets/` a partir desse README). Os mesmos nomes são usados em posts, portefólio e GitHub.

## Nomes canónicos (obrigatórios para o README do dashboard)

| Ficheiro | Conteúdo esperado |
|----------|-------------------|
| `01-applyflow-hero.png` | Landing `/` — hero ApplyFlow |
| `02-applyflow-dashboard-overview.png` | `/dashboard` — visão geral (idealmente com **demo** carregada) |
| `03-applyflow-analytics.png` | `/dashboard` — gráficos / analytics |
| `04-applyflow-applications-table.png` | `/dashboard` — tabela de candidaturas |
| `05-applyflow-documentation-hub.png` | `/documentacao` — hub de documentação |
| `06-applyflow-chrome-extension-preview.png` | Extensão — **Opções → Preview (captura)** (sem DOM do LinkedIn) |

**Verificação de existência** dos ficheiros no disco: comando em [`SCREENSHOTS_CHECKLIST.md`](../SCREENSHOTS_CHECKLIST.md) (secção *Comando rápido de verificação*). Os nomes coincidem com `apps/applyflow/README.md` e com a tabela do checklist. O **`05-applyflow-documentation-hub.png`** foi **substituído em 2026-05-12** por captura headless da rota `/documentacao` em `next start` (ver registo no `SCREENSHOTS_CHECKLIST.md`).

**Não renomeies** estes ficheiros ao actualizar imagens: mantém o nome e substitui o conteúdo para não partir links em README, issues ou sites em markdown.

## Orientação de privacidade e segurança (mídia pública)

- **Não uses dados reais** de candidaturas, perfil ou conversas na captura destinada a repositório público, LinkedIn ou deck.
- **Não expor:** e-mails, empresas reais identificáveis, URLs de convites privados, tokens, **API keys** (incl. OpenAI), passwords ou notas com PII.
- **Dashboard:** preferir **Carregar demo** (`public/demo/`). Se precisares de mostrar import, usa JSON **fictício** ou anonimizado.
- **Print 06:** obtém sempre via **Preview (captura)** nas opções — evita mensagens e contactos reais do LinkedIn no enquadramento.
- **Substituição:** ao trocar uma imagem antiga, **mantém o nome canónico** e faz commit do novo PNG (revisão de tamanho/LFS conforme política do repo).

## Checklists relacionados

- Captura passo a passo: [`SCREENSHOTS_CHECKLIST.md`](../SCREENSHOTS_CHECKLIST.md)
- **Selecção para portfólio / LinkedIn:** secção *Pacote portfólio controlado* no checklist acima
- Case público: [`PUBLIC_CASE_STUDY.md`](../PUBLIC_CASE_STUDY.md)
- Antes de tornar o caso público: [`PUBLICATION_CHECKLIST.md`](../PUBLICATION_CHECKLIST.md)
- Roteiro de vídeo: [`DEMO_SCRIPT.md`](../DEMO_SCRIPT.md)
