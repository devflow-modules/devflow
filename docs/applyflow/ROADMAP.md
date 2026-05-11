# ApplyFlow — roadmap

## Concluído (resumo)

- Parser e classificação LinkedIn Easy Apply (`applyflow-linkedin` + fixtures).
- Perfil configurável na extensão; validação Zod; export/import de histórico.
- Autofill assistido + safety gate + auditoria local.
- Histórico de candidaturas, métricas no browser da extensão, job intelligence heurística.
- IA opt-in (cliente) para textos longos; documentação de risco e uso.
- Dashboard Next.js: landing, import por ficheiro e drag-and-drop, **Carregar demo**, gráficos Recharts, tabela filtrável, `localStorage`.
- Pacote `@devflow/applyflow-core` com tipos, métricas, parse de import e filtros; build `dist/` para o dashboard.
- Documentação de produto, arquitetura, checklist de publicação, materiais de portefólio (posts, pitch, roteiro de vídeo).

## Próximo (curto prazo)

- Capturas e vídeo curto conforme `SCREENSHOTS_CHECKLIST.md` e `DEMO_SCRIPT.md`.
- Pequenos ajustes de copy/UX na landing e no dashboard com base em revisão.
- Revisão final antes de divulgação pública (`PUBLICATION_CHECKLIST.md`).

## Futuro (médio prazo)

- Opcional: empacotar o dashboard como **PWA estática** (sem alterar o modelo local-first).
- Opcional: tema claro ou i18n extra — só se o esforço couber no escopo de portefólio.

## Future: Optional Cloud / Pro Layer

Exploração documentada em [`SERVERLESS_FUTURE.md`](./SERVERLESS_FUTURE.md) e [`ADR-LOCAL_FIRST_VS_SERVERLESS.md`](./ADR-LOCAL_FIRST_VS_SERVERLESS.md). **Não comprometido** até decisão explícita da equipa.

Itens hipotéticos (todos **opt-in** face ao modo local-first):

- Login opcional e contas.
- Sync automático entre extensão e dashboard na cloud.
- Dashboard em modo cloud autenticado (em paralelo ao import JSON local).
- IA centralizada (gateway no backend) para quem aceitar termos e plano.
- Limites de uso e quotas.
- Billing e planos (ex. Free local vs Pro cloud).
- Backup multi-dispositivo gerido.
- Export e eliminação de dados do titular.
- Controlos de privacidade e consentimento.

Qualquer evolução com conta cloud exigiria redefinição explícita de modelo de dados, **bases legais** (LGPD/GDPR), **termos do LinkedIn** e **transparência** sobre o que deixa de ser apenas local. Ideias adicionais: sincronização **opt-in** cifrada, workspace multi-dispositivo, ou vertente B2B — produto possivelmente distinto do foco no candidato individual.

## Not planned for MVP

- **Auto-submit** — a extensão não envia nem finaliza candidaturas.
- **Candidatura em massa**.
- **Bypass de CAPTCHA ou login**.
- **Scraping agressivo** fora do necessário ao Easy Apply no DOM autorizado.
- **Salvar respostas completas por padrão** em servidor ApplyFlow — não há backend no MVP.
- **Serverless obrigatório** — o produto base deve continuar utilizável sem API ApplyFlow, conta ou sync cloud.

## Fora de escopo proposital

- **Respostas falsas** ou geração de conteúdo enganoso encorajado pelo produto.
- **Backend ApplyFlow** obrigatório ou armazenamento central de histórico como único modo de uso neste MVP.
