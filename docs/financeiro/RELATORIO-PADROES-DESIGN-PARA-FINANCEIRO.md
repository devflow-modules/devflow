# Relatório — Padrões e Design para aplicar ao projeto Financeiro

Documento de referência para replicar a estrutura, padrões e design do **DevFlow** no projeto **Financeiro** (Financeiro Casa).

---

## 1. Status DevFlow (contexto)

- **Site:** 100% pronto (go-live validado)
- **WhatsApp:** Webhook verificado, testes OK, aguardando aprovação do número +55 13 99138-8591
- **Verificação empresa Meta:** Aprovada
- **Bloqueio restante:** Apenas status "Pendente" do número (nome "Em análise")

---

## 2. Stack técnica (replicar)

| Tecnologia | Versão DevFlow |
|------------|----------------|
| Next.js | 16.x |
| React | 19.x |
| TypeScript | 5 |
| Tailwind CSS | v4 |
| shadcn/ui | 4 |
| class-variance-authority | 0.7.x |
| clsx + tailwind-merge | — |
| Lucide React | ícones |

---

## 3. Estrutura de pastas

```
src/
├── app/
│   ├── layout.tsx          # Metadata, Schema.org, OG, font
│   ├── page.tsx            # Home (composição de seções)
│   ├── globals.css
│   ├── api/                # Se houver webhooks
│   ├── [pagina]/           # Páginas específicas
│   ├── blog/               # Se aplicável
│   ├── contato/
│   └── sitemap.ts, robots.ts
├── components/
│   ├── layout/             # Header, Footer, Section
│   ├── sections/           # Seções da landing (Hero, ProblemList, etc.)
│   ├── shared/             # CTAs, trackers, componentes reutilizáveis
│   ├── ui/                 # Button, Badge, FeatureCard, etc.
│   └── analytics/          # Meta Pixel (se usar ads)
├── lib/
│   ├── utils.ts            # cn()
│   ├── analytics.ts        # Tracking (se aplicar)
│   └── [dominio].ts        # Lógica de domínio
├── styles/
│   └── tokens.css          # Design tokens
└── modules/                # Módulos de domínio (opcional)
```

---

## 4. Design tokens (adaptar para Financeiro)

### Tokens base (`tokens.css`)

```css
:root {
  /* Brand Primary — trocar para cor do Financeiro */
  --financeiro-primary: #3b82f6;        /* ex: azul financeiro */
  --financeiro-primary-dark: #2563eb;
  --financeiro-primary-foreground: #ffffff;

  /* Backgrounds */
  --financeiro-bg-dark: #0f172a;
  --financeiro-bg-light: #f8fafc;
  --financeiro-bg-alt: #f1f5f9;

  /* Text */
  --financeiro-text-primary: #0f172a;
  --financeiro-text-secondary: #475569;
  --financeiro-text-muted: #64748b;

  /* Accent */
  --financeiro-accent: #38bdf8;

  /* UI */
  --financeiro-border: #cbd5e1;
  --financeiro-radius: 0.5rem;
  --financeiro-container-max: 1200px;
  --financeiro-section-padding: 6rem;
  --financeiro-shadow-card: 0 8px 30px rgba(0, 0, 0, 0.08);
}
```

### Variáveis globais (`globals.css` / `:root`)

- `--background`, `--foreground`
- `--primary`, `--primary-foreground`
- `--muted`, `--muted-foreground`
- `--border`, `--ring`, `--radius`
- Fonte: Inter (ou escolher outra para Financeiro)

---

## 5. Componente Section (padrão)

```tsx
// Section.tsx
const SECTION_CONTAINER = "mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8";

export function Section({ children, alternate, className, ...props }) {
  return (
    <section
      className={cn(
        "py-24",
        alternate && "bg-[#f1f5f9]",
        className
      )}
      {...props}
    >
      <div className={SECTION_CONTAINER}>{children}</div>
    </section>
  );
}
```

---

## 6. Seções de conversão (checklist para Financeiro)

| Seção | Função | Adaptação Financeiro |
|-------|--------|----------------------|
| **Hero** | Proposta de valor + CTA principal | Título, subtítulo, badges de prova, mockup/visual, 2 CTAs |
| **ProblemList** | Dores do segmento | Problemas financeiros (controle, imprevistos, visibilidade) |
| **AntesDepois** | Transformação | Antes vs Depois do uso do app |
| **ForWho** | Público-alvo | Perfis (pessoal, MEI, pequeno negócio) |
| **HowItWorks** | Como funciona | 3–4 passos visuais |
| **Processo3Passos** | Reduzir fricção | Entendemos → Configuramos → Você usa |
| **FeatureGrid** | Recursos | Funcionalidades do Financeiro |
| **Metrics** | Prova numérica | Números de impacto (opcional) |
| **IntegraHumano** | Objeção “perco controle?” | Não aplica igual; adaptar se houver suporte humano |
| **TechStack** | Credibilidade técnica | Stack do app (React, etc.) |
| **QuandoFazSentido** | Quando sim / não | Cenários de uso |
| **Faq** | Objeções + Schema FAQPage | Perguntas comerciais e técnicas |
| **ProofSocial** | Prova social | Testemunhos ou positioning |
| **FinalCta** | CTA fechamento | CTA principal + secundário |

