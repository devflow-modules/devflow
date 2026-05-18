# ApplyFlow — checklist de publicação

Usar antes de tornar um **repo**, **post**, **vídeo** ou **deploy** público visível a terceiros.

---

## Status actual (issue #28)

Esta secção separa o que os **sprints de documentação e código** já alinharam do que **depende de acção humana** ou **decisão de publicação**. Os checkboxes abaixo continuam a ser a **lista mestre** — marca `[x]` só quando **tu** confirmares o item (inclui verificação local quando aplicável).

### Pronto (documentação / UX no repo — revisão textual concluída)

- Narrativa **local-first / privacy-first** e **sem** promessa de Chrome Web Store, SaaS cloud activo, sync/billing/Pro **como produto entregue** — alinhada em `apps/applyflow/README.md`, `docs/applyflow/LINKEDIN_POST.md`, `INTERVIEW_PITCH.md`, `CASE_STUDY.md`, `ROADMAP.md`, `DEMO_SCRIPT.md`.
- **Hub `/documentacao`** com atalhos para Markdown no GitHub e copy coerente com privacidade.
- **Checklists** de screenshots (`SCREENSHOTS_CHECKLIST.md`), roteiro de demo (`DEMO_SCRIPT.md`) e índice de assets (`assets/README.md`).
- **README da extensão** com perfil de exemplo anonimizado na copy pública.
- **Seis ficheiros PNG** (`01`–`06`) com **nomes canónicos** presentes em `docs/applyflow/assets/` *(listagem `ls`, 2026-05-12).*
- **Revisão visual assistida** dos 6 PNG para PII, overlay Next e legibilidade — **registo em [`SCREENSHOTS_CHECKLIST.md`](./SCREENSHOTS_CHECKLIST.md)** (2026-05-12); todos **aprovados** para README/portefólio. **`05-applyflow-documentation-hub.png`** recapturado em **2026-05-12** (Chrome headless + `next start`) para mostrar **«Abrir no GitHub →»** no estado live.

### Pendente manual (não marcar no checklist até concluir)

- Gravar **vídeo** (opcional) e validar áudio/legendas.
- Verificar **demo JSON** / **posts** finais **sem** PII nem segredos visíveis *(screenshots oficiais já revistos; ver `SCREENSHOTS_CHECKLIST.md`).*
- **Revisão final humana** (ortografia, coerência global, go/no-go público).
- **Smoke manual (2026-05-18):** PASS — extensão fechada (opções, guard `/jobs*`, `chrome-extension://invalid/` externo ao ApplyFlow) — [`smoke/SMOKE_MANUAL_2026-05-18.md`](./smoke/SMOKE_MANUAL_2026-05-18.md).
- **Landing** revalidada em navegador limpo (2026-05-18); hidratação OK — aviso `cz-shortcut-listen` confirmado como ruído de extensão do browser.

### Pendente decisão (equipa / processo)

- **Publicação (decidido 2026-05-18):** monorepo **privado**; divulgação via portfólio controlado, prints limpos, case study e post LinkedIn — **sem** tornar o repo público neste momento.
- **Repo público vs privado** e **licença** — decisão actual: manter privado.
- **Deploy** do dashboard (se aplicável) e analytics.
- **Publicar** post LinkedIn e actualizar links no perfil.

---

## Conteúdo e narrativa

- [x] **MVP local-first** explícito nos README e posts: produto funciona **sem** backend ApplyFlow, **sem** sync cloud obrigatório.
- [x] **Não prometer** sync cloud automático, SaaS activo ou funcionalidades Pro que ainda não existem no código (copy revisada; futuro só como documentação).
- [x] **Roadmap cloud** (se mencionado) como **opcional/futuro** — alinhar com [`ADR-LOCAL_FIRST_VS_SERVERLESS.md`](./ADR-LOCAL_FIRST_VS_SERVERLESS.md).
- [x] **README** do dashboard (`apps/applyflow/README.md`) revisto (problema, solução, stack, demo, docs de mídia).
- [x] **Landing** (`/`) com CTAs correctos (dashboard, demo, documentação, import) — revalidada em navegador limpo (2026-05-18; ver smoke manual).
- [x] **Página `/documentacao`** coerente com ficheiros em `docs/applyflow/` (índice + links GitHub).
- [x] **Posts** (`LINKEDIN_POST.md`) sem afirmar **Chrome Web Store** em produção salvo ser factual no teu caso.
- [x] **Case study** (`CASE_STUDY.md`) sem métricas inventadas de utilizadores, receita ou adopção.

## Dados e segurança

- [ ] **Demo JSON** só com dados fictícios; URLs/empresas **genéricas**.
- [ ] **Não expor API keys** em vídeo, screenshots ou posts (IA opt-in usa chave local) — *vídeo e posts ainda por validar; conjunto oficial de screenshots revisto em 2026-05-12.*
- [x] **Não expor dados reais** de candidaturas nos **6 PNG oficiais** do README — *revisão assistida 2026-05-12; ver [`SCREENSHOTS_CHECKLIST.md`](./SCREENSHOTS_CHECKLIST.md).*
- [ ] Nenhum **segredo** (API keys, tokens) em código, prints ou vídeo.
- [ ] **.env** e credenciais **fora** do commit; `.gitignore` verificado.
- [x] **Screenshots oficiais (`01`–`06`)** sem **PII** real nem overlay de dev Next visível — *revisão assistida 2026-05-12; conferência humana final opcional.*

## Mídia

