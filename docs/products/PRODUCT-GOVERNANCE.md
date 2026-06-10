# DevFlow Product Governance

Documento de referência para **classificar, priorizar e publicar** iniciativas no ecossistema DevFlow Labs. Consulte também o [inventário](./PRODUCT-INVENTORY.md) antes de destacar qualquer produto no site, menu ou roadmap.

---

## Objetivo

Este documento define:

- como categorizar produtos, ferramentas, cases e experimentos;
- quais critérios liberam destaque público (home, menu, funil);
- qual documentação e estrutura de rotas são esperadas;
- como evitar que tudo tenha o mesmo peso comercial e arquitetural.

**Regra prática:** se uma iniciativa não está no inventário ou não passa no checklist de readiness, não ganha destaque no GTM principal.

---

## Princípio central

A DevFlow deve operar com hierarquia clara:

| Camada | Quantidade | Papel |
|--------|------------|-------|
| **Produto principal (GTM)** | 1 | Funil comercial, receita, operação canónica |
| **Produto secundário ativo** | 1 | Complemento com entrega real, sem competir com o principal |
| **Ecossistema** | N | Cases, ferramentas grátis, laboratório, aquisição, autoridade |

### Estado atual (2026)

| Iniciativa | Papel |
|------------|-------|
| **WhatsApp Platform** | Produto principal de go-to-market |
| **Financeiro** | Produto secundário ativo |
| **ApplyFlow, Career Suite, Investiga+, FunkLab, ferramentas grátis, projetos e cases** | Ecossistema complementar — autoridade, aquisição ou laboratório |

O site público (`devflowlabs.com.br`) foi reposicionado para vender **WhatsApp Platform**. Demais iniciativas aparecem como ecossistema secundário, salvo decisão explícita documentada neste inventário.

---

## Tipos de iniciativa

| Tipo | Definição | Exemplos DevFlow |
|------|-----------|------------------|
| **`product`** | SaaS ou solução comercial com proposta, onboarding, entrega e monetização (ou caminho claro para ela) | WhatsApp Platform, Financeiro |
| **`tool`** | Utilitário pontual, normalmente gratuito ou de baixo atrito | Consulta CNPJ, Divisão de Contas |
| **`case-study`** | Projeto usado como prova técnica, portfólio ou autoridade — não é GTM principal | ApplyFlow, Career Suite, Investiga+ |
| **`experiment`** | Laboratório, validação ou protótipo sem compromisso comercial | FunkLab |
| **`internal`** | Ferramenta da operação DevFlow (comercial, suporte, métricas) | CRM (`/admin/leads`, `/admin/lead-finder`) |
| **`archived`** | Iniciativa mantida só por histórico; sem destaque nem investimento ativo | — |

---

## Status de maturidade

```ts
type ProductStatus =
  | "experimental"
  | "internal"
  | "case-study"
  | "public-beta"
  | "active"
  | "archived";
```

| Status | Significado | Destaque público |
|--------|-------------|------------------|
| **`experimental`** | Protótipo ou lab; sem promessa comercial | Não — apenas `/projetos` ou menção explícita como laboratório |
| **`internal`** | Uso interno DevFlow | Não no site público de conversão |
| **`case-study`** | Demonstração de capacidade; portfólio | Secundário — cases, projetos, blog |
| **`public-beta`** | Disponível ao público com escopo ou estabilidade limitados | Sim, com CTA e expectativa alinhada |
| **`active`** | Produto ou ferramenta em operação com owner e docs | Sim, conforme prioridade P0–P2 |
| **`archived`** | Descontinuado ou congelado | Não — link histórico se necessário |

---

## Critérios para destaque público

Uma iniciativa só pode aparecer com **destaque** (hero, menu principal, CTA primário, home acima do fold) se cumprir **todos** os itens:

1. **Dor clara** — problema que resolve, articulável em uma frase.
2. **ICP claro** — quem compra ou usa, com segmento definido.
3. **Rota pública** — página ou ferramenta acessível sem auth (ou demo pública).
4. **CTA definido** — próximo passo único (ex.: diagnóstico, demo, signup).
5. **Owner** — responsável por produto, docs e decisões.
6. **Documentação mínima** — pelo menos README + overview ou equivalente em `docs/`.
7. **Papel no funil** — como se encaixa em Home → Demo → Diagnóstico (ou funil próprio documentado).
8. **Não competir com o produto principal** — não diluir WhatsApp Platform como oferta #1.

