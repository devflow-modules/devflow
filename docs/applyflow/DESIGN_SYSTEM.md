# ApplyFlow — sistema visual (design system)

Documento curto para manter **dashboard** (`apps/applyflow`), **painel** (Shadow DOM) e **options page** alinhados como um único produto *dark premium / local-first SaaS*.

## Direcção visual

- **Escuro, limpo, enterprise**: fundo profundo, superfícies discretas, bordas baixo contraste.
- **Marca única**: acento **esmeralda** (`--af-brand`, ~`#34d399`) em CTAs, chips de sucesso e realces de confiança.
- **Legibilidade**: texto principal claro (`--af-text`), secundário atenuado (`--af-text-muted`).
- **Confiança / privacidade**: blocos de aviso com bordo esmeralda suave (dashboard: `ApplyFlowPrivacyNotice`).
- **Animações**: evitar animações novas; apenas hover/filter ligeiro em botões + spinner CSS com `motion-safe` / `motion-reduce`.

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

Utilitários Tailwind `emerald-*` são aceites como extensão da marca quando alinhados ao brand.

## Componentes React (dashboard)

Local: `apps/applyflow/src/components/ui/`

| Componente | Função |
|-------------|--------|
| `ApplyFlowCard` | Superfície base: variantes `default`, `muted`, `highlight`, `danger`, `success`, `warning` |
| `ApplyFlowButton` / `applyFlowButtonClass` | Botão ou classes para `<Link>` |
| `ApplyFlowBadge` | Chips (`tone`: neutral, brand, success, warning, danger, intel) |
| `ApplyFlowSection` | Secção com `eyebrow`, `title`, `description` |
| `ApplyFlowEmptyState` | Empty state (`compact` opcional) — Tier-1 Discovery/Queue/Applications |
| `ApplyFlowLoadingState` | Loading section/compact + spinner CSS |
| `ApplyFlowTabs` | Tablist semântico (`role="tab"`) — allowlisted no `check:buttons` |
| `ApplyFlowSiteHeader` | Shell de navegação (active state + Account/Sign in) |
| `ApplyFlowPrivacyNotice` | Bloco de confiança |

### Forms

Classes partilhadas em `apply-flow-control-classes.ts`:

- `applyFlowControlClass` — input/select/textarea
- `applyFlowFilterSelectClass` — filtros de toolbar
- `applyFlowTextareaClass` — textarea base

`careerPolishInput` reutiliza estas classes.

### Status tones (por domínio)

`status-tones.ts` — **não** misturar conceitos:

| Helper | Domínio |
|--------|---------|
| `matchDecisionTone` | Match Engine advisory |
| `applicationStatusTone` | Application lifecycle |
| `readinessTone` | Checklist ready/attention/**missing** |
| `applicationDecisionTone` | Job Decision V2 recommendation |
| `evidenceMatchTone` | Evidence rows |
| `networkingStatusTone` | Outreach |

Match `apply` ≠ Application `applied` (cores/copy distintas de propósito).

### Tabs

Usar `ApplyFlowTabs` para tablists. Native `<button role="tab">` só neste primitive (governance `check:buttons`).

### Applications responsive

- **&lt; md:** cards (`ApplicationMobileCard`) — company, role, status, age, next action, CTAs
- **≥ md:** tabela densa (`min-w-[1080px]` dentro de scroll shell)

## Shell / navegação

Header sticky no root layout. Active state subtil. Autenticado → **Account**; senão → **Sign in**.

Dashboard activo em `/dashboard` e `/dashboard/jobs/*` (Analytics continua link separado).

## Empty / loading

Preferir `ApplyFlowEmptyState` e `ApplyFlowLoadingState` nas superfícies Tier-1. Loading de botão continua via label no próprio botão.

## Guidelines

1. Preferir tokens `var(--af-*)` antes de hex soltos.
2. Manter `focus-visible` nos controlos interactivos.
3. **Nunca** mover lógica de negócio para componentes UI — só apresentação.
4. Na extensão, estilos via Shadow DOM (tokens `--af-*` paralelos).

## Governance

- Root: `pnpm check:buttons`, `pnpm lint:design-system`
- ApplyFlow tabs primitive está na allowlist de botões nativos

## Limitações

- Recharts mantém cores hex no JS.
- Sem light mode.
- Toast global deferido — feedback inline preferido.
