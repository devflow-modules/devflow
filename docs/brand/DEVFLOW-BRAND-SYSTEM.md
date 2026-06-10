# DevFlow Labs — Sistema visual (Brand System)

Documentação oficial da identidade visual do portal **devflowlabs.com.br** e páginas relacionadas no monorepo. Use este guia ao criar ou revisar interfaces, componentes reutilizáveis e copy de conversão.

**Fonte de verdade dos tokens:** [`src/styles/tokens.css`](../../src/styles/tokens.css)  
**Utilities CSS:** [`src/app/globals.css`](../../src/app/globals.css) (classes `.df-*`)  
**Complemento (logo, tipografia, naming):** [DEVFLOW_BRAND_GUIDELINES.md](./DEVFLOW_BRAND_GUIDELINES.md)  
**Produto operacional (inbox, admin, densidade, estados):** [DEVFLOW-PRODUCT-UI-SYSTEM.md](./DEVFLOW-PRODUCT-UI-SYSTEM.md)

---

## 1. Visão da marca visual

A DevFlow Labs se posiciona como **SaaS operacional premium** para **WhatsApp Platform**: atendimento e vendas no WhatsApp com IA no repetitivo, inbox multiatendente, handoff humano, SLA, fila priorizada e dashboard operacional.

A interface deve transmitir:

| Atributo | Como aparece na UI |
|----------|-------------------|
| Operação em tempo real | Filas, status, badges LIVE, métricas de painel |
| Tecnologia confiável | Base escura consistente, hierarquia clara, sem “efeito startup genérico” |
| WhatsApp / IA | Verde de ação contido; bot vs humano distinguível |
| Dashboard / cockpit | Cards em camadas, dados operacionais, estados semânticos |
| Premium técnico | Superfícies escuras refinadas, sombras neutras, glow verde só em CTA |
| Clareza de conversão | Um CTA primário por dobra; funil legível |

### Princípios visuais

1. **Fundo escuro premium** — não cinza Tailwind genérico; usar `--devflow-background` e variações de surface.
2. **Verde tecnológico (`#00d084`)** — associado a **ação**, **conversão**, **WhatsApp ativo** e **status online**; nunca como tinta de fundo dominante.
3. **Superfícies operacionais em camadas** — background → surface → surface elevated; profundidade sutil.
4. **Texto claro de alta legibilidade** — gelo (`#f7f9f8`) no principal; cinza-esverdeado no secundário.
5. **Cores semânticas só para estados reais** — success/warning/danger/info quando há significado operacional; não como decoração.

---

## 2. Paleta oficial

Tokens definidos em `src/styles/tokens.css`:

```css
--devflow-background: #030607;
--devflow-surface: #07100f;
--devflow-surface-elevated: #0b1715;
--devflow-brand: #00d084;
--devflow-brand-hover: #00a86b;
--devflow-text-primary: #f7f9f8;
--devflow-text-secondary: #a8b3af;
--devflow-text-muted: #74807b;
--devflow-border-brand: rgba(0, 208, 132, 0.14);
--devflow-brand-soft: rgba(0, 208, 132, 0.12);

--devflow-danger: #ff5d5d;
--devflow-danger-soft: rgba(255, 93, 93, 0.14);
--devflow-warning: #f6c453;
--devflow-warning-soft: rgba(246, 196, 83, 0.16);
--devflow-success: #1ed786;
--devflow-success-soft: rgba(30, 215, 134, 0.16);
--devflow-info: #4ab8ff;
--devflow-info-soft: rgba(74, 184, 255, 0.16);
```

### 2.1 Base e superfícies

| Token | Valor | Quando usar | Quando evitar | Papel |
|-------|-------|-------------|---------------|-------|
| `--devflow-background` | `#030607` | `<body>`, páginas full-bleed, hero | Cards isolados sem borda | Canvas principal (~80% da tela) |
| `--devflow-surface` | `#07100f` | Seções alternadas, cards padrão | CTA primário, status | Camada operacional base |
| `--devflow-surface-elevated` | `#0b1715` | Cards destacados, mocks de painel, modais, dropdowns | Fundo de página inteira | Elevação / foco |
| `--devflow-border-brand` | `rgba(0,208,132,0.14)` | Bordas de cards, separadores sutis | Bordas de erro/alerta (usar semântica) | Estrutura sem gritar verde |
| `--devflow-brand-soft` | `rgba(0,208,132,0.12)` | Fundo de badge LIVE, plano recomendado, highlight leve | Blocos grandes de conteúdo | Destaque contido |

