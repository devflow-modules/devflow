# Proposta visual — Fatia 2 · ChatHeader

Data: **2026-07-28**  
Base: [Fase 1 auditoria](./inbox-chat-header-phase1-2026-07-28.md)  
Escopo: **proposta apenas** — nenhum componente alterado  
Padrão: mesmo protocolo da lista (#163)

## 1. Resumo executivo

Após densificar a lista, o cabeçalho permanece um segundo “relatório”: chips de status duplicados, prioridade, linha, fila, tags, notas, histórico e menus na mesma faixa que a ação dominante **Assumir**.

**Proposta:** chrome em duas zonas — (A) identidade + estado + responsável + SLA-exceção + Assumir; (B) ações de ciclo (Encerrar/Reabrir) + menu Responsável + **Mais** (Estado, Tags, Notas, Histórico, Linha, Fila).

**Decisão recomendada:** `PROCEED`  
(com 3 `BLOCKED_BY_PRODUCT_DECISION` explícitos na auditoria).

## 2. Job único

Em &lt;2 s após abrir a conversa:

1. Com quem estou falando?  
2. Qual é o estado operacional?  
3. Quem é o responsável?  
4. Existe risco de SLA?  
5. Qual é a próxima ação principal? → **Assumir** quando `canAssume`

## 3. Anatomia proposta

### Zona A — leitura + ação dominante

```
[← mob] [AV]  Nome do contacto              [ Assumir ]*
              +55… / telefone
              ○ Precisa resposta   ·  SLA crítico · 12m   (só exceção)
              Responsável: Ana  |  Sem responsável — precisa resposta
```

\* Assumir: `variant=primary`, ring de urgência se `awaiting_agent`; ausente se já atribuída.

### Zona B — ciclo + overflow

```
[ Encerrar | Reabrir ]   [ Responsável ▾ ]   [ Mais ▾ ]
```

**Mais** (dropdown / sheet):

- Estado da thread (OPEN / PENDING / CLOSED)  
- Tags (+/−)  
- Notas  
- Histórico  
- Linha (texto)  
- Fila (select + upgrade prompt)

### Removido / demovido da superfície permanente

| Elemento | Destino |
|---|---|
| Chip Aberta/Pendente/Fechada | Menu Estado em Mais (ou só badge operacional) |
| Prioridade alta | Banner já cobre HIGH wait |
| Linha WhatsApp sempre visível | Mais |
| Select Fila sempre visível | Mais (**BLOCK** se ops exigir sempre) |
| Tags inline + “+ Tag” | Mais |
| Notas / Histórico pills | Mais |
| `AgentStatusBadge` | Fora do header da thread (**BLOCK** — shell?) |
| Nota longa `assigneeCopy.note` | Painel / omitir na 1ª linha |

## 4. Hierarquia visual

1. Nome  
2. Assumir (quando aplicável) — único CTA primary  
3. Estado operacional  
4. Responsável curto  
5. SLA excepcional  
6. Encerrar (secondary)  
7. Menus compactos  

Tokens: `df-inbox-header`, `df-inbox-toolbar-btn*`, `df-focus-brand`, badges existentes — sem paleta nova.

## 5. Estados

| Estado | Comportamento |
|---|---|
| Unassigned + awaiting_agent | Assumir dominante + copy “Sem responsável…” + SLA se exceção |
| Assigned a mim | Sem Assumir; Liberar em menu Responsável; Encerrar visível |
| Assigned a outro (agent) | Readonly assignee; sem Liberar |
| Manager + assigned outro | Menu + Liberar |
| CLOSED | Reabrir; sem Assumir |
| compactChrome / mobile | Mesma anatomia; Assumir label “Assumir”; Voltar visível |
| Foco teclado | Ordem: Voltar → Assumir → Encerrar → Responsável → Mais |

## 6. SLA (alinhamento com lista)

**Proposta default:** no header, mostrar chip SLA quando:

- `awaiting_agent` ∧ `responseDelayMs` ∧ (`getResponseAlertLevel` ≠ none ∨ `slaLevel` ∈ {high, critical})

Caso contrário omitir “SLA OK / médio”.  
**BLOCK:** se produto quiser wait sempre na conversa aberta.

## 7. Wireframes

### A — Sem dono, precisa resposta, SLA 12m

```
[AV] Ana Barbosa                         [Assumir]
     5511…
     ○ Precisa resposta  ·  Crítico · 12 min
     Sem responsável — precisa de resposta humana
     ────────────────────────────────
     [Encerrar]  [Responsável ▾]  [Mais ▾]
```

### B — Com dono, sem SLA crítico

```
[AV] João Mendes
     5511…
     ○ Em atendimento
     Responsável: Você
     ────────────────────────────────
     [Encerrar]  [Você ▾]  [Mais ▾]
```

### C — Encerrada

```
[AV] Loja Porto
     5511…
     ○ Encerrada
     Responsável: —
     ────────────────────────────────
     [Reabrir]  [Mais ▾]
```

## 8. Invariantes

- Permissões `canAssume` / `canRelease` / `canChangeAssignee` / `canClose` / `canReopen` intactas  
- Handlers `assignConversation` / `updateConversationStatus` / tags / queue intactos  
- Testids de assignment/status/SLA/tags/notes preservados (triggers podem mudar de sítio, não de id)  
- Multitenancy via APIs existentes  
- Teclado + `df-focus-brand`  
- Sem mudança em editor / mensagens / painel  

## 9. Critérios de aceite (futura PR)

1. Assumir é o único primary visível quando aplicável.  
2. ≤1 faixa de chips permanentes (estado ± SLA exceção).  
3. Tags/Notas/Histórico/Linha/Fila não competem na primeira viewport do header.  
4. Encerrar/Reabrir permanecem alcançáveis sem abrir Mais (ou documentar exceção aprovada).  
5. Suites `ChatHeader.assignment` + `status` + inboxUi header verdes.  
6. Diff só `ChatHeader` (+ CSS + testes header).  

## 10. Plano de evidência

Before/after: unassigned+SLA, assigned, CLOSED, mobile com Voltar, Tab→Assumir.  
Gate: KEEP / ITERATE / ROLLBACK / BLOCK.

## 11. Escopo PR futura

`experiment(whatsapp): densify inbox chat header`  
Ficheiros: `ChatHeader.tsx`, CSS header se preciso, testes ChatHeader/inboxUi header.

## 12. Decisão

**`PROCEED`** — direção alinhada à Fatia 1; Assumir dominante; overflow em Mais; bloqueios explícitos.

Gate humano antes do código:

- [ ] Anatomia Zona A / B  
- [ ] Política SLA no header (exceção vs sempre)  
- [ ] Fila sempre vs Mais  
- [ ] Destino do `AgentStatusBadge`  
- [ ] Encerrar sempre na Zona B (não só em Mais)  
- [ ] Confirmar PROCEED / ITERATE / BLOCK  

Nota: banner permanece fora do escopo desta fatia; a proposta evita duplicar HIGH/SLA com ele.