---

## 7. CTAs e microcopy

### Padrões de CTA

- **Primário:** verbo de ação + benefício (ex: "Ver meu fluxo de caixa")
- **Secundário:** alternativa (ex: "Ver demonstração")
- **Contextual:** por seção (ex: FAQ → "Tirar dúvidas", Preços → "Solicitar orçamento")

### Mensagens pré-preenchidas (se usar WhatsApp)

- Hero: "Olá, quero entender o Financeiro Casa."
- Preços: "Olá, quero saber sobre planos."
- Contato: mensagem genérica

---

## 8. SEO técnico

| Item | Implementação |
|------|---------------|
| **Metadata** | title, description, keywords em cada página |
| **Open Graph** | og:title, og:description, og:image, og:url |
| **Twitter Card** | summary_large_image |
| **Canonical** | alternates.canonical em layout/páginas |
| **Schema.org** | Organization com contactPoint |
| **FAQ Schema** | FAQPage na página de FAQ |
| **robots.ts** | allow /, sitemap URL |
| **sitemap.ts** | Rotas estáticas + blog se houver |

---

## 9. Analytics e tracking

| Recurso | Uso |
|---------|-----|
| **Vercel Analytics** | Pageviews, eventos customizados |
| **Meta Pixel** | PageView, ViewContent, Contact (se tiver ads) |
| **Eventos custom** | Ex: `cta_click`, `scroll_50`, `demo_click` |
| **ScrollTracker** | Disparo em 50% de scroll |

---

## 10. Header e footer

### Header

- Logo + nav (links principais)
- CTAs: "Ver demo" + "Começar grátis" (ou equivalente)
- Sticky no scroll

### Footer

- Bloco institucional: nome, cidade/estado, CNPJ, e-mail, WhatsApp
- Links: Produto, Preços, Blog, Contato, Termos, Privacidade
- Copyright

---

## 11. Páginas recomendadas

| Rota | Conteúdo |
|------|----------|
| `/` | Landing completa |
| `/precos` | Planos, copy comercial, CTAs |
| `/contato` | Formulário + WhatsApp + e-mail |
| `/demo` ou `/app` | Acesso à aplicação ou simulador |
| `/privacidade`, `/termos`, `/cookies` | Legal |
| `/sobre` | Sobre o produto/empresa |
| `/blog` | Opcional, para SEO |

---

## 12. Checklist de aplicação no Financeiro

### Fase 1 — Base

- [ ] Next.js 16 + React 19 + Tailwind v4 + shadcn
- [ ] Estrutura de pastas (app, components, lib, styles)
- [ ] Design tokens (tokens.css) com cores do Financeiro
- [ ] Componente Section
- [ ] Layout com metadata, font, Schema.org
- [ ] Header e Footer

### Fase 2 — Landing

- [ ] Hero com proposta de valor e CTAs
- [ ] ProblemList (dores financeiras)
- [ ] AntesDepois
- [ ] ForWho (público-alvo)
- [ ] HowItWorks ou equivalente
- [ ] FeatureGrid
- [ ] FAQ com Schema FAQPage
- [ ] FinalCta
- [ ] ProofSocial (se houver)

### Fase 3 — SEO e tracking

- [ ] Metadata em todas as páginas
- [ ] OG image (1200×630)
- [ ] sitemap.ts e robots.ts
- [ ] Vercel Analytics
- [ ] Meta Pixel (se usar ads)
- [ ] Eventos de CTA e scroll

### Fase 4 — Go-live

- [ ] Variáveis de ambiente na Vercel
- [ ] Domínio + SSL
- [ ] Search Console
- [ ] Core Web Vitals (LCP < 2.5s)
- [ ] Runbook baseado em GO-LIVE-CHECKLIST.md

---

## 13. Referências no DevFlow

| Arquivo | Uso |
|---------|-----|
| `src/app/page.tsx` | Ordem e composição das seções |
| `src/components/sections/*` | Modelos de seção |
| `src/components/layout/Section.tsx` | Container padrão |
| `src/styles/tokens.css` | Tokens de design |
| `src/app/globals.css` | Variáveis e tema |
| `docs/GO-LIVE-CHECKLIST.md` | Runbook de lançamento |
| `src/lib/analytics.ts` | Padrão de tracking |

---

## 14. Diferenças esperadas (Financeiro vs DevFlow)

| Aspecto | DevFlow | Financeiro |
|---------|---------|------------|
| CTA principal | WhatsApp | App / Cadastro / Demo |
| Produto | Automação WhatsApp | Controle financeiro |
| Prova social | "Estrutura preparada para..." | Testemunhos ou métricas de uso |
| Integração | Webhook, Cloud API | — |
| Páginas de nicho | Restaurante, tabacaria, etc. | Possivelmente MEI, pessoa física, etc. |

---

*Documento gerado a partir do repositório DevFlow. Atualizar conforme evolução do projeto Financeiro.*
