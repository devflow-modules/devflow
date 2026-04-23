# Templates de mensagem (WhatsApp) — leads admin

Textos **pré-definidos** para acelerar o primeiro contacto, follow-up e convite à demo. **Não** há editor na UI nem persistência de variantes: só geração de `string` e abertura de `wa.me`.

Código: `src/lib/admin-lead-message-templates.ts`.

---

## Funções exportadas

| Função | Uso recomendado |
|--------|------------------|
| `firstContactTemplate(lead)` | Primeiro contacto comercial após descoberta do lead |
| `followUpTemplate(lead)` | Lembrete após silêncio ou após proposta inicial |
| `sendDemoTemplate(lead)` | Convite à demo guiada (texto genérico; sem link dinâmico embutido) |

`lead` é um objeto mínimo com `name?` e `company?` (aceita `null`).

---

## Quando usar cada uma

1. **`firstContactTemplate`** — quando o operador ainda **não** enviou uma mensagem estruturada (ou mudou de canal). Tom: apresentação DevFlow + proposta de alinhamento curto.  
2. **`followUpTemplate`** — quando já houve contacto e o lead não respondeu ou ficou pendente.  
3. **`sendDemoTemplate`** — quando o objectivo é **mover para demo** (pode combinar-se com mudança manual de `status` para `demo_enviada` depois do envio).

---

## Abertura no WhatsApp

A UI usa **`buildWhatsAppUrlWithMessage(phone, textoPlano)`**, que:

1. Normaliza o telefone para dígitos;  
2. Aplica `encodeURIComponent` ao corpo;  
3. Devolve `https://wa.me/{dígitos}?text=…`

Há ainda helpers legados (`encodeAdminLeadMessageForWhatsApp` por chave interna, `buildWaMeUrlWithText`) para testes e compatibilidade; o fluxo principal do CRM usa as três funções nomeadas + `buildWhatsAppUrlWithMessage`.

---

## Onde aparece na UI

- Tabela `/admin/leads`: links **Primeiro contato**, **Follow-up**, **Enviar demo** na coluna de ações comerciais.  
- **Executar** na coluna “Próxima ação” e no bloco “Ações de hoje” reutilizam a mesma lógica conforme `suggestedAction.type`.

---

## Limitações conscientes

- Mensagens são **estáticas** (com interpolação simples de nome/empresa).  
- Não substituem políticas de opt-in / horário comercial da operação humana.
