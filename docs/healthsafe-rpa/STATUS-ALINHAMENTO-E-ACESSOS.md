# HealthSafe × RPA SulAmérica — Status e Alinhamento

**Documento para gestão**  
**Data:** Março 2025  
**Fontes:** Resposta do time RPA às perguntas da Paula, documentação do repositório RPA-SulAmerica, execução da seed com acessos e senhas fornecidos.

---

## 1. Objetivo

Documentar o status do alinhamento entre o frontend **HealthSafe** e o que o **robô RPA** envia/preenche no portal da operadora, com base em:

- Respostas oficiais do time RPA às perguntas enviadas
- Código e documentação do repositório RPA-SulAmerica
- Execução da **seed** com os acessos e respectivas senhas fornecidos para validação

---

## 2. Execução da seed e acessos

Foi realizada execução de validação (seed) utilizando:

- **Acessos:** Conforme credenciais fornecidas para o ambiente de teste/homologação do portal da operadora
- **Senhas:** Utilizadas de forma segura apenas no ambiente de execução do RPA, sem persistência em código
- **Escopo:** Fluxos de cotação e contratação cobertos na seed, com preenchimento das etapas 1–5 e distribuição de vidas

*Detalhes adicionais da execução (data, ambiente exato, resultado da seed) podem ser registrados nesta seção conforme combinado com o gestor.*

---

## 3. Status do alinhamento — visão geral

| # | Tema | Status | Ação no HealthSafe |
|---|------|--------|---------------------|
| 1 | Idade 0–18 e 59+ | Alinhado | Enviar em `idades_especificas`: `{ "idade": quantidade }`. Não existe faixa 59+; idades ≥ 59 só via idades específicas. |
| 2 | Coparticipação e acomodação | Alinhado | Uma opção por execução. Coparticipação: `"com"` ou `"sem"`. Acomodação: um plano por vez. Pode remover "ambas" no front. |
| 3 | Tipo de contratação (CBO / Compulsório / Regra Flex) | Alinhado | Enviar explícito: `"cbo"` \| `"compulsorio"` \| `"regra_flex"`. RPA não deriva. |
| 4 | Campanha 360º e odontológico | Alinhado | Controlado por `etapa_1.opcao_360` (boolean). Pode fixar no front e enviar sempre o valor desejado. |
| 5 | Hospital / rede de preferência | Pendente | Campo não encontrado no RPA. Confirmar no manual do portal; se existir, incluir no payload e no RPA. |
| 6 | Razão social | Crítico | Obrigatória no RPA. Garantir `dados_empresa.razao_social` preenchido (ex.: via busca CNPJ). |
| 7 | Estrutura do payload (cotação) | Alinhado | Contrato em `docs/JSON_SCHEMA.md`. Resultado do RPA via arquivos (`result_cotacao_*.json`, PDFs); listener no HealthSafe lê esses arquivos. |
| 8 | Payload de contratação | Alinhado | Incluir `numero_proposta`, `dados_empresa`, `dados_pagamento`, `configuracao_rpa` (etapas 1–5, `etapa_5.vidas`). |
| 9 | Faixas etárias no payload | Alinhado | Faixas padrão até `faixa_54_58` + `idades_especificas` para 0–18 e 59+. Formato: `{ "17": 2, "59": 1 }`. |
| 10 | Responsáveis etapa 4 | Crítico | Pelo menos 1 corretor e 1 assinatura em `responsaveis_assinatura`. Ver `VALIDACAO_RESPONSAVEIS_ETAPA_4.md` no RPA. |

---

## 4. Detalhes por tema (resposta do RPA)

### 4.1 Idade exata nas faixas 0–18 e 59+

- O portal exige quantidade por **faixa** (0–18, 19–23, …, 54–58) e, para idades fora das faixas agregadas, **idades específicas** (ex.: 17, 59).
- O RPA **não** possui chave `faixa_59`; a sequência vai até `faixa_54_58`. Pessoas com 59+ devem ser enviadas via **`idades_especificas`** (ex.: `{"59": 2, "60": 1}`).
- **Recomendação HealthSafe:** Sempre enviar `idades_especificas` para idades em 0–18 e 59+ no formato `{ "idade": quantidade }`.

### 4.2 Coparticipação e acomodação

- **Coparticipação:** Uma única escolha por execução: `"com"` ou `"sem"`. Não há suporte a "ambas" na mesma execução.
- **Acomodação:** Um plano por vez (ex.: enfermaria **ou** apartamento). O RPA seleciona um plano no dropdown; default é "Direto Nacional Apartamento". Remover "ambas" no frontend é compatível.

### 4.3 Tipo de contratação (Compulsório / CBO / Regra Flex)

- O RPA **usa** o campo e seleciona o radio no portal. Valores aceitos: `"cbo"`, `"compulsorio"`, `"regra_flex"` (case-insensitive). O RPA **não** deriva o tipo; recebe do payload e repassa ao portal.

### 4.4 Campanha 360º e odontológico

- **Não** está fixo no RPA. Controlado pelo payload: `etapa_1.opcao_360` (boolean). Se `true`, mantém Cuidado 360; se `false`, plano tradicional e preenchimento de `vidas_odonto`. Se o HealthSafe fixar (ex.: sempre 360º), basta enviar `opcao_360: true`.

### 4.5 Hospital / rede de preferência

