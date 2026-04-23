# Motor de follow-up (derivado na leitura)

Toda a lógica descrita aqui é **calculada no `GET /api/admin/leads`** (e refletida na UI). **Não** há tabela de tarefas, filas nem cron — apenas funções puras e resposta JSON enriquecida.

---

## Leads “parados” (stale) — `lastContactAt`

Com base em **dias inteiros** desde `lastContactAt`:

| Condição | Badge (exemplos) |
|----------|------------------|
| Sem `lastContactAt` | **Nunca contatado** |
| &gt; 3 dias desde o último contato | **Sem resposta há X dias** (âmbar) |
| &gt; 5 dias | **Lead esfriando** (laranja) |
| &gt; 7 dias | **Crítico** (vermelho) |

Campo derivado por lead: `daysSinceLastContact` (número ou `null`).

### Filtro `?stale=1` (ou `true`)

Restringe a lista a leads **sem contato** ou com último contato **há mais de 3 dias** (definição operacional “parado”).

Implementação: `src/lib/admin-lead-stale.ts` e parâmetro na rota `GET /api/admin/leads`.

---

## Regras de “tarefa automática” — `leadActionState`

Por lead, o backend calcula:

```ts
{
  needsFollowUp: boolean;
  urgency: "low" | "medium" | "high";
  reason: string;
}
```

### Regras principais

- **`fechado`**, **`ganho`**, **`pausado`**, **`perdido`**: sem exigência de follow-up automático (motivos específicos no `reason`).  
- **`lastContactAt` ausente:** `needsFollowUp: true`, urgência **alta**, razão “Nunca contatado”.  
- **`demo_enviada`:** follow-up se passaram **≥ 2 dias** desde o último contato.  
- **`respondeu`:** se **≥ 1 dia**.  
- **`contato_iniciado`:** se **≥ 2 dias**.  
- Outros estágios (ex. `novo` com contacto já registado): sem lembrete automático por estas regras.

### Urgência (`low` / `medium` / `high`)

Após cruzar o limite mínimo de dias do estágio, quanto **mais dias além do limite**, maior a urgência (faixas discretas: baixa no limite, média, alta).

Código: `src/lib/admin-lead-actions.ts` — `getLeadActionState`.

---

## “Ações de hoje”

Lista **`actionList`** no JSON do `GET`: leads com `needsFollowUp === true`, **ordenados** por urgência (alta primeiro) e depois por nome.

Na UI (`/admin/leads`), bloco **Ações de hoje** mostra nome, empresa, **motivo** (`reason`) e um botão que executa a **ação sugerida** (ver abaixo).

---

## Sugestão de próxima ação — `suggestedAction`

Objeto por lead:

```ts
{ label: string; type: "contact" | "followup" | "demo" | "close" | "none" }
```

Exemplos de mapeamento por `status`:

| Status | Label típico | `type` |
|--------|----------------|--------|
| `novo` | Iniciar contato | `contact` |
| `contato_iniciado` | Aguardar resposta **ou** Follow-up | `followup` |
| `respondeu` | Enviar demo | `demo` |
| `demo_enviada` | Fazer follow-up | `followup` |
| `negociacao` | Fechar cliente | `close` |
| `fechado` / `ganho` / `pausado` | Nenhuma ação | `none` |
| `perdido` | Reengajar (opcional) | `contact` |

Na tabela há coluna **Próxima ação** + botão **Executar**: abre template WhatsApp adequado ou **realça** o botão **Converter em cliente** quando `type === "close"`.

Função principal: `getSuggestedAction` em `src/lib/admin-lead-actions.ts`.

---

## Métricas de funil (mesmo GET)

Resumo agregado com contagens por estágio-chave e taxas (resposta, demo, negociação, fechamento) — ver [LEADS-CRM.md](./LEADS-CRM.md) e `src/lib/admin-lead-conversion-metrics.ts`.