**Utilities:** `.df-surface`, `.df-surface-elevated`, `.df-border-brand`

### 2.2 Marca e ação

| Token | Valor | Quando usar | Quando evitar | Papel |
|-------|-------|-------------|---------------|-------|
| `--devflow-brand` | `#00d084` | CTA primário, links críticos, status online, ícones de ação | Texto de parágrafo longo, fundos amplos | Cor de conversão e energia |
| `--devflow-brand-hover` | `#00a86b` | Hover de `.df-btn-primary` | Hover de links secundários neutros | Feedback de interação |

**Utilities:** `.df-status-brand`, `.df-bg-brand-soft`, `.df-dot-brand`

### 2.3 Tipografia (cor)

| Token | Valor | Quando usar | Quando evitar | Papel |
|-------|-------|-------------|---------------|-------|
| `--devflow-text-primary` | `#f7f9f8` | Títulos, labels importantes, corpo principal | Metadados, timestamps | Leitura principal |
| `--devflow-text-secondary` | `#a8b3af` | Subtítulos comerciais, descrições, bullets | Headlines | Hierarquia média |
| `--devflow-text-muted` | `#74807b` | Legendas, hints, timestamps não críticos | CTAs, alertas, copy de conversão | Baixa prioridade |

**Utilities:** `.df-text-primary`, `.df-text-secondary`, `.df-text-muted`

> **Contraste:** não usar `muted` em informação que o usuário precisa decidir (preço, SLA, erro, CTA secundário importante).

### 2.4 Semântica operacional (feedback)

| Token | Par sólido + soft | Quando usar | Quando evitar |
|-------|-------------------|-------------|---------------|
| Success | `--devflow-success` / `--devflow-success-soft` | Resolvido pelo bot, online, fluxo concluído | Decorar card genérico |
| Warning | `--devflow-warning` / `--devflow-warning-soft` | SLA em risco, handoff humano, prioridade | “Destaque bonito” sem estado |
| Danger | `--devflow-danger` / `--devflow-danger-soft` | Erro, falha, atraso crítico, bloco “problema” | Marketing agressivo |
| Info | `--devflow-info` / `--devflow-info-soft` | Métrica neutra, etapa, dado auxiliar | Substituir brand em CTA |

**Utilities:** `.df-status-{success|warning|danger|info|brand}`, `.df-bg-{success|warning|danger|info|brand}-soft`, `.df-dot-{success|warning|danger|info|brand}`

---

## 3. Regra visual 80 / 15 / 5

Proporção alvo em qualquer viewport:

```
┌─────────────────────────────────────────┐
│  ~80%  Base escura / neutra             │  background, surface, áreas de respiro
│  ~15%  Estrutura + texto                │  cards, bordas, primary/secondary copy
│  ~5%   Verde de ação e destaque         │  CTA, LIVE, status, pontos operacionais
└─────────────────────────────────────────┘
```

### Implicações práticas

- A home e páginas de produto **não** devem parecer “floresta verde”.
- Um bloco com fundo `brand-soft` por seção costuma ser suficiente.
- Mocks de dashboard usam **majoritariamente** surface + texto; verde/info/warning/danger só nos **estados** (fila, SLA, handoff).
- Ecossistema secundário (Financeiro, ferramentas) usa **neutros**; verde reservado à WhatsApp Platform.

---

## 4. Semântica operacional

Use cores com **significado de produto**, alinhado ao cockpit WhatsApp:

| Família | Significado | Exemplos na UI |
|---------|-------------|----------------|
| **Brand** | Ação principal, WhatsApp ativo, conversão, online/LIVE | CTA “Agendar diagnóstico”, badge LIVE, dot “bot respondeu” |
| **Success** | Resolvido, concluído, performance positiva | “Resolvido pelo bot”, check de solução, TMR bom |
| **Warning** | Atenção, handoff, SLA em risco, fila quente | Handoff → Ana, “2 SLA no limite”, aguardando humano |
| **Danger** | Erro, falha, atraso crítico | SLA estourado, bloco “problema”, falha de integração |
| **Info** | Métrica neutra, etapa, contexto auxiliar | “Bot resolve 74%”, etapa de triagem IA |
| **Muted** | Metadado, timestamp, nota legal | “Última atualização há 3s”, rodapé de transparência |

### Brand vs success

- **Brand (`#00d084`)** → ação humana do usuário ou estado “ativo/agora” comercial.
- **Success (`#1ed786`)** → resultado operacional positivo já ocorrido (resolvido, concluído).

Não misturar: dois verdes competindo no mesmo chip confunde leitura.

