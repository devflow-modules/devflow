# Issue #28 — fecho técnico / publicação (ApplyFlow)

Texto sugerido para **comentário final** ou **descrição de fecho** da issue no GitHub (copiar/adaptar).

---

## Resumo do escopo entregue

- **Produto:** ApplyFlow — copiloto **local-first** / **privacy-first** para **LinkedIn Easy Apply** (extensão MV3 + dashboard Next.js + pacotes `@devflow/applyflow-core` e `applyflow-linkedin`).
- **Documentação pública:** README dashboard, README extensão (copy anonimizada), `docs/applyflow/*` (case study, pitch, post LinkedIn, roteiro de demo, checklists), hub `/documentacao` com links para Markdown no GitHub.
- **Mídia:** seis PNG oficiais em `docs/applyflow/assets/` (`01`–`06`); **`05-applyflow-documentation-hub.png`** recapturado em 2026-05-12 com UI actual (**«Abrir no GitHub →»**), Chrome headless + `next start`, sem overlay de dev.
- **Qualidade:** gates ApplyFlow verdes (build/test dashboard, test extensão em sprints anteriores, ESLint nos globs, `tsc` dashboard) — **repetir antes do merge** conforme `PUBLICATION_CHECKLIST.md`.

## Comandos de validação (referência)

```bash
ls -lh docs/applyflow/assets/*.png
pnpm --filter @devflow/applyflow-core build
pnpm --filter applyflow build && pnpm --filter applyflow test
pnpm --filter applyflow-extension test
pnpm exec tsc --noEmit -p apps/applyflow/tsconfig.json
pnpm exec eslint "apps/applyflow/**/*.{ts,tsx}" "apps/applyflow-extension/src/**/*.{ts,tsx}" "packages/applyflow-core/src/**/*.ts" "packages/applyflow-linkedin/src/**/*.ts"
```

## Pendências opcionais / fora do código

- Vídeo curto (`DEMO_SCRIPT.md`).
- Revisão humana final (demo JSON, `.env`, ortografia).
- Decisões: repo público/licença, deploy, publicação do post LinkedIn.

## Próximos passos de publicação

1. Merge do PR / fecho da branch após revisão humana.
2. Copiar post de [`LINKEDIN_POST.md`](./LINKEDIN_POST.md) — secção **«Versão pronta para publicar»**.
3. Completar checkboxes ainda `[ ]` em [`PUBLICATION_CHECKLIST.md`](./PUBLICATION_CHECKLIST.md) quando cada acto for factualmente verdadeiro.

---

*Documento gerado para fecho da issue #28 — ApplyFlow Public Portfolio Release.*
