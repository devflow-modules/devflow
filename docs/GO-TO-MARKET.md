# GO-TO-MARKET — DevFlow WhatsApp Platform

Manual de **aquisição + operação + venda** alinhado ao produto, ao CRM interno e à demo. Documento vivo: ajustar com dados reais.

---

## Objetivo

Definir como a DevFlow gera clientes de forma consistente usando:

- **WhatsApp Platform** (produto)
- **CRM interno** (`/admin/leads`)
- **Lead Finder** (`/admin/lead-finder`)
- **Demo** (`/demo`)

Documentação técnica relacionada: [crm/README.md](./crm/README.md) · [whatsapp/WHATSAPP-PLATFORM-OVERVIEW.md](./whatsapp/WHATSAPP-PLATFORM-OVERVIEW.md)

---

# 1. ICP (Ideal Customer Profile)

## Perfil ideal

Empresas que:

- usam WhatsApp como **canal principal** de atendimento;
- recebem **volume constante** de mensagens;
- respondem **manualmente** (ou com processo ineficiente);
- têm **potencial de venda/conversão** via chat.

## Características

- Pequenas e médias empresas
- Operação local ou regional
- Atendimento direto ao cliente (B2C)
- Dono ou gestor acessível via WhatsApp

## Sinais fortes

- botão de WhatsApp no Instagram
- número visível no Google Maps
- demora para responder
- mensagens repetitivas (catálogo, preço, agenda)

---

# 2. Nichos prioritários

## Tier 1 (começar aqui)

- Clínica estética
- Dentista
- Imobiliária
- Barbearia premium
- Academia

Alto volume + dor clara + venda enxuta.

## Tier 2

- Restaurantes
- Lojas locais
- Oficinas
- Contabilidade
- Pet shops

## Evitar no início

- empresas muito grandes
- empresas sem WhatsApp
- empresas 100% inbound passivo

---

# 3. Estratégia outbound

## Canal principal

WhatsApp direto (via Lead Finder + templates quando fizer sentido).

## Origem dos leads

- Google Maps
- Instagram
- indicações

## Fluxo operacional

1. Buscar lead → `/admin/lead-finder`
2. Criar lead
3. Abrir WhatsApp
4. Iniciar conversa

## Mensagem inicial (exemplo)

```text
Fala, tudo bem?

Vi o perfil de vocês e fiquei com uma dúvida rápida sobre o atendimento no WhatsApp.

Hoje vocês respondem tudo manual ou já usam algum sistema?
```

### Objetivo desta mensagem

- **Não** vender na primeira linha.
- **Sim** iniciar conversa e qualificar curiosidade.

---

# 4. Uso do CRM

## Ferramentas

- `/admin/lead-finder` → gerar leads
- `/admin/leads` → gerenciar pipeline

Detalhe: [crm/LEAD-FINDER.md](./crm/LEAD-FINDER.md) · [crm/LEADS-CRM.md](./crm/LEADS-CRM.md)

## Pipeline (referência)

```text
novo
→ contato_iniciado
→ respondeu
→ demo_enviada
→ negociacao
→ fechado
```

## Rotina diária (sugestão)

### Manhã

- Ações de hoje
- Leads críticos
- Follow-ups

### Meio do dia

- Prospecção (10–20 leads)

### Tarde / noite

- Conversas
- Demo
- Negociação

## Regras

- sempre atualizar **status**
- sempre registrar **contexto** (notas)
- usar a **próxima ação sugerida** na UI quando aplicável

Motor derivado (sem tarefas em BD): [crm/FOLLOW-UP-ENGINE.md](./crm/FOLLOW-UP-ENGINE.md)

---

# 5. Follow-up

## Regra prática

Se não respondeu:

- 1–2 dias → follow-up leve
- 3+ dias → insistência leve (sem agressividade)

## Mensagem (exemplo)

```text
Fala! Conseguiu dar uma olhada?

Se fizer sentido, posso te mostrar como isso funcionaria direto no seu atendimento.
```

## Lembrete

- follow-up é onde muito fechamento acontece
- muitos leads avançam após o **segundo** contato honesto

Templates técnicos no produto: [crm/MESSAGE-TEMPLATES.md](./crm/MESSAGE-TEMPLATES.md)

---

# 6. Uso da demo

## Quando enviar

Sempre que houver **interesse mínimo** (pergunta, curiosidade, “como funciona?”).

## Objetivo

- mostrar valor rapidamente
- evitar explicação longa em texto
- gerar curiosidade para conversa ao vivo ou demo guiada

## Transição (exemplo)

```text
Posso te mostrar como isso funcionaria direto no seu atendimento.
```

Rota: `/demo`

---

# 7. Funil de venda

```text
Lead
→ conversa
→ resposta
→ demo
→ follow-up
→ negociação
→ fechamento
```

Rácios de referência e acompanhamento diário: ver **11. Como medir se está funcionando**. Calibra com os números reais do CRM (ex.: resumo de funil em `/admin/leads` e API admin leads).

---

# 8. Conversão

## Quando converter no CRM

- lead interessado
- entendeu o valor
- quer implementar

## Ação

Botão **Converter em cliente** em `/admin/leads` (registo comercial; ver [crm/LEADS-CRM.md](./crm/LEADS-CRM.md)).

## Pós-conversão (operação)

- iniciar onboarding no produto WhatsApp Platform
- configurar atendimento
- adaptar fluxo ao cliente

---

# 9. Princípios

## Evitar

- pitch longo no primeiro contacto
- jargão de API com quem não pediu
- vender cedo demais
- soar como robô

## Priorizar

- conversa simples
- perguntas abertas
- usar demo no timing certo
- seguir o CRM (status + notas)

---

# 10. Loop de crescimento

```text
Lead Finder
→ CRM
→ WhatsApp
→ Demo
→ Follow-up
→ Fechamento
→ Aprendizado
→ Repetir
```

---

# 11. Como medir se está funcionando

Transforma o playbook num **sistema de melhoria contínua**: o que não é medido não melhora de forma previsível.

## Métricas de execução

Acompanhar **diariamente** (mesmo que em 5 minutos no CRM):

- leads criados
- respostas (ex.: avanço para `respondeu` ou equivalente no pipeline)
- demos enviadas (`demo_enviada`)
- negociações iniciadas (`negociacao`)
- fechamentos (`fechado` / conversão comercial)

Registar sempre que possível **data** e **origem** (Maps, Instagram, indicação) para saber o que escalar.

### Benchmarks iniciais (ordem de grandeza)

- 20 leads → 5 respostas
- 5 respostas → 2 demos
- 2 demos → 1 negociação
- 1 negociação → 1 fechamento

São metas de **primeira calibragem**, não lei física: substitui por médias próprias após 1–2 semanas de dados.

### Se os números estiverem abaixo do esperado

- **ajustar mensagem** (abertura, tom, pergunta)
- **ajustar nicho** (Tier 1 vs Tier 2, segmento com mais resposta)
- **melhorar follow-up** (cadência, segunda mensagem, demo mais cedo)

Rever em bloco a cada **5 dias** (alinhado ao “Próximo passo” abaixo).

---

# Conclusão

A DevFlow pode **começar sem depender só de tráfego pago**: o stack foi pensado para gerar leads manualmente, conduzir conversas, fechar e aprender rápido.

**Execução consistente importa mais que volume bruto.**

---

# Próximo passo

Rodar este playbook por **5 dias** consecutivos, preencher a **secção 11** (métricas diárias + benchmarks) e ajustar mensagem, nicho e abordagem com base nos dados reais do CRM e nas conversas.
