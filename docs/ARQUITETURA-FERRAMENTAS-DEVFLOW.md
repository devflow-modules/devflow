# Arquitetura — Ferramentas no DevFlow

Estrutura de integração do DevFlow como **plataforma hub de ferramentas**, com SEO consolidado em um único domínio.

---

## 1. Estrutura de rotas

```
devflowlabs.com.br
├── /                      # Landing principal (automação WhatsApp)
├── /ferramentas           # Hub de ferramentas
│   ├── /financeiro        # Controle financeiro pessoal
│   └── /divisao-de-contas # (futuro) Divisão de contas
├── /automacao-whatsapp
├── /produtos
├── /projetos
└── ...
```

---

## 2. Benefícios da abordagem

- **SEO unificado:** Autoridade do domínio principal beneficia todas as ferramentas
- **Sem fragmentação:** Nada de proxy, subdomínio ou redirecionamento externo para indexação
- **Linking interno:** Ferramentas linkam entre si, reforçando relevância
- **Manutenção:** Um único deploy, uma única codebase

---

## 3. Contrato de Ferramentas

Toda ferramenta DevFlow deve:

1. **Rota:** viver em `/app/ferramentas/[nome]`
2. **Namespace:** possuir namespace próprio (`components/[nome]/*`, `lib/[nome]/*`, `hooks/[nome]/*`)
3. **SEO:** possuir metadata (`title`, `description`, `canonical`)
4. **Hub:** aparecer no hub `/ferramentas`
5. **Sitemap:** estar no `sitemap.ts`

Isso evita divergência futura entre ferramentas.

**Checklist de lançamento de ferramenta:**

- [ ] Rota criada em `/ferramentas/[tool]`
- [ ] Metadata SEO configurada (`title`, `description`, `canonical`)
- [ ] JSON-LD `SoftwareApplication` (se aplicável)
- [ ] Card/link no hub `/ferramentas`
- [ ] Link no header/footer (se relevante)
- [ ] Entrada no `sitemap.ts`
- [ ] Namespace criado (`components/[tool]/*`, `lib/[tool]/*`, etc.)

Esse checklist vira o ritual de deploy de ferramentas.

**Template de nova ferramenta:**

```
/app/ferramentas/[tool]/
   ├── page.tsx
   └── layout.tsx

/components/[tool]/
   └── ... componentes da ferramenta

/lib/[tool]/
   └── ... lógica e utils

/hooks/[tool]/
   └── ... hooks específicos
```

Evita ter que pensar na estrutura ao criar uma ferramenta nova. *(Futuro: script `pnpm create:tool [nome]` pode gerar isso automaticamente.)*

---

## 4. Migração do Financeiro (próxima fase)

Quando migrar o app completo do projeto `Financeiro`:

1. Copiar `Financeiro/apps/web/app/*` → `devflow/app/ferramentas/financeiro/*`
2. Copiar `Financeiro/apps/web/components/*` → `devflow/components/financeiro/*`
3. Copiar `Financeiro/apps/web/lib/*` → `devflow/lib/financeiro/*`
4. Adaptar imports e design tokens conforme `docs/RELATORIO-PADROES-DESIGN-PARA-FINANCEIRO.md`
5. Atualizar `projects.ts`: url já aponta para `/ferramentas/financeiro`

---

## 5. Sitemap

Rotas em `src/app/sitemap.ts`:

- `/ferramentas` — priority 0.85, weekly
- `/ferramentas/financeiro` — priority 0.8, weekly

---

## 6. Hub de ferramentas

`app/ferramentas/page.tsx` exibe cards com:

- **Controle Financeiro** → `/ferramentas/financeiro` (interno)
- **Divisão de contas** → externo até migração completa

---

## 7. Próxima evolução (programmatic SEO)

Estrutura escalável para hub de ferramentas financeiras:

```
/ferramentas
   /divisao-de-contas
   /financeiro
   /controle-despesas
   /calculadoras
   /investimentos
   /divisao-de-contas/cenarios/[slug]
   ...
```

Modelo de SEO forte: cluster de ferramentas financeiras sob um único domínio.

**Roadmap estratégico (após migração do Financeiro):**

| Sprint | Foco |
|--------|------|
| 1 | 2 ferramentas pequenas: `/calculadora-juros`, `/calculadora-porcentagem` |
| 2 | Cluster financeiro: controle despesas, planejamento, simulador investimento |
| 3 | SEO programático: centenas de páginas por variações |

---

## 8. Status atual

| Camada              | Status      | Observação                                      |
|---------------------|------------|--------------------------------------------------|
| Integração marca/SEO| ✅ Concluída| Hub, canonicals, sitemap, menu, footer, vitrine  |
| Integração produto  | ⏳ Pendente | App ainda via CTA externo; migração em sprint   |

---

## 9. Ordem de execução (Fase 1 — publicar)

1. Commit
2. Deploy
3. Validar `/ferramentas` e `/ferramentas/financeiro` em produção
4. Enviar sitemap no Search Console
5. Abrir sprint separada para migração do app

**Validação antes de considerar 100% concluído:**

- [ ] `/ferramentas/financeiro` abre corretamente
- [ ] Ferramenta aparece no hub `/ferramentas`
- [ ] Metadata SEO presente
- [ ] Página no sitemap
- [ ] Imports sem erro no build
- [ ] Lighthouse sem erro crítico

---

## 10. Checklist — migração do app (Fase 2)

Fazer em **branch dedicada**, tratando como migração de produto.

**Ordem recomendada:**

1. Copiar `components`
2. Copiar `lib`
3. Copiar `hooks`
4. Mover `app` pages
5. Ajustar imports
6. Alinhar design tokens
7. Substituir CTA externo
8. Atualizar sitemap

- [ ] Mover app do Financeiro para `app/ferramentas/financeiro`
- [ ] Migrar components para namespace próprio (`components/financeiro/`)
- [ ] Migrar lib/hooks para `lib/financeiro/`
- [ ] Alinhar design tokens com DevFlow
- [ ] Revisar metadata
- [ ] Revisar analytics
- [ ] Revisar canonicals e sitemap
- [ ] Remover CTA externo

**Regra:** não misturar código do Financeiro com o do DevFlow. Usar namespaces:

```
components/financeiro/*
lib/financeiro/*
hooks/financeiro/*
```

**Estrutura final ideal:**

```
app/ferramentas/financeiro
├── page.tsx
├── layout.tsx
├── components/   # ou importar de @/components/financeiro
├── hooks/
└── lib/
```

**SEO:** manter URL exatamente `/ferramentas/financeiro`. Não criar `/financeiro`, `/financeiro-casa` ou `/app-financeiro`.

**Commit:** `feat(financeiro): migrate financial tool into devflow platform` (~2000–4000 linhas)

---

## 11. Referências

- Relatório de padrões: `docs/RELATORIO-PADROES-DESIGN-PARA-FINANCEIRO.md`
- Projeto Financeiro: `../Financeiro` (monorepo)
