# Fase 2 — Proposta visual · Fatia 1 (lista de conversas)

Data: **2026-07-28**  
Base: [Fase 1](./inbox-operational-hierarchy-phase1-2026-07-28.md)  
Escopo: **só proposta** — nenhum componente de produto alterado  
Wireframe estático: `evidence/inbox-list-row-phase2/harness.html`

## Job único da row

Permitir ao operador, em &lt;2 s de scan:

1. Quem é?  
2. O que disse por último?  
3. Precisa de mim agora?  
4. É meu / de ninguém / urgente?

Tudo o resto fica no **header** ou **painel** após seleção.

---

## Anatomia simplificada (alvo)

```
┌──────────────────────────────────────────────────────────┐
│ [AV]  Identidade                        tempo | ●unread │
│       Prefixo · prévia da última mensagem (2 linhas)     │
│       ● Estado dominante    [Responsável?]   [Assumir]   │
└──────────────────────────────────────────────────────────┘
         ▲ stripe esquerdo só se urgente / selecionada
```

| Faixa | Conteúdo | Regra |
|---|---|---|
| 1 | Avatar + identidade + horário (ou wait SLA) + unread | Sempre |
| 2 | Prefixo · prévia (`line-clamp-2`) | Sempre |
| 3 | **Um** estado operacional + responsável *condicional* + ações | Condicional |

Máximo tipográfico: **3 faixas**. Sem row CRM, sem wrap de 6 chips.

---

## Sempre visível vs revelado após seleção

| Sinal | Na lista (sempre) | Após seleção (header / painel) |
|---|---|---|
| Nome / telefone (fallback) | Sim | Telefone completo se havia nome |
| Prévia + prefixo | Sim | Histórico completo |
| Tempo relativo | Sim (default) | — |
| Wait SLA compacto | Só `awaiting_agent` **e** delay acima do limiar de alerta (≥5 min) *ou* `slaLevel` high/critical | Label SLA completo no header |
| Unread | Sim (badge) | Zera ao abrir (comportamento atual) |
| Estado operacional (1) | Sim — ver matriz abaixo | Badge + copy no header |
| Responsável nomeado | **Não** (ruído se já atribuído) | Header + painel |
| “Sem responsável” | Só se `awaiting_agent` + unassigned | Header + Assumir |
| Assumir / Fechar | Sim (handlers) | Também no header |
| Linha WhatsApp | Não | Header |
| Prioridade CRM / score / aiState | Não | Painel (+ HIGH no header se já existir) |
| Etapa comercial / FU | Não | Painel prospect |
| Fila (queue name) | Não | Header (select) |
| “Sugestão pendente” | Não | Thread / DealClose |
| ResponseAlertBadge textual | Não (substituído por wait + stripe) | Banner / header |
| Pending inbound count | Fundir com unread **ou** manter só se unread=0 e pending&gt;0 (ver invariantes) | — |
| Chip “Aguardando cliente” | Coberto pelo estado dominante | — |
| Chip duplicado “Sem responsável” | Removido (texto único) | — |

---

## Hierarquia visual (ordem de atenção)

1. **Identidade** — `text-[13px]` semibold, truncate  
2. **Prévia** — `text-[12px]` secondary, 2 linhas  
3. **Tempo / wait** — tabular, direita, muted **ou** warning/danger se SLA  
4. **Estado** — um badge/pill compacto (não uppercase stack + stripe + chip + alert)  
5. **Unread** — pill brand, só se &gt;0  
6. **Responsável** — só ausência acionável (ver abaixo)  
7. **Stripe** — reforço de urgência/seleção, não substituto de texto  

Verde brand: seleção + unread + Assumir.  
Âmbar/vermelho: **só** urgência SLA / sem dono aguardando.  
Não usar verde para “estado OK”, “aguardando”, e CTA ao mesmo tempo na mesma row.

---

## Tratamento específico

### Tempo vs SLA

| Condição | Mostrar à direita |
|---|---|
| Não `awaiting_agent` | `formatListTimeCompact(lastMessageAt)` |
| `awaiting_agent` e delay &lt; 5 min e sla low/medium/null | Tempo relativo (ainda não é exceção) |
| `awaiting_agent` e (delay ≥5 min **ou** sla high/critical) | Wait compacto (`12m`) + stripe; **sem** segundo badge “Crítico · 12m” |

SLA na lista = **exceção acionável**, não cronómetro permanente.

### Responsável

