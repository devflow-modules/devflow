# Product Spec — Módulo Financeiro DevFlow

**Documento:** Especificação de produto para transformar o módulo em produto comercial.

**Status:** rascunho — preencher e revisar conforme estratégia.

---

## 1. Visão do produto

**Em uma frase:**  
Controle financeiro pessoal e familiar que une receitas, despesas, rateio PJ/PF e projeção de fluxo em um só lugar — sem planilhas, sem app pesado.

**Proposta de valor:**  
Clareza sobre o dinheiro da casa: quem ganha o quê, quanto sai, quanto sobra e para onde vai — com metas de investimento e reserva por mês.

---

## 2. Problema que resolve

| Problema | Dor |
|----------|-----|
| Desorganização financeira | Receitas e despesas em planilhas, notas ou cabeça |
| Falta de visão compartilhada | Casais/famílias sem visão única do orçamento |
| Mix PJ/PF confuso | Quem tem MEI/CNPJ mistura tudo e perde controle |
| Projeção inexistente | Não sabe se o mês fecha no azul |
| Metas vagas | "Investir mais" sem número ou acompanhamento |

---

## 3. Público alvo

### Primário
- **Casais** que dividem contas e querem transparência
- **MEI/autônomos** que precisam separar PJ e PF

### Secundário
- **Familiares** que compartilham casa e despesas
- **Indivíduos** que querem controle simples sem app complexo

### Persona exemplo
> Ana, 32 anos, trabalha como PJ e divide aluguel com o parceiro. Usa planilha no Google e perde o controle entre salário, freelance e despesas compartilhadas. Quer saber quanto sobra para investir e guardar.

---

## 4. Funcionalidades MVP

| Funcionalidade | Status | Descrição |
|----------------|--------|-----------|
| Auth | ✅ | Login OAuth + email/senha |
| Household | ✅ | Criar casa, trocar ativa, múltiplas casas |
| Sources | ✅ | Fontes PJ/PF, ciclos, dias de recebimento |
| Incomes | ✅ | Receitas com status (agendada/recebida) |
| Expenses | ✅ | Despesas com status (pendente/paga) |
| Rules | ✅ | Regras de rateio (percentual, por fonte) |
| Dashboard | ✅ | Cards, gráfico evolução, fluxo por categoria |
| Projeção | ✅ | Projeção de fluxo (base, pessimista, otimista) |
| Metas | ✅ | Meta da família + meta pessoal (investir/guardar) |
| Convites | ✅ | OWNER convida por email, aceite por link |
| Transfer ownership | ✅ | Transferir titularidade da casa |
| Ferramentas públicas | ✅ | Divisão de contas, projeção, despesas fixas (SEO) |

---

## 5. Funcionalidades futuras

| Funcionalidade | Prioridade | Notas |
|----------------|------------|-------|
| Categorias configuráveis | Alta | Hoje é free-text |
| Orçamento por categoria | Alta | Meta mensal por categoria |
| Importação de extrato | Média | CSV/OFX |
| Alertas e lembretes | Média | Despesa próxima do vencimento |
| App mobile (PWA ou nativo) | Média | Melhorar experiência mobile |
| Conectores bancários | Baixa | Open Finance, complexidade regulatória |
| Relatórios exportáveis | Baixa | PDF, Excel |
| Múltiplas moedas | Baixa | Para quem recebe em USD/EUR |

---

## 6. Métricas de sucesso

| Métrica | Objetivo | Como medir |
|---------|----------|------------|
| Cadastros | — | Usuários únicos com household |
| Households ativas | — | Casas com receita/despesa no último mês |
| Receitas cadastradas | — | Média por household |
| Despesas cadastradas | — | Média por household |
| Retenção D7/D30 | — | % que volta em 7/30 dias |
| NPS | — | Pesquisa pós-uso |
| Conversão freemium → pago | — | Quando houver tier pago |

---

## 7. Integrações futuras

| Integração | Tipo | Prioridade |
|------------|------|------------|
| Resend | Email (convites) | Já previsto |
| Stripe/Mercado Pago | Pagamento | Quando houver plano pago |
| Google Sheets | Export | Média |
| Notion | Embed/export | Baixa |
| Open Finance | Bancos | Baixa (regulação) |

---

## 8. Roadmap sugerido

| Fase | Foco |
|------|------|
| **v0.1** | MVP atual — homologação e go-live |
| **v0.2** | Categorias configuráveis, orçamento por categoria |
| **v0.3** | Importação CSV, alertas |
| **v1.0** | Produto público, landing otimizada, monetização (freemium) |

---

## 9. Monetização (futuro)

| Modelo | Descrição |
|--------|-----------|
| **Freemium** | Grátis: 1 household, X receitas/despesas. Pago: múltiplas casas, histórico ilimitado, export |
| **One-time** | Licença anual para uso ilimitado |
| **B2B** | White-label para contadores/consultores |

---

## Referências

- [FINANCEIRO-MVP-ARCHITECTURE.md](./FINANCEIRO-MVP-ARCHITECTURE.md)
- [FINANCEIRO-API-MAP.md](./FINANCEIRO-API-MAP.md)
- [FINANCEIRO-DATA-MODEL.md](./FINANCEIRO-DATA-MODEL.md)
- [HOMOLOGACAO-FINANCEIRO-CHECKLIST.md](./HOMOLOGACAO-FINANCEIRO-CHECKLIST.md)