- **Não** foi encontrado no repositório RPA nenhum campo ou seletor para "hospital" ou "rede de preferência". Recomendação: confirmar no manual do portal; se existir, incluir no payload e implementar no RPA.

### 4.6 Razão social

- O RPA **usa** em vários pontos (contexto da contratação, dados de implantação/débito, "Razão social / Titular da conta"). Fonte esperada: `dados_empresa.razao_social` (ou equivalente após normalização). É **obrigatória** em cenários PJ. Garantir que a busca por CNPJ preencha a razão social e que ela seja incluída no objeto enviado ao RPA.

### 4.7 Estrutura do payload (cotação)

- **Contrato:** `docs/JSON_SCHEMA.md`, exemplos em `config/exemplo_json_completo.json` e `config/payload_cotacao_teste.json`, mapeamento em `docs/PORTAL_JSON_MAPPING.md`.
- **Resultado:** O RPA devolve por **arquivos** (disco compartilhado ou acessível pelo listener): `reports/data/result_cotacao_{cotacao_id}.json`, `reports/data/job_cotacao_{run_id}.json`, PDFs em `downloads/`. O listener no HealthSafe lê esses arquivos; não há API/webhook direta no repositório do RPA.

### 4.8 Contratação (payload pós-escolha do plano)

- Estrutura em `docs/JSON_SCHEMA.md` (módulo CONTRATAÇÃO), `docs/contratos/contratacao.md`. Script: `scripts/run_contratacao.py`. Inclui dados da empresa, pagamento, configuração RPA (etapas 1–5, incluindo `etapa_5.vidas`), relação de vidas (titulares e dependentes) com todos os campos obrigatórios descritos no schema.

### 4.9 Faixas etárias no payload

- Faixas padrão: `faixa_0_18` até `faixa_54_58`. Idades 0–18 e 59+ em **`idades_especificas`** no formato `{ "idade": quantidade }`. O RPA preenche via fluxo "Adicionar idade específica" no modal da etapa 5.

### 4.10 Responsáveis e outros

- **Responsáveis etapa 4:** Pelo menos **1 corretor** e **1 assinatura** em `responsaveis_assinatura` (doc `VALIDACAO_RESPONSAVEIS_ETAPA_4.md`).
- **Conversão de valores:** `coparticipacao` como string `"com"` ou `"sem"`; tipo de contratação como `"cbo"` \| `"compulsorio"` \| `"regra_flex"`.

---

## 5. Referência rápida de arquivos (repositório RPA)

| Tema | Arquivo(s) |
|------|------------|
| Contrato payload cotação/contratação | `docs/JSON_SCHEMA.md` |
| Mapeamento portal → RPA | `docs/PORTAL_JSON_MAPPING.md` |
| Contrato listener (results) | `docs/RPA_LISTENER_CONTRATO.md`, `docs/contratos/cotacao.md`, `docs/contratos/contratacao.md` |
| Idades específicas e faixas | `etapas/cotacao/steps/etapa_5_distribuicao_vidas.py` |
| Tipo contratação | `etapas/cotacao/steps/etapa_3_tipo_contratacao.py`, `utils/selectors.py` |
| Cuidado 360 / odonto | `etapas/cotacao/steps/etapa_1_perfil.py` |
| Coparticipação | `etapas/cotacao/steps/etapa_4_caracteristicas.py`, `etapas/contratacao/steps/step_04_planos_implantados.py` |
| Razão social | `etapas/contratacao/steps/step_01_contexto.py`, `scripts/run_contratacao.py` |
| Responsáveis etapa 4 | `docs/VALIDACAO_RESPONSAVEIS_ETAPA_4.md` |

---

## 6. Conclusão e próximos passos

- **Status geral:** Alinhamento entre HealthSafe e RPA está **consolidado** na maior parte dos pontos, com base na resposta do time RPA e na documentação do repositório. A execução da seed com os acessos e senhas fornecidos reforça a validação em ambiente controlado.
- **Pontos de atenção:** (1) Garantir **razão social** e **responsáveis etapa 4** (1 corretor + 1 assinatura) no payload; (2) Confirmar com o portal/operadora a existência do campo **hospital/rede de preferência** e, se aplicável, incluir no payload e no RPA.
- **Próximos passos sugeridos:** (1) HealthSafe implementar/validar envio de `idades_especificas` e campos obrigatórios; (2) Definir com operadora/RPA o tratamento do campo hospital/rede, se houver; (3) Manter referência a `JSON_SCHEMA.md` e `PORTAL_JSON_MAPPING.md` para evolução do contrato.

---

*Documento gerado para acompanhamento pelo gestor. Para gerar o PDF, use a seção abaixo.*

---

## Como gerar o PDF (para envio ao gestor)

No diretório do repositório (ou onde estiver este arquivo), execute:

```bash
# Com pandoc (instalação: apt install pandoc texlive ou brew install pandoc basictex)
pandoc docs/healthsafe-rpa/STATUS-ALINHAMENTO-E-ACESSOS.md -o docs/healthsafe-rpa/STATUS-ALINHAMENTO-E-ACESSOS.pdf --pdf-engine=xelatex -V geometry:margin=2.5cm
```

Alternativa sem pandoc: abra o `.md` no VS Code/Cursor, use **File → Print** (ou extensão “Markdown PDF”) e salve como PDF.