Ferramentas grátis e cases podem aparecer no **ecossistema** (rodapé, seção secundária, `/projetos`) sem cumprir monetização, desde que não disputem o hero.

---

## Product Readiness Checklist

Use antes de promover uma iniciativa de P2 para P1 ou de case para produto:

| # | Pergunta | Obrigatório para destaque |
|---|----------|---------------------------|
| 1 | Existe ICP claro? | Sim |
| 2 | Existe dor clara? | Sim |
| 3 | Existe rota pública? | Sim |
| 4 | Existe demo ou preview? | Sim (produto); opcional (tool) |
| 5 | Existe CTA? | Sim |
| 6 | Existe área funcional (`apps/*` ou módulo)? | Sim (product); opcional (tool) |
| 7 | Existe tracking (analytics/eventos)? | Recomendado |
| 8 | Existe documentação? | Sim |
| 9 | Existe modelo de monetização? | Sim (product); N/A (tool/case) |
| 10 | Reforça ou atrapalha o produto principal? | Deve **reforçar** ou ser neutro |

**Bloqueio automático:** resposta “atrapalha” na pergunta 10 impede destaque no GTM principal.

---

## Padrão de documentação por produto

Estrutura recomendada (adaptar ao escopo):

```txt
docs/[produto]/README.md           # índice e links
docs/[produto]/PRODUCT-OVERVIEW.md # proposta, ICP, funil
docs/[produto]/ARCHITECTURE.md     # boundaries, apps, packages
docs/[produto]/GO-LIVE.md          # deploy, env, cutover
docs/[produto]/CHANGELOG.md        # releases relevantes
```

Produtos canónicos no monorepo devem também ter `apps/[produto]/README.md` ou equivalente na raiz do app.

---

## Padrão de rotas

Convenções do portal e apps (não criar rotas ad hoc sem alinhar `docs/site/` e `docs/architecture/`):

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Produto público | `/produtos/[produto]` | `/produtos/whatsapp-platform` |
| Demo | `/demo` ou `/produtos/[produto]/demo` | `/demo`, `/ferramentas/financeiro/demo` |
| Ferramenta | `/ferramentas/[ferramenta]` | `/ferramentas/consulta-cnpj` |
| App operacional | `apps/[produto]` ou `src/modules/[produto]` | `apps/whatsapp-platform`, `src/modules/financeiro` |
| API | `/api/[produto]` ou `/api/[contexto]` | `/api/admin/leads` |
| Admin interno | `/admin/[contexto]` | `/admin/leads`, `/admin/lead-finder` |

Cutover 308 para apps dedicados: ver `docs/architecture/` e `src/proxy.ts`.

---

## Regra de prioridade

| Prioridade | Escopo | Critério de investimento |
|------------|--------|--------------------------|
| **P0** | WhatsApp Platform | GTM, funil, engenharia canónica, suporte comercial |
| **P1** | Financeiro | Manutenção ativa, onboarding, monetização — sem competir com P0 |
| **P2** | Cases e ferramentas úteis | SEO, aquisição, autoridade — ecossistema secundário |
| **P3** | Experimentos / laboratório | Tempo boxed; sem destaque na home |
| **P4** | Arquivados | Somente histórico; sem commits de feature |

**P0 interno** (ex.: CRM comercial) não substitui P0 de produto — classificar como `internal` no inventário.

---

## Fluxo de decisão

1. Nova ideia → classificar **tipo** e **status** provisório.
2. Registrar em [PRODUCT-INVENTORY.md](./PRODUCT-INVENTORY.md).
3. Preencher **Product Readiness Checklist** se pedir destaque público.
4. PR de site/marketing deve referenciar linha do inventário ou atualizar o inventário no mesmo PR.
5. Revisão trimestral: confirmar `next decision` de cada linha P0–P2.

---

## Referências

- [PRODUCT-INVENTORY.md](./PRODUCT-INVENTORY.md) — inventário vivo
- [GO-TO-MARKET.md](../GO-TO-MARKET.md) — playbook comercial
- [docs/README.md](../README.md) — índice geral
- [ARCHITECTURE.md](../../ARCHITECTURE.md) — boundaries do monorepo
