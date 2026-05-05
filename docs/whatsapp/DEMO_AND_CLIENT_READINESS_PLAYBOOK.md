# Playbook — Demo comercial e readiness primeiro cliente

**Produto:** WhatsApp Platform (`apps/whatsapp-platform`) · **Audiência:** vendas, CS, operações, founders  
**Versão:** 1.0 · **Tipo:** orientação comercial e operacional (sem código)

Este documento complementa [OPERATIONAL_PLAYBOOK.md](./OPERATIONAL_PLAYBOOK.md) (onboarding assistido interno) e o [go-live técnico](../../apps/whatsapp-platform/docs/ops/GO_LIVE_WHATSAPP_PLATFORM.md). Objetivo: **primeira demonstração presencial ou gravada** e **primeira conta cliente** com mensagem clara, sem expor detalhes internos de faturação ou implementação.

---

## 1. Roteiro de demo — 10 minutos (venda)

**Preparação (antes de ligar a chamada):** conta demo com tenant estável, pelo menos um número WhatsApp em estado “ativo” ou cenário “pré-ativação” ensaiado; segundo separador com este playbook aberto.

| Min | Foco | O que dizer (negócio) | Onde clicar |
|-----|------|------------------------|-------------|
| 0–1 | Abrir com problema | “Empresas perdem leads no WhatsApp porque as mensagens não ficam num só lugar com equipa e histórico.” | *(opcional)* Landing ou slide — não precisa mostrar código. |
| 1–3 | Visão do espaço de trabalho | “Isto é o painel do gestor: estado da ligação WhatsApp e próximos passos.” | **`/dashboard`** — destacar resumo, estado da ligação ao canal, caminho para configurações se perguntarem. |
| 3–6 | Operação real | “A equipa atende aqui: conversas abertas, filas, contexto.” | **`/inbox`** — 1 conversa de exemplo; mencionar que vários agentes podem trabalhar (sem nomear filas internas como implementação). |
| 6–8 | Ativação e confiança | “Nós preparamos o canal com a Meta; o cliente vê o estado transparente.” | **`/dashboard/whatsapp`** ou **`/admin/whatsapp`** conforme público: cliente → dashboard WhatsApp; demo interna → Activation Control Center (provisionamento). |
| 8–9 | Integrações (se relevante) | “Para ligar ao CRM ou automações, há API controlada pelo gestor.” | **`/settings/developer`** — chave API como capacidade, não como detalhe técnico Stripe/Postgres. |
| 9–10 | Encerramento | “Plano mensal inclui X; implantação inicial cobre Y — próximo passo é activação na vossa conta Meta com o nosso suporte.” | Fechar com próximo passo comercial (proposta, onboarding assistido). |

**Frases a evitar na demo comercial**

- Nomes de produtos internos de billing (Stripe, meter events, webhooks como “pipeline”).
- “Tenant”, “JWT”, “pooler”, “migration”.
- Valores de margem ou identificadores internos.

**Frases preferidas**

- “Serviço mensal”, “pacote incluído”, “uso complementar conforme contrato”.
- “Ligação ao WhatsApp Business”, “canal activo”, “equipa na inbox”.

Referência de narrativa de preço (interna, não ler na íntegra na demo): [PRODUCT_PRICING_NARRATIVE.md](../../apps/whatsapp-platform/docs/billing/PRODUCT_PRICING_NARRATIVE.md).

---

## 2. Checklist — primeiro cliente (ativação)

Use junto com [OPERATIONAL_PLAYBOOK.md](./OPERATIONAL_PLAYBOOK.md) para a parte técnica.

**Contrato e expectativas**

- [ ] Proposta ou contrato assinado: âmbito (número de utilizadores, canais, SLA comercial acordado).
- [ ] Contacto decisor e contacto operacional (quem acede à Meta Business Manager).
- [ ] Data alvo de “primeira mensagem real” comunicada ao cliente.

**Conta e acesso**

- [ ] Tenant e utilizadores criados (papéis: gestor vs operador conforme pacote).
- [ ] URL do ambiente de produção acordada (white-label: hostname e branding verificados).
- [ ] Credenciais entregues por canal seguro (sem partilhar senhas por chat informal).

**Canal WhatsApp**

- [ ] Business Manager / WABA alinhados com o cliente (quem submete verificação Meta).
- [ ] Canal provisionado; estado visível no produto (`/dashboard/whatsapp`).
- [ ] Após aprovação Meta: canal **ativado** no fluxo interno documentado no playbook operacional (`/admin/whatsapp` quando aplicável).

**Go-live técnico mínimo**

- [ ] Webhook e verify token validados em produção (ver checklist de smoke abaixo).
- [ ] Migrações de base aplicadas no ambiente do cliente (equipa técnica).

**Handoff comercial → operações**

- [ ] Registar neste playbook ou CRM: data de kickoff, responsável DevFlow, responsável cliente.

---

## 3. Checklist — handoff operacional (equipa interna)

**Da equipa comercial / implantação para suporte contínuo**

- [ ] Documentar tenantId / nome da organização (uso interno — não enviar ao cliente se não necessário).
- [ ] Escalões de contacto: comercial, técnico, urgência fora de horas (se contratado).
- [ ] Known issues ou limitações acordadas na venda (ex.: só texto na fase 1).
- [ ] Link para documentação interna relevante: Operacional — [OPERATIONAL_PLAYBOOK.md](./OPERATIONAL_PLAYBOOK.md); incidentes — [`INCIDENT_RESPONSE.md`](../../apps/whatsapp-platform/docs/ops/INCIDENT_RESPONSE.md).

