# Campanha manual — ~20 leads (oferta multi-canal)

Documento de **planeamento e controlo leve** para uma campanha outbound manual qualificada. **Não substitui** o CRM da Inbox — apenas organiza o trabalho **antes** e **entre** contactos.

Operação canónica após resposta no WhatsApp: **`leadData.prospect`** + **`DevFlowProspectPanel`** — ver [`PROSPECT_CRM_PLAYBOOK.md`](./PROSPECT_CRM_PLAYBOOK.md).

---

## Regra de ouro

| Momento | Onde vive a verdade |
|---------|---------------------|
| Antes da primeira mensagem / lista fria | Este doc (opcional) ou ferramenta temporária |
| Depois que **existe conversa** na Inbox | CRM (`leadData.prospect`) |
| Durante campanha | Reduzir duplicação: não manter planilha como “segundo CRM” por semanas |

---

## Contexto do produto

- Oferta pública: `/solucoes/whatsapp-multi-canal`
- Conversão para diagnóstico: `/demo`
- Material pós-call: PDF + Markdown em `docs/whatsapp/` (proposta comercial)
- **Canal:** usar a **linha / canal de prospecção** já validado na operação DevFlow.

Fluxo ideal:

`Lead identificado` → `abordagem manual` → `resposta no WhatsApp` → `thread na Inbox` → `preencher CRM` → `avançar etapas` → `follow-up datado` → `enviar landing / PDF conforme interesse`

---

## ICP (preencher antes de executar)

- Segmentos prioritários:
- Geografia:
- Sinais de encaixe (volume WhatsApp, dois fluxos atendimento+vendas, dor explícita):
- Exclusões:

---

## Mensagens (rascunhos)

Manter 2–3 variantes curtas alinhadas ao tom consultivo (diagnóstico, não pressão). Evitar linguagem de SaaS self-service nos primeiros toques.

**Variante A — …**

**Variante B — …**

**Follow-up curto — …**

---

## Lista de trabalho (~20 linhas)

Use só enquanto o lead **não** está normalizado no CRM. Colunas sugeridas:

| # | Empresa | Nicho | Cidade | Origem | Primeira abordagem (data) | Respondeu? | Link/notas |
|---|---------|-------|--------|--------|---------------------------|------------|-------------|
| 1 | | | | | | | |

Quando **Responder = sim** e a conversa estiver na Inbox: copiar dados relevantes para o painel e marcar **origem** no enum suportado (`instagram`, `maps`, `linkedin`, `referral`, `website`).

---

## Métricas da campanha (retro semanal)

Registrar aqui ou num quadro interno:

| Métrica | Valor |
|---------|-------|
| Contactados | |
| Respostas | |
| Diagnósticos agendados | |
| Propostas enviadas | |
| Ganhos / perdidos / nutrir | |
| Taxa resposta (%) | |

Os mesmos estágios devem estar **reflectidos** nas threads via CRM para conferência cruzada.

---

## Próximos passos de produto (opcional)

Se a campanha manual validar o processo:

- `feat(whatsapp): importar leads manuais para CRM de prospecção`
- ou `feat(whatsapp): pipeline de outbound leads para Inbox/CRM`

---

## Ligações úteis

- Playbook CRM: [`PROSPECT_CRM_PLAYBOOK.md`](./PROSPECT_CRM_PLAYBOOK.md)
- Demo comercial multi-canal: [`COMMERCIAL_MULTI_CHANNEL_DEMO.md`](./COMMERCIAL_MULTI_CHANNEL_DEMO.md)