| Condição | Na lista |
|---|---|
| CLOSED | Nada |
| Atribuído a alguém | Nada (ver no header) |
| Unassigned + `awaiting_agent` | Uma linha/chip: “Sem responsável” + Assumir |
| Unassigned + `awaiting_customer` | Nada de assignee; estado “Aguardando cliente” basta |
| Unassigned + `in_progress` | Opcional “Sem responsável” (baixa prioridade) — **omitir** na fatia 1 |

### Não lidas / pendências

- Manter `unread-count-badge` quando `unreadCount > 0`.  
- `pending-inbound-badge`: **preservar no DOM** (testid) na fatia 1 se o valor &gt;0, mas **visualmente** preferir um único contador — se ambos &gt;0, mostrar só unread e manter pending em `aria-label` / title **ou** atualizar o teste unitário no mesmo PR para o modelo novo.  
- Decisão de implementação preferida: um badge numérico = `max(unread, pending)` com testid estável migrado no PR — **ITERATE** se a equipa exigir dois números.

### Estado operacional dominante (matriz)

| `conversationState` | Label único na lista | Stripe |
|---|---|---|
| `awaiting_agent` | “Precisa resposta” | Sim se SLA exceção ou sem dono |
| `in_progress` | “Em atendimento” | Não (salvo selected) |
| `awaiting_customer` | “Aguardando cliente” | Não |
| `closed` / status CLOSED | “Encerrada” ou estilo muted sem badge | Não |
| (legado sem state + needsReply) | “Precisa resposta” | Como awaiting_agent |

Remover da lista: “À espera”, “IA · aguarda cliente” como chips extras, ResponseAlertBadge, duplicata unassigned.

---

## Estados de interação

### Normal
- Fundo `df-bg-elevated`, border-b sutil  
- 3 faixas, tipografia acima  

### Hover
- Fundo `df-brand-100` leve; avatar scale ≤1.02  
- Sem novos chips  

### Foco (teclado)
- `focus-visible` ring brand no botão `conversation-item`  
- Ordem: row → Assumir → Fechar (inalterada)  

### Selecionada
- Stripe brand 4px + ring inset suave  
- Avatar brand sólido  
- Sem competir com stripe danger (danger ganha se urgente)  

### Urgente (`awaiting_agent` + SLA high/critical ou alert ≥10m)
- Stripe danger/warning  
- Wait label com cor de alerta  
- Título permanece primary (não “gritar” tipografia inteira)  

### Sem dono + precisa resposta (não crítico)
- Stripe âmbar 3px **ou** só texto “Sem responsável” — **escolher um** (proposta: texto + Assumir; stripe só se também SLA)  

---

## Desktop vs mobile

| | Desktop (aside ~260–300px) | Mobile (lista fullscreen) |
|---|---|---|
| Anatomia | Idêntica (3 faixas) | Idêntica |
| Padding | `px-2.5 py-2.5` | `px-3 py-3` (alvo ligeiramente maior) |
| Ações Assumir/Fechar | Coluna à direita | Mesma; touch target ≥40px |
| Chips | Sem wrap multi-linha de CRM | Sem wrap; estado numa linha |
| Truncate | Título e preview agressivos | Igual; preview 2 linhas |

Não introduzir layout diferente de dados entre breakpoints — só escala de toque/padding.

---

## Wireframes (prosa)

### A — Precisa resposta, com dono, sem SLA crítico

```
[JM]  João Mendes                              3m
      Cliente · Obrigado, fico no aguardo
      ○ Precisa resposta
```

### B — Precisa resposta, sem dono, wait 12m (exceção)

```
[AB]  Ana Barbosa                             12m  ← cor warning
      Cliente · Quero fechar hoje
      ○ Precisa resposta   Sem responsável   [Assumir]
      ║ stripe warning
```

### C — Aguardando cliente

```
[CR]  Carlos Rua                               1h
      Você · Enviámos a proposta
      ○ Aguardando cliente
```

### D — Selecionada + unread

```
[MR]  Maria Reis                          agora  ●2
      Cliente · Posso ligar amanhã?
      ○ Precisa resposta
      ║ stripe brand
```

### E — Encerrada

```
[LP]  Loja Porto                              2d
      Você · Encerrámos o atendimento
      (muted; sem ações)
```

### F — Mobile (390×844), mesma anatomia B

Lista edge-to-edge; row com hit area maior; Assumir ≥40px de altura.

---

## Before / after (comparação)

