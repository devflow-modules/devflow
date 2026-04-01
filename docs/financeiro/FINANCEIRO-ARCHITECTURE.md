# Arquitetura — motores do Financeiro (Smart Dashboard)

Documento curto para alinhar produto e engenharia sobre **score**, **insights** e **checklist**: o que cada um faz, como se relacionam e onde vivem os dados auxiliares.

## Visão dos motores

### Score (0–100)

- Resume **organização do mês** com regras fixas e auditáveis (completude de dados, presença de receitas/despesas, frescor, etc.).
- Saída típica: valor numérico + **faixa** (ex.: crítico / atenção / ok) + **mensagem** que sugere uma ação.
- Implementação: funções puras + testes; sem chamadas de rede dentro do motor.

### Insights

- Lista de **achados** (tipo + severidade + texto) derivados do mesmo universo de dados que alimenta o score.
- Podem destacar o mesmo problema que o score penaliza, mas em formato **legível e priorizado** para a UI.
- Também determinísticos: mesma entrada → mesma lista de insights.

### Checklist

- Conjunto de **itens acionáveis** (ex.: “Registrar receita do mês”) com estado concluído/pendente.
- Pode cruzar regras simples com o que o usuário já cadastrou no mês.
- Guia o “próximo passo” sem depender de modelo de linguagem.

## Relação entre eles

```
                    ┌─────────────┐
   dados do mês ───►│   Score     │───► número + faixa + ação resumida
        │           └─────────────┘
        │
        ├──────────►┌─────────────┐
        │           │  Insights   │───► lista de alertas / dicas
        │           └─────────────┘
        │
        └──────────►┌─────────────┐
                    │ Checklist   │───► passos com progresso
                    └─────────────┘
```

- Os três consomem **entradas coerentes** (mesmo período, mesmas regras de “mês atual”).
- Testes de **consistência cruzada** garantem que mensagens de score, insights e itens do checklist não se contradizem para um mesmo snapshot de dados.

## Decisão: regras simples, sem IA

- **Previsibilidade:** comportamento explicável em suporte e demo.
- **Custo e compliance:** sem dependência de API de LLM para o núcleo do produto.
- **Testabilidade:** matrizes de entrada/saída e regressão clara no CI.

IA pode entrar depois como **camada opcional** (ex.: texto mais rico), nunca como fonte da verdade do score.

## Storage (cliente)

| Mecanismo | Uso típico |
|-----------|------------|
| **Cookie** | Última rota / contexto de navegação dentro do Financeiro (quando aplicável no app). |
| **localStorage** | Ações recentes / “continuar de onde parei”, preferências leves que não precisam de servidor. |

Não substituem o banco: são **UX** e retomada de fluxo no dispositivo.

## Analytics (eventos principais)

- Eventos alinhados ao funil e ao uso do produto (ferramenta, dashboard, ações rápidas, conversão, etc.).
- Catálogo e convenções: [`FINANCEIRO-PRODUCT-ANALYTICS.md`](./FINANCEIRO-PRODUCT-ANALYTICS.md).

## Leitura adicional

- Módulo completo (pastas, camadas): [`FINANCEIRO-MODULE-ARCHITECTURE.md`](./FINANCEIRO-MODULE-ARCHITECTURE.md)
- Especificação de produto: [`FINANCEIRO-PRODUCT-SPEC.md`](./FINANCEIRO-PRODUCT-SPEC.md)