- [x] **Screenshots** — estrutura, nomes canónicos e **revisão visual assistida** dos 6 PNG conforme [`SCREENSHOTS_CHECKLIST.md`](./SCREENSHOTS_CHECKLIST.md) *(2026-05-12).*
- [x] **Conjunto oficial do README** (`01`–`06`) em [`docs/applyflow/assets/`](./assets/README.md) com os nomes canónicos, para os links do [`apps/applyflow/README.md`](../../apps/applyflow/README.md) renderizarem no GitHub — *verificado `ls -lh docs/applyflow/assets/*.png` (6 ficheiros, 2026-05-12).*
- [x] **Next dev overlay:** se aparecer **«1 issue»** / *hydration mismatch* no `<body>` com atributo `cz-shortcut-listen` (ou outro atributo estranho que **não** existe em `apps/applyflow/src/app/layout.tsx`), tratar como **extensão do browser** a mutar o DOM antes da hidratação — não é bug do ApplyFlow. Para capturas e gravações: **janela anónima**, **perfil Chrome sem extensões**, ou outro browser limpo; não mascarar o overlay com CSS nem adicionar `suppressHydrationWarning` só por isso. *(Documentado em README e checklists.)*
- [ ] **Vídeo** (opcional) seguindo `DEMO_SCRIPT.md`; áudio e legendas aceitáveis.
- [x] Tamanho de ficheiros OK para Git LFS ou hosting externo se necessário — *`01`–`04` e `06` ~164–272 KB cada; **`05`** maior (~567 KB em 2026-05-12) por mais conteúdo na rota `/documentacao` — **esperado**, não bug; adequado a commit normal em Git salvo política contrária do repo.*

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

- [x] Comandos do bloco ApplyFlow **OK** (ou issues documentadas só fora do escopo ApplyFlow) — *última corrida na preparação da issue #28; repetir antes do merge final.*
- [x] `tsc --noEmit` do dashboard **OK** (comando acima) — *idem.*

## Distribuição

- [ ] Decisão **repo público vs privado** + licença (se público).
- [ ] **Deploy** do dashboard (Vercel/static): variáveis e domínio definidos; sem analytics invasivos se a narrativa for “local-first”.
- [ ] Link no **perfil** (LinkedIn/GitHub) apontando para README ou site estático.

## Revisão final humana

- [ ] Leitura de **privacidade** e **ROADMAP** — “fora de escopo” coerente com o vídeo/screenshots.
- [ ] Ortografia PT nas peças principais (landing, README PT).

---

## Revisão final — Sprint 7

**Data:** 2026-05-12

**Status**

| Item | Estado |
|------|--------|
| Uso pessoal | **OK** (gates técnicos ApplyFlow a verde; smoke manual 2026-05-18 em [`smoke/SMOKE_MANUAL_2026-05-18.md`](./smoke/SMOKE_MANUAL_2026-05-18.md)) |
| LinkedIn post | **OK** (texto em `LINKEDIN_POST.md`; publicação e links no perfil = acção humana) |
| Screenshots | **OK** (conjunto canónico `01`–`06`; `05` com ficheiro maior documentado como esperado) |
| Gates técnicos | **OK** (comandos abaixo, `exit 0`) |

**Comandos executados** (raiz do monorepo, cadeia única `&&`):

- `date +%F` → **2026-05-12**
- `pnpm --filter @devflow/applyflow-core build` → **exit 0**
- `pnpm --filter applyflow test` → **exit 0** (Vitest: 2 ficheiros, 3 testes)
- `pnpm --filter applyflow build` → **exit 0** (Next.js 16.1.6, rotas estáticas `/`, `/dashboard`, `/documentacao`)
- `pnpm --filter applyflow-extension test` → **exit 0** (15 ficheiros, 74 testes)
- `pnpm --filter @devflow/applyflow-core test` → **exit 0** (8 ficheiros, 61 testes)
- `pnpm --filter @devflow/applyflow-linkedin test` → **exit 0** (2 ficheiros, 29 testes)
- `pnpm --filter applyflow-extension build` → **exit 0** (Vite content + bundle principal)
- `pnpm exec eslint "apps/applyflow/**/*.{ts,tsx}" "apps/applyflow-extension/src/**/*.{ts,tsx}" "packages/applyflow-core/src/**/*.ts" "packages/applyflow-linkedin/src/**/*.ts"` → **exit 0**
- `pnpm exec tsc --noEmit -p apps/applyflow/tsconfig.json` → **exit 0**

**Observações**

- **Segurança / grep:** sem API keys reais, `.env` commitado ou PII óbvia nos caminhos ApplyFlow revistos; demo JSON usa entidades fictícias (ex. Contoso). Chaves `sk-*` em testes são placeholders de Vitest.
- **Alterações nesta revisão:** metadata em `apps/applyflow/src/app/layout.tsx` (marca DevFlow Labs + copy MVP); `docs/applyflow/PRODUCT_OVERVIEW.md` (marca na solução); `docs/applyflow/PUBLICATION_CHECKLIST.md` e `SCREENSHOTS_CHECKLIST.md` (tamanho do `05`); `apps/applyflow-extension/README.md` (privacidade job intelligence vs IA opt-in).
- **Pendências reais antes de divulgação alargada** (checklist mestre acima): validação visual da **landing**; confirmação **demo JSON** / posts sem PII; **vídeo** opcional; decisão **repo público** / **deploy**; **revisão humana** ortografia/go-no-go.

**Veredito**

- **Uso pessoal:** **PRONTO PARA USO** (com smoke manual habitual: extensão `dist/`, dashboard `dev` ou `start`).
- **LinkedIn:** **PRONTO PARA LINKEDIN** no sentido de **conteúdo e claims** no repositório (post pronto para copiar/colar; sem promessa de Chrome Web Store, SaaS cloud activo ou Pro entregue).
- **Go-live institucional completo** (repo + deploy + mídia): **PENDENTE** apenas pelos itens manuais/decisão listados no checklist mestre — não por falha técnica ApplyFlow.
