# Playbook — CRM leve de prospecção (Inbox)

Documento operacional para usar o CRM de prospecção já existente na WhatsApp Platform. Os dados ficam em **`leadData.prospect`** (campo JSON `lead_data` no thread da inbox), **sem migração de schema**.

**Público:** equipa DevFlow que opera canal de prospecção (`platform_admin` com CRM ativo).

---

## 1. O que é e quando usar

- É um CRM **acoplado à conversa**: cada registro vivo coincide com uma **thread** na Inbox quando há mensagens no WhatsApp.
- Use assim que houver **resposta útil do lead** (ou assim que a thread existir e fizer sentido marcar contexto).
- **Não** mantenha por semanas um controlo paralelo só em planilha quando o lead já está na Inbox — o sistema operacional é **`leadData.prospect`** + **`DevFlowProspectPanel`**.

Planeamento de lista fria / briefing antes do primeiro contacto pode viver num doc de campanha (ex.: [`MANUAL_OUTREACH_20_LEADS.md`](./MANUAL_OUTREACH_20_LEADS.md)); ao primeiro contacto efectivo na plataforma, **normalize no CRM**.

---

## 2. Modelo de dados (referência de código)

| Conceito | Onde está definido |
|----------|---------------------|
| Tipo `LeadData` + `prospect?: ProspectData` | `apps/whatsapp-platform/src/modules/inbox/leadCrm.ts` |
| `ProspectData`, funil, origens, merge | `apps/whatsapp-platform/src/modules/inbox/prospectSales.ts` |
| Persistência do patch | `apps/whatsapp-platform/src/modules/inbox/waInboxProspectService.ts` |

Campos suportados em **`ProspectData`**:

| Campo (JSON) | Descrição | Observações |
|--------------|-----------|-------------|
| `companyName` | Nome da empresa | Texto curto |
| `niche` | Segmento (ex.: estética, imobiliária) | Livre |
| `city` | Cidade | Livre |
| `source` | Origem | Enum restrito (ver §4) |
| `salesStage` | Etapa comercial | Enum restrito (ver §3) |
| `nextFollowUpAt` | Próximo follow-up | ISO 8601 (string) |
| `nextStep` | Próximo passo humano-legível | Ex.: “Enviar landing”, “Call segunda” |
| `pain` | Dor / contexto | Texto |
| `attendantsCount` | Quantidade de atendentes | Texto (aceita número no texto; usado também para scoring auxiliar) |
| `estimatedVolume` | Volume estimado | Texto (conversas/dia, etc.) |
| `proposalValue` | Valor da proposta | Número (API/UI enviam número; ajuda reporting interno) |

---

## 3. Funil comercial (`salesStage`)

Valores canónicos (código):

| Código | Rótulo (UI PT) |
|--------|----------------|
| `NEW` | Novo lead |
| `CONTACTED` | Contato feito |
| `REPLIED` | Respondeu |
| `DIAGNOSIS_SCHEDULED` | Diagnóstico agendado |
| `DIAGNOSIS_DONE` | Diagnóstico feito |
| `PROPOSAL_SENT` | Proposta enviada |
| `WON` | Fechado |
| `LOST` | Perdido |
| `NURTURE` | Nutrição |

Fluxo típico outbound manual qualificado:

`NEW` → `CONTACTED` → `REPLIED` → `DIAGNOSIS_SCHEDULED` → (`DIAGNOSIS_DONE`) → `PROPOSAL_SENT` → `WON` | `LOST` | `NURTURE`

Ajuste `DIAGNOSIS_DONE` e `REPLIED` conforme rigor interno; o importante é **nunca deixar** conversas activas sem `nextFollowUpAt` ou `nextStep` quando há próximo compromisso.

---

## 4. Origens (`source`)

Valores aceites pela API (e pelo painel):

| Valor API | Rótulo PT |
|-----------|-----------|
| `instagram` | Instagram |
| `maps` | Google Maps |
| `linkedin` | LinkedIn |
| `referral` | Indicação |
| `website` | Site |