**Do onboarding técnico para o cliente (resumo escrito)**

- [ ] Onde fazer login e como pedir reset de palavra-passe.
- [ ] Onde ver estado da ligação WhatsApp (`/dashboard/whatsapp`).
- [ ] Onde operadores trabalham (`/inbox`).
- [ ] Quem contactar da DevFlow para bloqueios Meta ou billing.

---

## 4. Smoke — antes da demo com cliente

Executar **na mesma URL** que será mostrada (produção ou staging aprovado). Não substitui validação de deploy completa; evita vergonha em sessão.

**Ambiente e sessão**

- [ ] Login com utilizador demo (papel adequado: gestor ou operador conforme roteiro).
- [ ] Sem banners de erro globais; páginas principais carregam.

**Rotas (ordem sugerida)**

- [ ] **`/dashboard`** — carrega sem erro.
- [ ] **`/inbox`** — carrega; lista ou estado vazio aceitável.
- [ ] **`/dashboard/whatsapp`** ou **`/admin/whatsapp`** — conforme demo (cliente vs interno).
- [ ] **`/settings/developer`** — acede quem tiver permissão na conta demo.
- [ ] **`/admin/conversations`** — apenas se a demo incluir vista admin de conversas (sessão `platform_admin`).

**Webhook (equipa técnica)**

- [ ] `GET /api/webhook/whatsapp` sem token → **403** (comportamento endurecido).
- [ ] Verificação Meta com `hub.verify_token` e challenge → resposta correta do challenge.

Script opcional: `apps/whatsapp-platform/scripts/ops/validate-whatsapp-platform.sh` (ver `GO_LIVE_WHATSAPP_PLATFORM.md`).

---

## 5. Ecrãs a mostrar — mapa rápido

| Rota | Mensagem comercial | Notas |
|------|---------------------|--------|
| **`/dashboard`** | “Painel do espaço de trabalho — estado geral e próximos passos.” | Evitar métricas internas não contratadas; destacar valor para o gestor. |
| **`/inbox`** | “Onde a equipa responde aos clientes no WhatsApp.” | Centro da demo operacional; mostrar 1 fluxo feliz. |
| **`/dashboard/whatsapp`** | “Estado da ligação ao WhatsApp Business e próximo passo de activação.” | Para cliente final; linguagem de “canal” e “ligação”, não Graph API. |
| **`/admin/whatsapp`** | *(Interno / parceiro)* “Activation Control Center — provisionamento e diagnóstico de canais.” | Não é ecrã típico do cliente SMB; usar em demo B2B ou partner. |
| **`/settings/developer`** | “API para integrações — chaves geridas pelo gestor.” | Útil para IT do cliente; não expor stack de billing. |
| **`/admin/conversations`** | *(Interno)* “Lista administrativa de conversas por tenant.” | Apenas audiência staff/platform; não substitui `/inbox` na narrativa do cliente. |

---

## 6. Riscos e notas — posicionamento white-label

**O que não expor**

- Infraestrutura de cobrança (Stripe, webhooks Stripe, meter events, IDs de preço internos).
- Detalhes de base de dados, nomes de tabelas, ou erros técnicos completos em partilha de ecrã.
- Comparativos de margem ou custos internos.

**O que sim comunicar**

- **Setup / implantação:** pacote inicial ou horas incluídas — valor entregue (conta, canal, formação resumida).
- **Serviço mensal:** o que está incluído (utilizadores, canais, SLA de suporte) em linguagem de negócio.
- **Uso e limites:** “conforme plano” / “expansão conforme contrato” sem números internos não aprovados pelo comercial.

**Documentação interna relacionada**

- [WHITE_LABEL_STRATEGY.md](../../apps/whatsapp-platform/docs/WHITE_LABEL_STRATEGY.md) — alinhamento de branding e promessa.
- [PRODUCT_PRICING_NARRATIVE.md](../../apps/whatsapp-platform/docs/billing/PRODUCT_PRICING_NARRATIVE.md) — narrativa interna de preço (adaptar à peça comercial pública).

---

## Como usar na primeira demo com cliente

1. **Antes:** percorrer secção 4 (smoke) na URL real da demo; preparar utilizador e dados de exemplo na inbox.  
2. **Durante:** seguir secção 1 (roteiro 10 min); flexionar secção 5 consoante o perfil (gestor vs IT).  
3. **Depois:** enviar resumo escrito com próximos passos (secção 2); handoff interno secção 3.  
4. **White-label:** rever secção 6 antes de qualquer gravação ou captura de ecrã partilhada publicamente.

---

## Referências cruzadas

| Documento | Uso |
|-----------|-----|
| [OPERATIONAL_PLAYBOOK.md](./OPERATIONAL_PLAYBOOK.md) | Onboarding assistido e `/admin/whatsapp` |
| [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) | Itens técnicos amplos |
| [WHATSAPP-PLATFORM-OVERVIEW.md](./WHATSAPP-PLATFORM-OVERVIEW.md) | Visão de produto |
| [`GO_LIVE_WHATSAPP_PLATFORM.md`](../../apps/whatsapp-platform/docs/ops/GO_LIVE_WHATSAPP_PLATFORM.md) | Deploy e smoke pós-deploy |
