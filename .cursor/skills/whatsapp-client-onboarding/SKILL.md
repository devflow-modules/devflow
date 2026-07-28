---
name: whatsapp-client-onboarding
description: >-
  Gates real WhatsApp Business Platform client activation as a fail-closed
  ownership, security and readiness process (APPROVE/FIX/BLOCK). Use before
  enabling a real client; never treat onboarding as a click sequence.
---

# WhatsApp — client onboarding gate

## Objetivo

Transformar a ativação de clientes reais no WhatsApp Business Platform num **gate** de ownership, segurança e prontidão operacional — seguro, verificável, repetível e **fail-closed**. Capacidade: `action-enabled com aprovação`. Default: **review-only** (emitir `APPROVE` | `FIX` | `BLOCK` com evidências sanitizadas). Ações em Meta Business Manager / Business Portfolio, WABA, números, tokens, webhook ou smoke **só** com autorização humana explícita, fora do modo default desta skill.

Esta skill **não** é uma sequência de cliques. Ausência de erro ≠ onboarding aprovado. Aprovações da Meta são dependência externa — nunca prometidas.

## Gatilhos de uso

- Ativar ou reativar cliente real no WhatsApp Platform (`apps/whatsapp-platform`).
- Cliente perdeu telefone antigo, admin ou acesso a ativos Meta.
- Troca de fornecedor/BSP, migração de número/WABA, ou dúvida de ownership.
- Pré-piloto / go-live assistido (após readiness de produto quando aplicável).
- Papéis [`security-reviewer`](../../agents/security-reviewer.md), [`product-owner`](../../agents/product-owner.md), [`release-manager`](../../agents/release-manager.md) em contexto de ativação de cliente.
- Workflow [`audit-hardening`](../../workflows/audit-hardening.md); command [`/audit-domain`](../../commands/audit-domain.md) quando o domínio for onboarding/ativação Meta.

Não usar para: implementar features, corrigir código de produção, E2E inbox (`whatsapp-e2e-safe-gate`), release genérico (`devflow-safe-release`), contornar verificações Meta, ou “desbloquear” produção sem evidência.

## Entradas obrigatórias

- Autorização humana para **esta** avaliação de onboarding (escopo do cliente, sem PII desnecessária).
- Identificação opaca do cliente/tenant pretendido (código interno / alias — sem documentos fiscais completos no chat).
- Ambiente pretendido: `dev` | `test` | `production` (ambíguo → `BLOCK`).
- Matriz de ownership declarada (responsável legal, admin Meta, contato técnico DevFlow).
- Evidências sanitizadas disponíveis para inspeção (screenshots sem tokens/OTP; IDs opacos).
- Documentação canônica DevFlow aplicável:
  - [`AGENTS.md`](../../../AGENTS.md);
  - [segurança/segredos](../../rules/01-security-and-secrets.mdc);
  - [rule WhatsApp](../../rules/05-whatsapp-platform.mdc);
  - [`ARCHITECTURE.md`](../../../docs/whatsapp-platform/ARCHITECTURE.md);
  - [`PILOT-RUNBOOK.md`](../../../docs/whatsapp-platform/PILOT-RUNBOOK.md);
  - [`OPERATIONAL_PLAYBOOK.md`](../../../docs/whatsapp/OPERATIONAL_PLAYBOOK.md);
  - [`WEBHOOK_META_CHECKLIST.md`](../../../docs/whatsapp/WEBHOOK_META_CHECKLIST.md);
  - [`WHATSAPP-PRODUCTION-SIGNOFF.md`](../../../docs/architecture/WHATSAPP-PRODUCTION-SIGNOFF.md);
  - [`PRODUCTION_CHECKLIST.md`](../../../docs/whatsapp/PRODUCTION_CHECKLIST.md) quando go-live.
- Skills relacionadas: [`whatsapp-platform-safe-change`](../whatsapp-platform-safe-change/SKILL.md), [`devflow-multitenancy-review`](../devflow-multitenancy-review/SKILL.md), [`devflow-safe-release`](../devflow-safe-release/SKILL.md).
- Fontes oficiais Meta **consultadas na data da avaliação** (não memória de UI). Ver secção **Fontes oficiais**. Itens não comprovados → `unverified` / `not checked`.