Se “combinação” de fontes fizer sentido, registar na **`pain`** ou **`nextStep`**.

---

## 5. Interface — `DevFlowProspectPanel`

Componente: `apps/whatsapp-platform/src/components/inbox/DevFlowProspectPanel.tsx`.

Na conversa seleccionada, o painel mostra:

- Etapa (badge + legenda PT)
- Origem
- Próximo passo
- Próximo follow-up (formatado)
- Valor da proposta (BRL)

Formulário **Editar dados** para todos os campos acima.

**Templates:** mensagens pré‑definidas para copiar (`PROSPECT_MESSAGE_TEMPLATES`).

**Ações rápidas:**

| Botão | Efeito |
|-------|--------|
| Contato feito | `salesStage = CONTACTED` |
| Diagnóstico agendado | `salesStage = DIAGNOSIS_SCHEDULED`, `nextStep = "Diagnóstico agendado"` |
| Proposta enviada | `salesStage = PROPOSAL_SENT` |
| Fechado | `salesStage = WON` |
| Perdido | `salesStage = LOST` |
| Agendar follow-up | Define `nextFollowUpAt` para amanhã 09:00 (hora local do browser) |

Completar **`REPLIED`**, **`DIAGNOSIS_DONE`** e **`NURTURE`** pelo formulário ou extensão futura de botões, conforme processo interno.

---

## 6. API — atualizar prospect

- **Método e rota:** `PATCH /api/inbox/conversations/[id]/prospect`
- **Auth:** obrigatória; body validado com **Zod** (`strict`).
- **Corpo:** subconjunto dos campos listados em §2 (espelha `bodySchema` na route).

Módulo de serviço grava apenas **`leadData.prospect`**, preservando o resto de `lead_data`.

---

## 7. Quem pode usar (governança)

Implementação em `apps/whatsapp-platform/src/lib/devflowProspecting.ts`:

- Apenas **`platform_admin`** vê e usa o CRM de prospecção (UI + API).
- **`NEXT_PUBLIC_DEVFLOW_PROSPECTING_ENABLED`** pode desligar mesmo para admin (`false` / `0` / `no` / `off`).

Operadores e gestores de tenants **não** são o alvo deste painel na configuração actual — é uso **interno DevFlow** na prospecção própria.

---

## 8. Como preencher na prática (checklist por conversa)

Quando o lead **respondeu** no WhatsApp e a thread está na Inbox (idealmente pelo **canal de prospecção**):

| Campo CRM | Como preencher |
|-----------|----------------|
| Empresa | Nome tratável da empresa ou marca |
| Nicho | Vertical curta (clínica, estética, etc.) |
| Cidade | Localização principal do negócio |
| Origem | Seleccionar enum mais próximo da descoberta |
| Etapa | Avançar conforme §3 |
| Dor / contexto | Frase que o lead disse ou problema inferido na call |
| Atendentes | Número aproximado (“3”, “5–8”) |
| Volume estimado | Ex.: “~40 conversas/dia” |
| Próximo passo | Uma linha acçãoável |
| Follow-up | Data/hora real do próximo toque |
| Valor proposta | Depois de valor formal enviado (se aplicável) |

---

## 9. Métricas internas

Existe endpoint **`GET /api/inbox/prospect-metrics`** (mesmo guard `isDevFlowProspectingEnabled`) para acompanhar funil agregado — útil em retrospectivas de campanha.

---

## 10. Relação com campanhas outbound

1. **Lista / ICP / mensagens:** podem começar num doc curto (ex.: [`MANUAL_OUTREACH_20_LEADS.md`](./MANUAL_OUTREACH_20_LEADS.md)).
2. **Operação:** assim que houver thread activa, **o CRM na Inbox é a fonte de verdade**.
3. **Importação em massa** de leads sem conversa não faz parte deste playbook — sprint futura se fizer sentido.

---

## 11. Alterações futuras (fora deste doc)

- Pipeline para criar threads sem primeiro inbound orgânico.
- Papéis adicionais autorizados ao painel (avaliar com segurança multi‑tenant).
