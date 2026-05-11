# ApplyFlow — case study

## Contexto

ApplyFlow nasce como **peça de produto autoral** dentro do monorepo DevFlow Labs: uma **extensão Chrome (MV3)** para **LinkedIn Easy Apply** e um **dashboard web** sem backend, partilhando regras e tipos em pacotes TypeScript. O objetivo é candidaturas mais consistentes **sem** automação irresponsável nem centralização de dados pessoais num servidor do autor.

## Problema

- Easy Apply exige repetir perguntas e metadados, o que desgasta e favorece erros.
- Histórico disperso (abas, notas, folhas) dificulta acompanhar funil e follow-ups.
- Ferramentas que enviam candidaturas em massa ou ignoram limites da plataforma colocam a conta candidata em risco.

## Objetivo do produto

Oferecer um **copiloto local-first**: sugestões e autofill **assistido** a partir de um perfil validado, **job intelligence** heurística, histórico e métricas no dispositivo, export JSON para análise visual, e **IA apenas se o utilizador optar** — sempre **sem** submeter a candidatura pela extensão.

## Decisões de produto

- **Sem auto-submit**: o utilizador clica em avançar/enviar no LinkedIn; a extensão não simula esse passo.
- **Sem sincronização cloud imposta**: o dashboard recebe dados por **ficheiro** que o utilizador exporta (ou demo pública).
- **IA opt-in**: texto longo opcional com chave do próprio utilizador; não gravar o texto gerado no histórico de candidaturas.
- **Demo fictícia**: portefólio e onboarding sem dados reais.

## Architecture decision: local-first before cloud

ApplyFlow adopta **local-first como decisão estratégica de produto e arquitetura**, não como limitação técnica transitória. Privacidade, redução de complexidade operacional e foco em **validar utilidade** (copiloto responsável, histórico útil, métricas no browser) antecedem qualquer investimento em servidor, base de dados ou contas. Um modo cloud/serverless é tratado como **evolução opcional** (sync Pro, IA gerida, billing), documentado à parte — não como requisito inicial. Isto mantém o MVP portável, demonstrável e alinhado com compliance reduzido relativamente a um SaaS completo.

Ver [`ADR-LOCAL_FIRST_VS_SERVERLESS.md`](./ADR-LOCAL_FIRST_VS_SERVERLESS.md) e [`SERVERLESS_FUTURE.md`](./SERVERLESS_FUTURE.md).

## Decisões técnicas

- **Monorepo** com `apps/*` e `packages/*` para fronteiras claras (regra: apps não importam outros apps).
- **`@devflow/applyflow-core`**: Zod, métricas, parse de import, filtros do dashboard — compilado a `dist/` para o Next consumir de forma estável.
- **`@devflow/applyflow-linkedin`**: parser/classificação de campos com testes e fixtures.
- **Content script IIFE** na extensão para isolamento; opções em React; armazenamento em `chrome.storage.local`.
- **Next.js 16 App Router** para landing, dashboard e página índice de documentação.

## Arquitetura

- `apps/applyflow-extension` — UX no Easy Apply, storage, export.
- `apps/applyflow` — visualização analítica, `localStorage`.
- `packages/applyflow-core` — verdade compartilhada de tipos e regras.
- `packages/applyflow-linkedin` — domínio LinkedIn.

Diagrama e detalhes: [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Fluxo do utilizador

1. Configurar perfil (e opcionalmente IA) na extensão.  
2. Abrir vaga Easy Apply; painel sugere e assiste o preenchimento.  
3. Registar no histórico local; exportar JSON quando quiser métricas no dashboard.  
4. Importar no site ApplyFlow ou carregar demo.

## Segurança e privacidade

- Dados sensíveis em **storage local** (extensão) ou **localStorage** (dashboard).
- Não há API ApplyFlow a receber o histórico; o site não envia o JSON importado para servidores do produto.
- Export com dados reais deve ser tratado como informação pessoal.

## IA opt-in

Ativada só nas opções; chamadas no cliente com chave configurada pelo utilizador; escopo limitado a suportar redação, não a substituir julgamento sobre o que enviar.

## O que foi implementado (evidência técnica)

- Suíte de **testes Vitest** no core, linkedin, extensão e dashboard (incl. demo parseável).
- **Parser robusto** com fixtures; perfil validado; auditoria local de autofill/IA.
- **Dashboard** com Recharts, filtros partilhados com o core, empty states e feedback de import.
- **Documentação** de produto, arquitetura, roadmap e materiais de portefólio.

_Não há métricas de adoção ou utilizadores reais declaradas neste documento._

## Principais desafios

- Alinhar UX “rápida” com **gates de segurança** e mensagens claras sobre o que **não** é automatizado.
- Manter **paridade de schema** entre extensão, export e dashboard quando o modelo evolui.
- Explicar **local-first** a visitantes que esperam login cloud por defeito.

## Resultados do MVP (técnicos)

- Cobertura de testes automatizados nos pacotes ApplyFlow mencionados acima.
- Build reprodutível: core `tsc`, Next **webpack**, extensão **Vite**.
- Conjunto documental para LinkedIn, entrevistas e demo em vídeo.

## Próximos passos

- Materiais visuais (screenshots, vídeo curto) conforme [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md) e [`SCREENSHOTS_CHECKLIST.md`](./SCREENSHOTS_CHECKLIST.md).
- Opcional: PWA estática apenas para o dashboard, sem mudar o modelo de dados.

## O que este projeto demonstra sobre o desenvolvedor

- **TypeScript** em profundidade, fronteiras de pacote e consumo `dist/` em app Next.
- **Extensão MV3** com preocupação explícita em política de plataforma e privacidade.
- **Produto pensado**: narrativa coerente (copiloto vs. bot), documentação de arquitectura e roadmap com “fora de escopo” explícito.
- **Qualidade**: validação Zod, testes direccionados, ESLint nos caminhos ApplyFlow.
