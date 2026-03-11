# DevFlow Labs — Brand System v1

Identidade visual oficial. Estética: **Vercel + Supabase + Linear**.

---

## 1. Cores

### Core
| Token | Hex | Uso |
|-------|-----|-----|
| Primary Green | `#22C55E` | Botões, CTA, links, ações |
| Primary Dark | `#16A34A` | Hover do primary |

### Tech
| Token | Hex | Uso |
|-------|-----|-----|
| Tech Blue | `#38BDF8` | Ícones técnicos, infraestrutura, IA |
| Tech Blue Dark | `#0EA5E9` | Hover do accent |

### Neutros
| Token | Hex | Uso |
|-------|-----|-----|
| Background | `#F8FAFC` | Fundo principal |
| Section Alt | `#F1F5F9` | Seções alternadas |
| Border | `#CBD5E1` | Bordas (contraste definido) |
| Text Primary | `#0C1222` | Títulos, texto principal |
| Text Secondary | `#334155` | Subtítulos, corpo |

### Uso estratégico
- **Verde** = ação, automação, CTA
- **Azul** = tecnologia, sistema, IA
- **Neutros** = sofisticação, leitura

---

## 2. Tipografia

- **Fonte**: Inter (next/font/google)
- **H1**: font-weight 700
- **H2**: font-weight 600
- **Body**: font-weight 400

---

## 3. Componentes

### Botão primário
- `bg-primary` / `#22C55E`
- `text-white`
- `rounded-lg`
- `font-semibold`
- Hover: `#16A34A`

### Botão secundário
- `border: 1px solid #E2E8F0`
- `bg-white`
- Hover: `#F1F5F9`

### Card
- `border: 1px solid #CBD5E1`
- `border-radius: 12px`
- `padding: 24px`
- Hover: `shadow` + `-translate-y-1`

### Badge
- **Default**: `bg-white border border-border text-slate-700`
- **Tech**: `border-accent/30 bg-accent/5`
- **Primary**: `bg-primary/10 text-primary`

---

## 4. Espaçamento

- Section padding: `96px` (py-24)
- Container max: `1200px`
- Card gap: `24px`

---

## 5. Assinatura visual

- Barrinha verde (`h-1 w-12 rounded-full bg-primary`) acima de títulos de seção
- Grid técnico sutil (40px) em hero e CTA final
- Glow verde/azul leve em fundos
- Microinteração: `transition-all duration-200` + `hover:-translate-y-1`

---

## 6. Componentes reutilizáveis

- `SectionHeader` — título + descrição + barrinha
- `PrimaryButton` / `SecondaryButton`
- `FeatureCard` — card com ícone
- `Badge` — variantes default, tech, primary