---

## 5. Regras de CTA

### Hierarquia

| Tipo | Objetivo | Classes | Sombra |
|------|----------|---------|--------|
| **Primário** | Diagnóstico / conversão principal | `.df-btn-primary` | `.df-shadow-cta` |
| **Secundário** | Demo, produto, navegação de apoio | `.df-btn-secondary` | nenhuma (ou sombra neutra no card) |
| **WhatsApp** | Contato rápido, briefing | variant do `WhatsAppCta` | secundário ou brand contido |

### Regras

1. **Um CTA primário verde por dobra** — se houver demo + diagnóstico, diagnóstico é primário; demo é secundário.
2. **WhatsApp não compete com primário** — na mesma linha: primário sólido; WhatsApp outline/secondary.
3. **Hover** — primário usa `--devflow-brand-hover` via `.df-btn-primary:hover` (não `#16a34a` nem `brightness()`).
4. **Glow verde** — só em CTA primário (`.df-shadow-cta` ou `.df-shadow-cta-soft` em headers compactos).
5. **Copy alinhada** — primário = “Agendar diagnóstico”; demo = “Ver demo” / “Ver demo guiada”.

### Funil de referência

```
Home → Demo → Diagnóstico (/contato)
```

Links internos devem reforçar esse caminho quando a intenção for avaliação comercial.

---

## 6. Componentes e utilities

Implementação em `src/app/globals.css`. Preferir classes `.df-*` a cores Tailwind soltas.

### Botões

| Classe | Uso |
|--------|-----|
| `.df-btn-primary` | Conversão principal; fundo `--devflow-brand` |
| `.df-btn-secondary` | Ações de apoio; fundo surface + borda brand sutil |

Variantes auxiliares (casos específicos): `.df-btn-secondary-light`, `.df-btn-ghost`, `.df-btn-disabled`.

### Superfícies

| Classe | Uso |
|--------|-----|
| `.df-surface` | Card/seção padrão (`--devflow-surface`) |
| `.df-surface-elevated` | Painéis, mocks operacionais, cards de destaque |

### Texto

| Classe | Uso |
|--------|-----|
| `.df-text-primary` | Headings e corpo principal |
| `.df-text-secondary` | Descrições comerciais, subtítulos |
| `.df-text-muted` | Legendas não críticas |

### Status (texto)

| Classe | Uso |
|--------|-----|
| `.df-status-brand` | Ação, LIVE, links de produto |
| `.df-status-success` | Resolvido, online operacional |
| `.df-status-warning` | SLA, handoff, prioridade |
| `.df-status-danger` | Erro, crítico |
| `.df-status-info` | Métrica neutra, etapa |

### Fundos soft (badges, chips, linhas de fila)

| Classe | Uso |
|--------|-----|
| `.df-bg-brand-soft` | Highlight comercial contido |
| `.df-bg-success-soft` | Chip “resolvido” |
| `.df-bg-warning-soft` | Chip handoff / SLA |
| `.df-bg-danger-soft` | Chip erro / problema |
| `.df-bg-info-soft` | Chip informativo |

### Indicadores pontuais

| Classe | Uso |
|--------|-----|
| `.df-dot-brand` | Status ativo / bot |
| `.df-dot-success` | Online / OK |
| `.df-dot-warning` | Atenção |
| `.df-dot-danger` | Crítico |
| `.df-dot-info` | Neutro / aguardando fila |

### Sombras de CTA

| Classe | Uso |
|--------|-----|
| `.df-shadow-cta` | Glow principal `rgba(0, 208, 132, 0.35)` — hero, fechamento |
| `.df-shadow-cta-soft` | Glow menor — header, cards secundários |

**Proibido:** sombras legadas `rgba(22,163,74,...)` e `rgba(34,197,94,...)` (paleta Tailwind emerald antiga).

### Sombras de card (não-CTA)

Preferir sombras **neutras escuras**, ex.: `shadow-[0_18px_50px_-24px_rgba(0,0,0,0.28)]` ou tokens `--devflow-shadow-card` em `tokens.css`.

---

## 7. Do’s and Don’ts

### Do

- Usar tokens `--devflow-*` ou utilities `.df-*`.
- Usar verde **só** para ação, conversão e status com significado.
- Usar **warning** para SLA em risco e handoff humano.
- Manter cards em **superfície escura** (`df-surface` / `df-surface-elevated`).
- Alinhar copy e visual à **operação WhatsApp** (fila, inbox, dashboard).
- Deixar claro quando a página é **ecossistema secundário** (Financeiro, CNPJ, Divisão).
- Usar prova social **real ou qualitativa** (“antes → depois”, transparência em cases).

