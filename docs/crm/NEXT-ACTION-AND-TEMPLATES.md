# Next Best Action (NBA) e templates de mensagem

## O que é

A **próxima ação** (NBA) no `/admin/leads` é uma sugestão **derivada** do estado do lead (status, datas, conversa) — nada muda o CRM sozinho. O operador mantém o controlo: o status, follow-up e notas seguem a ser atualizados manualmente.

- Motor: `src/lib/lead-next-action.ts` — função `getNextAction(lead, now)`.
- Textos: `src/lib/lead-message-templates.ts` + reutilização de `src/lib/admin-lead-message-templates.ts` para o primeiro contato, demo e follow-up.
- O botão **Executar** gera a mensagem certa, abre o `wa.me` (via `buildWhatsAppUrlWithMessage`) e regista, em opcional, `lastSuggestedActionType` (logging leve, sem lógica automática).

## Mapeamento status → ação (NBA)

| Status (slug)   | Tipo (canonical)  | Rótulo típico        |
|----------------|-------------------|----------------------|
| `novo`         | `first_contact`   | Primeiro contato     |
| `contato_iniciado` | `qualify`    | Qualificar interesse |
| `respondeu`    | `send_demo`      | Enviar demonstração  |
| `demo_enviada` | `follow_up`      | Follow-up pós-demo   |
| `negociacao`   | `handoff`        | Se **sem** `conversationRef` — handoff |
| `negociacao`   | `close`          | Com **conversa** vinculada — fechar/converter |
| `qualificado` / `reuniao` | `follow_up` | Acompanhar         |
| Encerrado (`fechado`, `ganho`, `pausado`, `perdido`) | `none` | Sem ação     |

A prioridade (baixa / média / alta) reforça seguimento humano, por exemplo: follow-up agendado atrasado, nunca contatado, ou demo com mais de 2 dias sem `lastContactAt`.

## Filosofia dos templates

- Textos em português, prontos a colar, mas o operador pode editar no WhatsApp.
- O primeiro contato, demo e follow-up “padrão” reaproveitam a mesma base de mensagens comerciais do CRM.
- **Qualificação** e **handoff** têm rascunhos distintos para aprofundar interesse e passar fechamento — sem dispara automático.

## Como o operador usa

1. Olhar a coluna **Próxima ação** (rótulo + cor da prioridade).
2. Clicar **Executar** (ou **Ir p/ conversão** se a ação for fecho).
3. Ajustar o **status** na mesma linha quando a conversa evoluir — a NBA não o substitui.

A lista **Ações de hoje** continua a usar o follow-up heurístico (`leadActionState`) do backend, mas o botão e a NBA mostrada seguem o novo motor, para alinhar ação e mensagem.

## Multi-tenant

- Nada na NBA consulta outro tenant: só campos do lead.
- A persistência de `lastSuggestedActionType` é no próprio lead, sem tabelas novas.

## Sem automação pesada

- Não há agendador, RPA, nem envio fora de um clique.
- A única “gravacao” automática após o clique é a opcional `lastSuggestedActionType` no PATCH.
