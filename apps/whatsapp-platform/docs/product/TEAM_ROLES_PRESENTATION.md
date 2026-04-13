# Apresentação de roles na equipa (WhatsApp Platform)

Documento de produto: como as **roles técnicas** aparecem na UI, com **rótulos amigáveis** e **descrições de contexto**. A autorização (JWT, `requireRole`, grupos `ROLES_*`) não é alterada aqui — apenas a camada de apresentação.

---

## Mapeamento

| Role técnica (`whatsapp_users.role`) | Label na UI        | Descrição curta (contexto de função) |
|--------------------------------------|--------------------|--------------------------------------|
| `operator`                           | **Operador**       | Atendimento e operação na inbox.     |
| `manager`                            | **Gestor**         | Operação, métricas e configurações do tenant. |
| `platform_admin`                     | **Admin da plataforma** | Acesso interno ampliado (equipa da plataforma). |
| *(outro / legado)*                   | **Utilizador**     | Membro da equipa.                    |

---

## Onde aparece

| Local | Comportamento |
|-------|----------------|
| **`/agents`** | Badge de papel (`AgentRoleBadge`), descrição da função, filtro **Gestão** vs **Operação**, bloco **A sua sessão** com o utilizador autenticado. |
| **Estado operacional** | **Não** usa o mesmo componente que o papel: usa `AgentStatusBadge` (Livre / Em atendimento / Offline). |
| **API** | Continua a expor `role` como string técnica em JSON; a UI não mostra o identificador cru. |

---

## Segmentos para filtro leve (produto)

- **Operação**: `operator`
- **Gestão**: `manager` + `platform_admin`

Implementação: `teamRoleSegment` em `src/lib/role-presentation.ts`.

---

## Hierarquia visual em `/agents` (polish)

1. Nome (destaque) + badge de papel (compacto) + «Você» quando aplicável.
2. Estado operacional (`AgentStatusBadge`) logo abaixo — cores semânticas (verde / vermelho / cinza), `rounded-md` alinhado ao badge de papel.
3. Email, descrição da função, métricas, filas (até 3 + `+N`), última atividade (texto discreto).
4. Ações no rodapé do card.

Badges: **papel** = neutro (`slate`); **estado** = fundo suave por presença (emerald / red / slate).

---

## Código de referência

- `src/lib/role-presentation.ts` — labels, descrições, segmento.
- `src/components/agents/AgentRoleBadge.tsx` — badge visual do **papel** (estilo distinto do estado).
- `src/components/inbox/AgentStatusBadge.tsx` — badge de **presença operacional**.
