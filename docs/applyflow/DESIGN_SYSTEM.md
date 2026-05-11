# ApplyFlow — sistema visual (design system)

Documento curto para manter **dashboard** (`apps/applyflow`), **painel** (Shadow DOM) e **options page** alinhados como um único produto *dark premium / local-first SaaS*.

## Direcção visual

- **Escuro, limpo, enterprise**: fundo profundo, superfícies discretas, bordas baixo contraste.
- **Marca única**: acento **esmeralda** (`--af-brand`, ~`#34d399`) em CTAs, chips de sucesso e realces de confiança.
- **Legibilidade**: texto principal claro (`--af-text`), secundário atenuado (`--af-text-muted`).
- **Confiança / privacidade**: blocos de aviso com bordo esmeralda suave (dashboard: `ApplyFlowPrivacyNotice`).
- **Animações**: evitar animações novas; apenas hover/filter ligeiro em botões.

## Tokens CSS (`apps/applyflow`)

Definidos em `src/app/globals.css` (`:root`):

| Token | Uso |
|--------|-----|
| `--af-bg` | Fundo da aplicação |
| `--af-bg-soft` | Fundo secundário / gradiente |
| `--af-surface` | Cartões sólidos |
| `--af-surface-muted` | Cartões embutidos, áreas de filtro |
| `--af-border`, `--af-border-strong` | Separadores e inputs |
| `--af-text`, `--af-text-muted` | Tipografia |
| `--af-brand`, `--af-brand-soft`, `--af-on-brand` | Primário (CTA) |
| `--af-success`, `--af-warning`, `--af-danger` | Estados |
| `--af-radius`, `--af-radius-sm` | Raio de cartão / controlo |
| `--af-shadow` | Sombra de cartão |

No dashboard, componentes em `src/components/ui/` consomem estes tokens via `var(--af-*)` e utilitários Tailwind adjacentes (ex. `emerald-*` onde o token não é necessário).

## Tokens CSS (`apps/applyflow-extension`)

O ficheiro `src/styles/globals.css` define **os mesmos nomes de variáveis** (`--af-*`) com valores calibrados para o painel (gradiente em cartões, sombras). A **options page** importa `globals.css` + `options.css`; tokens garantem paridade com o site.

## Componentes React (dashboard)

Local: `apps/applyflow/src/components/ui/`

| Componente | Função |
|-------------|--------|
| `ApplyFlowCard` | Superfície base: variantes `default`, `muted`, `highlight`, `danger`, `success`, `warning` |
| `ApplyFlowButton` / `applyFlowButtonClass` | Botão ou classes para `<Link>` (primário, secundário, outline marca, ghost, texto de perigo) |
| `ApplyFlowBadge` | Chips discretos (`tone`: neutral, brand, success, warning, danger, intel) |
| `ApplyFlowSection` | Secção com `eyebrow`, `title`, `description`, `children` |
| `ApplyFlowEmptyState` | Estado voluto / filtros sem resultado (card + CTA opcional) |
| `ApplyFlowPrivacyNotice` | Bloco de confiança (localStorage, sem envio de JSON) |

## Estados e hierarquia de botões

**Dashboard / landing**

- **Primário**: `applyFlowButtonClass({ variant: "primary" })` — acção principal (Abrir dashboard, Importar como label styled).
- **Outline marca**: demo, realces ApplyFlow.
- **Secundário**: documentação, import alternativo.
- **Perigo (ghost)**: limpar dados.

**Painel (Shadow DOM)**

- **Primário** `.af-btn` — Copiar, Gerar com IA.
- **Secundário** `.af-btn-secondary` — Preencher, Confirmar, Copiar texto IA, área IA.
- **Linha de acções** `.af-action-row` — `flex-wrap`, botões com `min-width` equilibrada.

**Options**

- **Primário** `.af-opt-btn-primary` — Salvar perfil, Guardar IA.
- **Secundário** `.af-opt-btn-secondary` — exportar, repor, testar, importar.

## Badges

- **Painel**: `.af-badge-high|medium|low` (confiança sugestão/classificação).
- **Dashboard (tabela)**: `ApplyFlowBadge` por estado da candidatura (`statusTone`).
- **Histórico (options)**: `.af-intel-chip`, `.af-intel-chip-skill`, `.af-stale-chip`.

## Empty states

- Dashboard sem dados: `ApplyFlowEmptyState` (sem CTA primário obrigatório).
- JSON inválido: `ApplyFlowCard` `danger`.
- Filtros sem linhas: `ApplyFlowEmptyState` `warning` + «Repor filtros».

## Guidelines para novas telas (ApplyFlow)

1. Preferir **tokens** `var(--af-*)` antes de cores hex soltas.
2. Manter **contraste** de foco visível (`focus-visible` nos botões do dashboard).
3. **Nunca** mover lógica de negócio para componentes UI — só apresentação.
4. Na extensão, **não** depender de estilos globais do host — todo o painel via CSS inlinado no Shadow root.

## Diferenças: dashboard vs Shadow DOM

| Aspeto | Dashboard (Next.js) | Painel (extensão) |
|--------|----------------------|-------------------|
| CSS | Tailwind v4 + tokens `:root` | Folha única inlinada (`?inline`), classes `.af-*` |
| Tipografia | `font-sans` do tema | `.af-root` system stack |
| Portal | Links internos `/`, `/dashboard` | Só UI; sem rotas |
| Empacotamento | `ApplyFlow*` em TSX | HTML semântico + classes string |

## Limitações

- Recharts mantém cores hex no JS para `Cell`/`stroke`; alinhar manualmente com `--af-brand` quando mudar tokens.
- O painel não usa Tailwind; mudanças visuais exigem editar `globals.css` / `options.css`.
