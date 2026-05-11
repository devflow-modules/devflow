# ApplyFlow — checklist de publicação

Usar antes de tornar um **repo**, **post**, **vídeo** ou **deploy** público visível a terceiros.

---

## Conteúdo e narrativa

- [ ] **MVP local-first** explícito nos README e posts: produto funciona **sem** backend ApplyFlow, **sem** sync cloud obrigatório.
- [ ] **Não prometer** sync cloud automático, SaaS activo ou funcionalidades Pro que ainda não existem no código.
- [ ] **Roadmap cloud** (se mencionado) como **opcional/futuro** — alinhar com [`ADR-LOCAL_FIRST_VS_SERVERLESS.md`](./ADR-LOCAL_FIRST_VS_SERVERLESS.md).
- [ ] **README** do dashboard (`apps/applyflow/README.md`) revisto (problema, solução, stack, demo).
- [ ] **Landing** (`/`) com CTAs correctos (dashboard, demo, documentação, import).
- [ ] **Página `/documentacao`** coerente com ficheiros em `docs/applyflow/`.
- [ ] **Posts** (`LINKEDIN_POST.md`) sem afirmar **Chrome Web Store** em produção salvo ser factual.
- [ ] **Case study** (`CASE_STUDY.md`) sem métricas inventadas de utilizadores.

## Dados e segurança

- [ ] **Demo JSON** só com dados fictícios; URLs/empresas **genéricas**.
- [ ] **Não expor API keys** em vídeo, screenshots ou posts (IA opt-in usa chave local).
- [ ] **Não expor dados reais** de candidaturas em materiais públicos.
- [ ] Nenhum **segredo** (API keys, tokens) em código, prints ou vídeo.
- [ ] **.env** e credenciais **fora** do commit; `.gitignore` verificado.
- [ ] Screenshots sem **PII** real (ou borradas).

## Mídia

- [ ] **Screenshots** conforme `SCREENSHOTS_CHECKLIST.md`.
- [ ] **Vídeo** (opcional) seguindo `DEMO_SCRIPT.md`; áudio e legendas aceitáveis.
- [ ] Tamanho de ficheiros OK para Git LFS ou hosting externo se necessário.

## Qualidade técnica (ApplyFlow)

Rodar na raiz do monorepo (ou ajustar filtros):

```bash
pnpm --filter @devflow/applyflow-core build
pnpm --filter applyflow test
pnpm --filter applyflow build
pnpm --filter applyflow-extension test
pnpm --filter @devflow/applyflow-core test
pnpm --filter @devflow/applyflow-linkedin test
pnpm --filter applyflow-extension build
pnpm exec eslint "apps/applyflow/**/*.{ts,tsx}" "apps/applyflow-extension/src/**/*.{ts,tsx}" "packages/applyflow-core/src/**/*.ts" "packages/applyflow-linkedin/src/**/*.ts"
pnpm exec tsc --noEmit -p apps/applyflow/tsconfig.json
```

**Lint do monorepo inteiro:** `pnpm lint` na raiz pode falhar por ficheiros gerados ou outras apps fora do escopo ApplyFlow. Para gate de portefólio, usar o `eslint` com *globs* acima (alinhado com este checklist).

**Gates opcionais do monorepo** (regressão geral, quando fizer sentido antes de merge):

```bash
pnpm test
pnpm build
```

- [ ] Comandos do bloco ApplyFlow **OK** (ou issues documentadas só fora do escopo ApplyFlow).
- [ ] `tsc --noEmit` do dashboard **OK** (comando acima).

## Distribuição

- [ ] Decisão **repo público vs privado** + licença (se público).
- [ ] **Deploy** do dashboard (Vercel/static): variáveis e domínio definidos; sem analytics invasivos se a narrativa for “local-first”.
- [ ] Link no **perfil** (LinkedIn/GitHub) apontando para README ou site estático.

## Revisão final humana

- [ ] Leitura de **privacidade** e **ROADMAP** — “fora de escopo” coerente com o vídeo/screenshots.
- [ ] Ortografia PT nas peças principais (landing, README PT).
