# Estrutura Pilar + Clusters (Autoridade Temática)

Documentação da estratégia de conteúdo para **ranking TOP 3** no Google: pilares concentram autoridade; clusters linkam para os pilares e cobrem intenções long-tail.

---

## Pilares (3 páginas profundas — 1500+ palavras)

| Slug | Foco de keyword | Objetivo SERP |
|------|------------------|----------------|
| `/controle-financeiro-completo` | controle financeiro, controle financeiro pessoal | Guia completo; comparativo planilha x app; checklist |
| `/como-organizar-financas-pessoais` | como organizar finanças, organizar finanças pessoais | Passo a passo; erros comuns; exemplo prático |
| `/melhor-app-para-controlar-financas` | melhor app financeiro, app controle financeiro grátis | Comparativo; como escolher; teste sem compromisso |

Cada pilar tem:
- Introdução forte (intenção clara)
- Seções aprofundadas (extraSections: comparação, exemplo, checklist)
- FAQ com 5+ perguntas
- Links para clusters (related)
- Seção "Por que confiar no DevFlow?"

---

## Clusters (páginas satélite → pilar)

Cada cluster tem `pillarSlug` definido e exibe no topo: *"Para um guia completo, leia: [pilar]"*.

### Pilar: controle financeiro completo
- `como-controlar-gastos-mensais`
- `controle-financeiro-pessoal`
- (outros: planilha-vs-app, melhor-forma, app-vs-excel linkam via related)

### Pilar: como organizar finanças pessoais
- `como-organizar-financas`

### Pilar: melhor app para controlar finanças
- `melhor-forma-de-controlar-financas`
- `app-vs-excel-controle-financeiro`

---

## Keywords estratégicas

Definidas em `src/lib/seo/keywords.ts`:
- **Alta prioridade:** controle financeiro, como organizar finanças, melhor app financeiro, planilha vs app, dividir contas
- **Média prioridade:** como controlar gastos mensais, app grátis, rateio proporcional, consultar CNPJ grátis

Cada keyword tem `targetSlug` (página que deve rankear).

---

## Internal linking

- **Cluster → Pilar:** link no topo da página ("Para um guia completo, leia: …") + related no grid
- **Pilar → Clusters:** array `related` com 5 páginas cluster
- **Backlinks (artigos externos):** 1 homepage + 2 pilares por artigo (LinkedIn/Medium)

---

## Manutenção

1. Ao criar nova página growth de tema financeiro: definir `pillarSlug` para o pilar mais próximo.
2. Ao criar novo pilar: adicionar slug em `pillarSlugs` em `keywords.ts` e em `priorityUrls` em `audit.ts`.
3. Titles/descriptions: formato promessa + benefício + curiosidade leve (CTR).