### Don’t

- Usar `emerald-*`, `green-*`, `sky-*`, `orange-*`, `red-*` do Tailwind como **decoração** sem semântica.
- Usar sombras antigas verdes hardcoded (`rgba(22,163,74,...)`).
- Usar `text-white` / branco puro em excesso — preferir `--devflow-text-primary`.
- Transformar a home em **hub genérico** de ferramentas (WhatsApp Platform permanece protagonista).
- Exibir **números mock** como prova social (“+500 clientes”, “1.247 msg” como case real).
- Prometer que **IA resolve tudo** sem handoff humano — copy deve refletir “IA no repetitivo, humano no que importa”.
- Colocar **dois botões verdes** competindo na mesma dobra.
- Usar `--devflow-text-muted` em textos de decisão (preço, risco, CTA).

### Exemplos rápidos

| Situação | Correto | Incorreto |
|----------|---------|-----------|
| SLA em risco no mock | `.df-status-warning` + `.df-bg-warning-soft` | `text-orange-600` decorativo |
| CTA hero | `.df-btn-primary.df-shadow-cta` | `bg-primary shadow-[0_14px_40px_-6px_rgba(22,163,74,0.45)]` |
| Card Financeiro (ecossistema) | `.df-surface` + ícone neutro | Card verde igual ao produto principal |
| Badge LIVE | `.df-bg-brand-soft` + `.df-status-brand` | `bg-emerald-500/15 text-emerald-400` |

---

## 8. Checklist antes de criar nova página

Antes de abrir PR de UI/copy pública, confirme:

- [ ] A página reforça **WhatsApp Platform** ou deixa explícito que é **ecossistema secundário**?
- [ ] Existe **um único CTA primário** verde por dobra principal?
- [ ] O verde está **contido** (regra 80/15/5)?
- [ ] Cores success/warning/danger/info aparecem só com **estado operacional real**?
- [ ] Layout **mobile-first** (CTAs empilhados, mocks legíveis)?
- [ ] Títulos em `df-text-primary`; descrições em `df-text-secondary`; muted só em metadados?
- [ ] **Sem números mock** vendidos como prova social ou case autêntico?
- [ ] Links de conversão seguem **Home → Demo → Diagnóstico** quando aplicável?
- [ ] Nenhuma sombra `rgba(22,163,74,...)` ou hover `#16a34a`?
- [ ] Tracking/analytics preservado (sem remover eventos de funil existentes)?

---

## 9. Escopo atual

### Funil principal (GTM público)

```
Home (/) → Demo (/demo) → Diagnóstico (/contato)
```

- **Protagonista:** WhatsApp Platform — inbox, IA no repetitivo, handoff, SLA, fila, dashboard.
- **CTA primário padrão:** “Agendar diagnóstico” → `/contato`.
- **CTA de prova:** “Ver demo” / “Ver demo guiada” → `/demo`.

### Ecossistema complementar (secundário)

Tratar visualmente com **menos verde** e tom de apoio:

| Área | Rotas / exemplos |
|------|------------------|
| Ferramentas | `/ferramentas`, divisão de contas, consulta CNPJ |
| Financeiro | `/ferramentas/financeiro`, app `apps/financeiro` |
| Cases / projetos | `/cases`, `/projetos` — autoridade e transparência, não competir com hero da Platform |
| Hub produtos | `/produtos` — WhatsApp em destaque; demais módulos neutros |
| Preços | `/precos` — plano recomendado com brand contido |

### O que não muda sem revisão explícita

- Posicionamento principal WhatsApp Platform.
- Funil Home → Demo → Diagnóstico.
- Tokens em `src/styles/tokens.css` (alterações exigem atualizar este doc).
- Boundaries do monorepo (apps não importam outros apps).

---

## Referências no repositório

| Recurso | Caminho |
|---------|---------|
| Tokens CSS | `src/styles/tokens.css` |
| Utilities `.df-*` | `src/app/globals.css` |
| Copy de conversão | `src/lib/conversion-copy.ts` |
| Guidelines (logo, naming) | `docs/brand/DEVFLOW_BRAND_GUIDELINES.md` |
| GTM / playbook | `docs/GO-TO-MARKET.md` |
| Paridade portal ↔ app WhatsApp | `docs/architecture/WHATSAPP_PORTAL_APP_PARITY.md` |

---

*Última revisão alinhada à identidade visual aplicada no portal (home, demo, contato, WhatsApp Platform, páginas secundárias).*