## Fluxo operacional

Separar sempre: **fato observado** | **declaração do cliente** | **inferência**. Registrar `not checked`, `not run`, `unverified` com honestidade.

### Fase 1 — Descoberta e ownership

1. Identificar empresa e responsável legal (nome/papel; sem PII excessiva).
2. Confirmar Business Portfolio / Meta Business correto (não assumir o da DevFlow como do cliente).
3. Listar administradores e quem pode autenticar-se sem credencial partilhada.
4. Mapear ativos: WABA, Meta app, phone number ID(s), System User (se existir), fornecedor/BSP anterior.
5. Confirmar acesso ao e-mail e telefone **cadastrados** na conta Meta (distintos do número WhatsApp Cloud — ver caso A).
6. Declarar ambiente pretendido e se já existe canal/tenant no `whatsapp-platform`.

Sem ownership comprovado ou com ativos de terceiro sem liberação → `BLOCK`.

### Fase 2 — Readiness da empresa

1. Dados legais coerentes (nome, endereço, site/domínio) entre declaração, materiais públicos e o que a Meta exibe — divergência material sem plano → `FIX` ou `BLOCK` se impedir verificação.
2. Documentação necessária para verificação empresarial: só o que a [Central de Ajuda Meta — verificação da empresa](https://www.facebook.com/business/help/2058515294227817) e o fluxo atual exigirem na data da consulta; UI lembrada ≠ fato.
3. Autenticação forte / passkey quando aplicável — **cliente executa**; nunca solicitar senha, OTP, passkey ou token por chat.
4. Permissões administrativas mínimas (least privilege).
5. Divergências fiscais/públicas/Meta: classificar e atribuir responsável.

### Fase 3 — Verificação e acessos

Diferenciar explicitamente:

| Conceito | O que é | Quem tipicamente executa |
|---|---|---|
| Verificação da empresa (Business Verification) | Confiança Meta na entidade jurídica | Cliente / Meta |
| Autenticação do utilizador | Login do admin (2FA/passkey) | Titular da conta (cliente) |
| Verificação / registo do número | Prova de controlo do MSISDN + registo Cloud API | Cliente (recebe método oficial) + DevFlow só com mandato |

- Não usar credenciais partilhadas.
- Separar ações **cliente** vs **DevFlow**; registar autoridade por ação.
- Aprovação Meta = `external dependency` — nunca prazo/resultado prometido.
- Oferta de senha/OTP/token ao operador → `BLOCK` imediato (ver Guardrails).

### Fase 4 — WABA e aplicação

Fatos oficiais (consulta 2026-07-28; revalidar na data da avaliação):

- App Meta com WhatsApp associa-se a um **Business Portfolio**; uma WABA pode ser criada no fluxo ([Get Started](https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started)).
- Token **temporário** serve a testes iniciais e expira; produção/uso contínuo exige **System User** + token permanente via Business Settings, com permissões mínimas documentadas (ex. `whatsapp_business_messaging`, `whatsapp_business_management`, `business_management` conforme o guia vigente) — [Get Started — system user](https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started).
- Segregar desenvolvimento / teste / produção; IDs de app/WABA/número devem ser distinguíveis.
- Rotação, expiração e revogação planeadas; **nenhuma** credencial em logs, docs, PR, issue ou screenshot.
- Ownership e partilha de ativos: se ex-agência/BSP controla WABA sem liberação oficial → `BLOCK`.

### Fase 5 — Número

Fatos oficiais (consulta 2026-07-28; doc phone numbers lastUpdated 2026-05-21 na página Meta):

- O número deve ser **registado** antes de enviar/receber via Cloud API ([Business phone numbers](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/phone-numbers)).
- Adicionar o número à WABA e verificar ownership **não** equivale, por si só, a registá-lo para Cloud API (`unverified` se o fluxo UI divergir — seguir o guia oficial do dia).
- Números registados na Cloud API **não** podem ser usados em paralelo com a app WhatsApp / WhatsApp Business de consumidor no sentido descrito pela Meta nessa página; coexistência/migração só quando o documento oficial aplicável (ex. Embedded Signup / coexistência) comprovar o caminho — caso contrário `unverified` → não executar → `BLOCK` se a ação for crítica.
- Display name, qualidade e restrições: seguir docs oficiais; pendência cosmética sem risco de ownership → `FIX`.
- Sem controlo do número ou sem capacidade de receber o método oficial de confirmação → `BLOCK`.
- Cadastro destrutivo/irreversível sem plano de rollback comprovado → `BLOCK`.

#### Caso obrigatório — telefone antigo inacessível

| Caso | Regra |
|---|---|
| **A** — Telefone só como contacto/auth da conta Meta | Não presumir que é o número WhatsApp Cloud. Identificar qual ativo depende dele. Direcionar o responsável legal aos mecanismos **oficiais** de recuperação/atualização. Auth/ownership não comprováveis → `BLOCK`. |
| **B** — Número a registar na Platform | Sem controlo ou sem receber confirmação oficial → `BLOCK`. Avaliar substituição por número sob controlo do cliente. **Proibido:** interceptação, empréstimo, SIM de terceiro, bypass. |
| **C** — Número já vinculado a WABA/app/BSP | Comprovar ownership e vínculo. Só migração/liberação/suporte **oficial documentado**. Não remover/recriar às cegas. Ambiguidade ou risco de perda operacional → `BLOCK`. |
| **D** — Empresa não recupera admins/ativos | Pacote de evidências **sanitizado** para suporte Meta; registar protocolo, responsável e estado. Veredito `BLOCK / external dependency`. Não prometer prazo/resultado. |

Telefone antigo que é **apenas** contacto obsoleto e **não** participa do fluxo atual → **não elevar automaticamente** a `BLOCK` (registar `not applicable` com evidência). WABA antiga sem vínculo com o onboarding atual → idem: não elevar automaticamente; isolar do escopo.

### Fase 6 — Webhook e integração

Alinhar a [`WEBHOOK_META_CHECKLIST.md`](../../../docs/whatsapp/WEBHOOK_META_CHECKLIST.md) e hardening interno; revalidar contra [Webhooks overview](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview) / set-up vigente.

Checklist gate:

1. URL canónica do app (`apps/whatsapp-platform` — não portal legado), HTTPS, ambiente correto.
2. Challenge / verify token alinhado ao secret de ambiente (**nunca** colar o valor).
3. Assinatura / validação de origem; rejeição de eventos sem tenant resolvível.
4. Idempotência, deduplicação e retries Meta considerados.
5. Armazenamento e logs sanitizados (sem payload assinado completo / PII desnecessária).
6. Plano de **rollback** do callback **antes** de ativar tráfego real.
7. Webhook ainda não configurado **e** produção não ativada → tipicamente `FIX` (pendência interna), não `APPROVE`.

Produção ambígua (não se distingue teste) → `BLOCK`.

### Fase 7 — Smoke controlado

Só após Fases 1–6 sem `BLOCK` ativo e com autorização humana **única** para smoke:

1. Pré-condições explícitas (ambiente, destinatário, template/mensagem autorizados).
2. Volume mínimo; correlação e evidências sanitizadas.
3. Confirmação de recebimento.
4. Ownership, ambiente ou credenciais ambíguos → **nenhum** smoke (`not authorized`).
5. Smoke de produção ≠ gate E2E inbox; não misturar com [`whatsapp-e2e-safe-gate`](../whatsapp-e2e-safe-gate/SKILL.md).

Default desta skill: `smoke: not authorized` até ordem explícita.

### Vereditos

| Veredito | Critério |
|---|---|
| `APPROVE` | Ownership comprovado; admin correto; empresa/ativos coerentes; número controlado pelo cliente; least privilege; credenciais protegidas; webhook + rollback definidos; smoke autorizado **ou** explicitamente diferido com risco residual aceite; evidências suficientes e sanitizadas; sem finding `BLOCK`. |
| `FIX` | Pendência interna, reversível e confinada (doc, config, evidência complementar, display name, webhook pré-produção); ownership inequívoco; sem exposição de credencial; sem bypass; responsável e ação corretiva objetivos. |
| `BLOCK` | Ownership/autoridade não comprovados; telefone necessário inacessível (casos A–C); admin legítimo indisponível; ativo de terceiro/BSP sem liberação; credenciais partilhadas/expostas/origem desconhecida; pedido de bypass; produção ambígua; ação destrutiva sem rollback; documentação oficial insuficiente para operação crítica (`unverified` em passo crítico); dependência ativa de suporte/aprovação Meta (caso D). |

Dúvida com risco concreto em superfície crítica → `BLOCK`, não `APPROVE`. Findings de produção descobertos → issue/fatia **separada** (não corrigir nesta skill).

## Guardrails

- Fail-closed; least privilege; nenhuma credencial em texto.
- Screenshots sanitizados; nunca solicitar senha, OTP, passkey ou token por chat.
- Cliente executa autenticação pessoal.
- Não aceder/alterar Business Manager, WABA, Meta for Developers, números ou webhooks no modo default.
- Não gerar, copiar ou testar tokens reais nesta skill.
- Não enviar mensagem/template sem autorização de smoke.
- Não contornar verificações; não prometer aprovação Meta.
- Não sugerir interceptação, SIM de terceiro, empréstimo temporário ou bypass.
- Não tratar UI/requisitos lembrados como factos permanentes.
- Separar fato / declaração / inferência; `not checked` / `not run` / `unverified` honestos.
- Achados → documentar; correção em fatia autorizada à parte.
- Multi-tenant do produto: [`devflow-multitenancy-review`](../devflow-multitenancy-review/SKILL.md) se o diff/código for tocado noutro fluxo.

## Stop conditions

Parar com `BLOCK` / escalar humano quando:

- ownership, ambiente ou autoridade estiverem ambíguos;
- telefone/admin necessários inacessíveis;
- credencial for oferecida ou aparecer em log/screenshot;
- for pedido de bypass ou ação destrutiva sem rollback;
- documentação oficial não comprovar passo crítico;
- suporte/aprovação Meta estiver pendente e bloquear avanço;
- for pedido para “só clicar” sem evidências das fases 1–6;
- correção exigir acesso a sistemas reais sem autorização explícita.

## Validações

- Cada fase: `pass` | `fix` | `blocked` | `not checked` | `not run` | `unverified` (com motivo).
- Matriz de ownership preenchida; casos A–D classificados quando houver telefone antigo/inacessível.
- Fontes Meta: links + **data da consulta** registados; itens só de memória → `unverified`.
- Credenciais: prova de **não** exposição (revisão de evidências sanitizadas).
- Webhook/rollback: definidos ou `FIX`/`BLOCK` conforme ambiente.
- Smoke: `authorized` (com ordem) | `not authorized`.
- Edits autorizados por esta skill no modo default: `none` (exceto documentação/checklist sanitizado se o pedido o autorizar).
- Nunca reportar ausência de erro como `APPROVE`.

## Formato da entrega

```text
Cliente / escopo (sem PII desnecessária):
Ativos envolvidos (Portfolio, app, WABA, phone IDs — opacos):
Responsáveis e matriz de ownership:
Pré-condições verificadas:
Evidências inspecionadas (sanitizadas):
Pendências e dependências externas (Meta/suporte):
Findings (severidade ↓):
  - [BLOCK|FIX|note] — issue — evidence | fact|declaration|inference
Riscos e ações proibidas:
Plano de rollback:
Smoke proposto: <plano> | not authorized
Risco residual:
Recomendação final: APPROVE | FIX | BLOCK
Próximo responsável e próxima ação:
Official sources consulted (URL + date):
Authorized edits: none | <paths>
```

## Fontes oficiais

Consultar e citar na avaliação (exemplos validados em **2026-07-28**; **revalidar** sempre):

| Tópico | URL |
|---|---|
| Get Started (app, Portfolio, WABA, tokens, system user, webhook de teste) | https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started |
| Business phone numbers (registo, requisitos) | https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/phone-numbers |
| Webhooks overview | https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview |
| Webhooks set-up | https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/set-up |
| Verificação da empresa (Help Center) | https://www.facebook.com/business/help/2058515294227817 |

Migração Embedded Signup / coexistência / transferência entre parceiros: seguir apenas páginas oficiais ligadas a partir do Get Started / Partners na data da consulta. Se o guia do dia **não** comprovar a operação proposta → classificar `unverified` e, se a operação for crítica, `BLOCK`.
