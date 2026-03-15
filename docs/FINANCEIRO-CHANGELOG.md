# Changelog — Módulo Financeiro DevFlow

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e o projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [Unreleased]

### Planejado
- Categorias configuráveis
- Orçamento por categoria
- Importação CSV

---

## [0.1.0] - TBD

### Adicionado
- Autenticação (OAuth + email/senha)
- Households (criar, trocar, múltiplas casas)
- Fontes PJ/PF com ciclos e dias de recebimento
- Receitas e despesas com CRUD completo
- Regras de rateio (percentual, por fonte)
- Dashboard com cards, evolução mensal, fluxo por categoria
- Projeção de fluxo de caixa (cenários base, pessimista, otimista)
- Metas de alocação (família + pessoal)
- Convites e aceite por link
- Transferência de titularidade
- Ferramentas públicas (divisão de contas, projeção, despesas fixas)

### Documentação
- Arquitetura MVP
- Mapa de APIs
- Modelo de dados
- Checklist e protocolo de homologação
- Product Spec

---

## Convenção de versão

- **MAJOR** (1.0.0): Mudanças incompatíveis, breaking changes
- **MINOR** (0.2.0): Novas funcionalidades compatíveis
- **PATCH** (0.1.1): Correções e ajustes compatíveis

**Exemplos:**
- `v0.1.0` — MVP inicial
- `v0.2.0` — Regras avançadas, categorias
- `v0.3.0` — Projeções aprimoradas, importação
- `v1.0.0` — Versão pública, produto comercial