| Aspeto | Before | After |
|---|---|---|
| Faixas verticais | 5–7 + chips | 3 |
| Estados/chips operacionais | Badge + alert + À espera + Aguardando + Sem dono | 1 estado (+ Sem responsável se preciso) |
| CRM na lista | Prioridade + hint + score + ai + FU + etapa | 0 |
| Linha / fila | Badges na row | Header |
| SLA | Wait + alert textual + stripe + rank | Wait + stripe só em exceção |
| Responsável atribuído | Sempre “Responsável: Nome” | Só no header |
| Scan time (hipótese) | Alto | Menor — validar na Fase 4 |

---

## Justificativa de remoções / reposicionamentos

| Elemento removido da lista | Porquê | Para onde vai |
|---|---|---|
| Prioridade CRM + guidance | Repete painel; raramente muda a ordem de abertura (já há sort SLA) | `LeadDataPanel` / header HIGH |
| Score pts | Sem decisão na fila; “0/100” é ruído | Painel |
| aiState | Técnico; não é próxima ação | Painel |
| Etapa / FU | Comercial interno; gated | Painel prospect |
| Badge linha WhatsApp | Multi-linha é filtro, não scan de mensagem | Header + filtro existente |
| Queue chip | Edição/contexto no header | Header |
| Sugestão pendente | Ação de gestor no thread | Deal UI |
| ResponseAlertBadge | Duplica wait + stripe | — |
| “Responsável: Nome” | Não muda prioridade de abertura se já atribuído | Header |
| Chip unassigned duplicado | Mesma info que linha Sem responsável | Uma representação |
| “IA · aguarda cliente” | Coberto por estado “Aguardando cliente” | Prefixo da prévia já diz “IA” |

| Elemento mantido | Porquê |
|---|---|
| Identidade + avatar | Scan #1 |
| Prévia + prefixo | Scan #2 |
| Tempo / wait | Scan #3 / urgência |
| Um estado | Scan #3 |
| Unread | Novidade |
| Sem responsável + Assumir | Exceção acionável |
| Fechar | Handler existente; densidade baixa |
| Stripe selected/urgent | Hierarquia sem texto extra |

---

## Invariantes preservadas

| Invariante | Como |
|---|---|
| Seleção | `onSelect` + `data-testid="conversation-item"` + `data-thread-id` |
| Filtros / grupos / sort | Fora do slice (`ConversationsList` intacto) |
| Contadores unread | Badge permanece |
| Contadores pending | Preservar comportamento de teste **ou** migrar asserção no mesmo PR |
| Acessibilidade | Botão com nome = identidade; `focus-visible`; estado não só por cor (label + stripe) |
| Handlers Assumir/Fechar | Mesmos callbacks / testids `action-assume` / `action-close` |
| Contrato API | `WaInboxThreadRow` inalterado |
| Multitenancy / prospect gate | Sem ligar UI interna a white-label |
| Empty state KEEP | Intocado |

Testes a re-correr na implementação: `inboxUi.test.tsx`, e2e lista mobile se ambiente permitir.

---

## Fora de escopo (fatia 1)

- Redesign de `ConversationsList` chrome (filtros, alertas agregados sticky)  
- Header, banner, editor, painel  
- Mudança de copy de negócio / thresholds SLA no backend  
- Tokens globais fora de classes da row  

---

## Decisão da proposta

**`PROCEED`**

Direção alinhada à Fase 1 e ao job do operador; remoções justificadas por repetição já coberta em header/painel; invariantes preserváveis com diff mínimo em `ConversationItem` (+ ajuste pontual de teste do pending badge).

Critérios:

- **PROCEED** — anatomia clara, risco controlado, pronto para implementação ← **aplicado**  
- **ITERATE** — se a equipa exigir pending e unread como dois badges visíveis, ou responsável nomeado sempre na lista  
- **BLOCK** — se produto exigir CRM/score na fila como regra operacional (conflito com Phase 1)

---

## Gate humano

Antes de qualquer PR de código:

- [ ] Aprovar anatomia de 3 faixas  
- [ ] Aprovar regra “responsável só se sem dono + precisa resposta”  
- [ ] Aprovar SLA só como exceção (≥5 min / high / critical)  
- [ ] Escolher política pending vs unread (fundir vs dois badges)  
- [ ] Confirmar **PROCEED** ou pedir **ITERATE**  

Após aprovação → Fase 3 fatia 1 (PR isolada) → Fase 4 evidência before/after.
