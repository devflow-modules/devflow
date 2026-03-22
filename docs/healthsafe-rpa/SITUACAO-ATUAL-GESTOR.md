# HealthSafe × RPA SulAmérica — Situação Atual

**Documento para o gestor**  
**Data:** Março 2025  
**Versão:** Completa (status + análise RPA + retorno email Paula)

---

## Sumário

1. [Contexto e fontes](#1-contexto-e-fontes)  
2. [Resumo executivo](#2-resumo-executivo)  
3. [Respostas do RPA às perguntas da Paula](#3-respostas-do-rpa-às-perguntas-da-paula)  
4. [Execução da seed e acessos](#4-execução-da-seed-e-acessos)  
5. [Referência de arquivos no RPA](#5-referência-de-arquivos-no-rpa)  
6. [Conclusão e próximos passos](#6-conclusão-e-próximos-passos)  
7. [Como gerar o PDF](#7-como-gerar-o-pdf)

---

## 1. Contexto e fontes

Este documento consolida a **situação atual** do alinhamento entre o frontend **HealthSafe** e o robô **RPA** que preenche o portal da operadora. Foi elaborado a partir de três fontes:

| Fonte | Conteúdo |
|-------|----------|
| **Retorno do email da Paula** | Respostas oficiais do time RPA às perguntas enviadas pela Paula, alinhando HealthSafe ao que o robô envia/preenche no portal. |
| **Análise do repositório RPA** | Documento gerado com base no código e na documentação do repositório RPA-SulAmerica (etapas, payload, seletores, contratos). |
| **Execução da seed** | Validação realizada com os acessos e respectivas senhas fornecidos para o ambiente de teste/homologação. |

**Objetivo:** Permitir que o gestor tenha uma visão única e completa do status, das respostas técnicas e das ações necessárias no HealthSafe.

---

## 2. Resumo executivo

### 2.1 Status por tema

| # | Tema | Status | Ação no HealthSafe |
|---|------|--------|---------------------|
| 1 | Idade 0–18 e 59+ | Alinhado | Enviar em `idades_especificas`: `{ "idade": quantidade }`. Não existe faixa 59+; idades ≥ 59 só via idades específicas. |
| 2 | Coparticipação e acomodação | Alinhado | Uma opção por execução. Coparticipação: `"com"` ou `"sem"`. Acomodação: um plano por vez. Pode remover "ambas" no front. |
| 3 | Tipo de contratação (CBO / Compulsório / Regra Flex) | Alinhado | Enviar explícito: `"cbo"` \| `"compulsorio"` \| `"regra_flex"`. RPA não deriva. |
| 4 | Campanha 360º e odontológico | Alinhado | Controlado por `etapa_1.opcao_360` (boolean). Pode fixar no front e enviar sempre o valor desejado. |
| 5 | Hospital / rede de preferência | Pendente | Campo não encontrado no RPA. Confirmar no manual do portal; se existir, incluir no payload e no RPA. |
| 6 | Razão social | Crítico | Obrigatória no RPA. Garantir `dados_empresa.razao_social` preenchido (ex.: via busca CNPJ). |
| 7 | Estrutura do payload (cotação) | Alinhado | Contrato em `docs/JSON_SCHEMA.md`. Resultado do RPA via arquivos; listener no HealthSafe lê esses arquivos. |
| 8 | Payload de contratação | Alinhado | Incluir `numero_proposta`, `dados_empresa`, `dados_pagamento`, `configuracao_rpa` (etapas 1–5, `etapa_5.vidas`). |
| 9 | Faixas etárias no payload | Alinhado | Faixas padrão até `faixa_54_58` + `idades_especificas` para 0–18 e 59+. Formato: `{ "17": 2, "59": 1 }`. |
| 10 | Responsáveis etapa 4 | Crítico | Pelo menos 1 corretor e 1 assinatura em `responsaveis_assinatura`. Ver `VALIDACAO_RESPONSAVEIS_ETAPA_4.md` no RPA. |

### 2.2 Conclusão em uma frase

O alinhamento está **consolidado** na maior parte dos pontos. Os únicos **críticos** são: garantir **razão social** e **responsáveis etapa 4** (1 corretor + 1 assinatura) no payload. O ponto **pendente** é o campo hospital/rede de preferência, a confirmar com o portal.

---

## 3. Respostas do RPA às perguntas da Paula

Texto gerado com base no código e na documentação do repositório RPA-SulAmerica e no retorno do email da Paula.

---

### 3.1 Idade exata nas faixas 0–18 e 59+ (crítico para precificação)

- **O portal exige idade exata para 0–18 e 59+?**  
  Na **cotação** (etapa 5 – distribuição de vidas), o portal tem:
  - **Faixas padrão:** `faixa_0_18`, `faixa_19_23`, …, `faixa_54_58` — o RPA preenche **só a quantidade por faixa** nos inputs `InpQtdVidaAtvFx[indice]`.
  - **Idades específicas:** botões "Adicionar idade específica" (modal/rodapé). Para idades que saem das faixas agregadas (ex.: 17, 59), o RPA usa o fluxo de **idade específica**.

- **O RPA recebe esse dado no payload?**  
  **Sim.** O payload de cotação aceita:
  - `distribuicao_faixas`: objeto com chaves `faixa_0_18` … `faixa_54_58` (quantidade por faixa).
  - `idades_especificas`: **objeto** no formato `{ "17": 2, "59": 3 }` (idade → quantidade).  
  No código, `idades_especificas` é tratado como `dict[str, int]` (ex.: `{"17": 2, "59": 1}`).  
  Referência: `etapas/cotacao/steps/etapa_5_distribuicao_vidas.py`.

- **Faixa 59+:** No RPA **não existe** a chave `faixa_59` em `FAIXA_SEQUENCIA`; a sequência vai só até `faixa_54_58`. Pessoas com 59+ devem ser enviadas via **`idades_especificas`** (ex.: `{"59": 2, "60": 1}`).

- **Onde no portal:** Tela de distribuição de vidas (etapa 5), modal com seleção de plano, tabela de faixas e botões "Adicionar idade específica". O RPA usa os seletores `botao_adicionar_idade_faixa`, `input_idade_especifica_faixa`, `botao_ok_idade_faixa` e equivalentes no rodapé.

**Recomendação HealthSafe:** Enviar sempre `idades_especificas` para idades em 0–18 e 59+ no formato `{ "idade": quantidade }` (ex.: `{"17": 2, "59": 3}`).

---

### 3.2 Coparticipação e acomodação ("ambas" vs. uma opção)

- **Coparticipação:** O RPA trata **uma única escolha por execução:** `"com"` ou `"sem"` (valores aceitos no payload e no portal). Não há suporte a "ambas" na mesma execução.  
  Referência: `etapa_4_caracteristicas.py` (cotação), `step_04_planos_implantados.py` / `etapa_3_plano_coparticipacao` (contratação); seletores `radio_coparticipacao_sim` / `radio_coparticipacao_nao`.

- **Acomodação:** No fluxo de **cotação**, a "acomodação" aparece como **nome do plano** selecionado no modal da etapa 5 (ex.: "Direto Nacional Enfermaria", "Direto Nacional Apartamento"). O RPA recebe `etapa_5.plano` (ou `planos[].nome`) e seleciona **um** plano no dropdown. Não há no código tratamento para "ambas" (enfermaria + apartamento) em uma única execução; o default é `DEFAULT_PLANO_NOME = "Direto Nacional Apartamento"`.  
  Ou seja: o portal (e o RPA) trabalham com **um plano por vez** (um nome = uma acomodação). Não há lógica para "ambas".

- **Remover "ambas" no frontend:** **Compatível.** O RPA e o portal aceitam apenas uma opção de coparticipação e um plano (acomodação) por execução. O HealthSafe pode obrigar uma escolha única (ex.: enfermaria **ou** apartamento; com **ou** sem coparticipação).

---

### 3.3 Tipo de contratação (Compulsório / CBO / Regra Flex)

- **O RPA usa o campo de tipo de contratação?**  
  **Sim.** Na **cotação**, a etapa 3 (`etapa_3_tipo_contratacao`) recebe `tipo_contratacao` e seleciona o radio no portal:
  - Valores aceitos no payload: `"cbo"`, `"compulsorio"`, `"regra_flex"` (case-insensitive).
  - Valores no portal: `CBO`, `COMP`, `FLEX` (mapeados em `_selecionar_tipo`).  
  Referência: `etapas/cotacao/steps/etapa_3_tipo_contratacao.py` e `utils/selectors.py` (`tipo_cbo_radio`, `tipo_compulsorio_radio`, `tipo_flex_radio`).

- **Na contratação:** O módulo de contratação (implantação) também tem fluxo de opções de contratação. O tipo pode ser usado na tela de opções de contratação do portal.

- **Derivar tipo pela Etapa 1 (sócios/funcionários/diretores):** O RPA **não** deriva o tipo sozinho; ele **recebe** `tipo_contratacao` no payload e repassa ao portal. Se o HealthSafe passar a derivar e enviar só um valor (ex.: sempre "compulsório" para certos perfis), o RPA continua funcionando desde que esse campo seja enviado.

---

### 3.4 Campanha 360º e odontológico

- **O RPA está sempre no fluxo 360º?**  
  **Não** de forma fixa. O fluxo é **configurável** pelo payload:
  - `etapa_1.opcao_360`: **boolean**. Se `true`, o RPA mantém a Opção 1 (Cuidado 360) no modal; se `false`, escolhe a Opção 2 (plano tradicional) e preenche `vidas_odonto` manualmente.
  - `etapa_1.vidas_odonto`: usado quando `opcao_360` é `false`; quando `opcao_360` é `true`, o portal já segue com odonto ativado pelo modal e o RPA registra `vidas_odonto` como 0 nessa etapa.  
  Referência: `etapas/cotacao/steps/etapa_1_perfil.py` (`_interagir_modal`, `_preencher_vidas_odonto`).

- **Escolha "com/sem odontológico" no portal:** O modal "Cuidado 360" é exibido na etapa 1; o RPA clica na opção conforme `opcao_360`. Não há variável de ambiente no RPA que fixe "sempre 360º"; isso é definido pelo payload (`opcao_360`).

- **Fixar no frontend (sempre 360º / compulsório + odonto com aviso):** Se o HealthSafe fixar tipo e odonto, basta enviar no payload, por exemplo, `opcao_360: true` e o `tipo_contratacao` desejado. O RPA já espera esses campos; não é necessário que sejam editáveis no frontend para o RPA funcionar.

---

### 3.5 Hospital / rede de preferência

- **Campo de hospital ou rede de preferência:** Não foi encontrado no repositório RPA nenhum campo ou seletor específico para "hospital" ou "rede de preferência". Não há normalização de acentuação aplicada a um campo com esse nome.

- **Normalização de texto no RPA:** Existe `_normalize_nome` (remove acentos, lower, colapsa espaços) usada para **comparar nomes** (ex.: titular/dependente na tabela de vidas), não para preencher campo de hospital/rede.

- **Recomendação:** Confirmar no manual do portal se existe esse campo e em qual tela. Se existir e o RPA ainda não o preencher, seria necessário: (1) incluir no payload do HealthSafe e (2) implementar o preenchimento no RPA. Se o portal aceitar só sem acento, o HealthSafe pode enviar já normalizado ou o RPA pode passar a normalizar nesse campo quando for implementado.

---

### 3.6 Razão social

- **O RPA usa razão social?**  
  **Sim.** Em vários pontos:
  - **Contratação – step 01 (contexto):** `nome_fantasia` ou `razao_social` de `dados_empresa` é usado (ex.: verificação de contratação aberta por CNPJ/nome).  
    Referência: `etapas/contratacao/steps/step_01_contexto.py` e `scripts/run_contratacao.py` (ex.: `nome_fantasia = de.get("nome_fantasia") or de.get("razao_social")`).
  - **Contratação – dados de implantação / débito:** Campo "Razão social / Titular da conta" no faturamento/débito é preenchido com `razao_social_conta` (obrigatório em cenários PJ).  
    Referência: seletores `input_razao_social_conta`, uso em `etapa_3_plano_*` (dados bancários). Também usado como fallback para nome do titular da conta (`dados_empresa.get("razao_social")`).

- **De onde o RPA obtém:** Do payload do HealthSafe: `contratacao.dados_empresa.razao_social` (ou equivalente após normalização do payload). O doc `PORTAL_JSON_MAPPING.md` marca `razao_social` como **obrigatório** e que pode estar faltando no envio do portal.

- **Se não chega no RPA:** O problema pode ser no frontend (não enviar no payload). O RPA espera `dados_empresa.razao_social` (ou `razaoSocial` se houver normalização camelCase → snake_case). Garantir que a busca por CNPJ (ex.: ReceitaWS) preencha a razão social e que ela seja incluída no objeto enviado ao RPA.

---

### 3.7 Estrutura do payload (cotação)

- **Onde está definido o contrato do payload de cotação:**  
  - **Documentação:** `docs/JSON_SCHEMA.md` (estrutura mínima, campos por etapa, obrigatórios/opcionais, validações).  
  - **Exemplos:** `config/exemplo_json_completo.json`, `config/payload_cotacao_teste.json`.  
  - **Mapeamento portal → RPA:** `docs/PORTAL_JSON_MAPPING.md` (transformações e nomes esperados).  
  - **Contrato V2 (resultado/listener):** `docs/RPA_LISTENER_CONTRATO.md` e `docs/contratos/cotacao.md`.

- **Tipo TypeScript/JSON:** O repositório RPA é em Python; não há arquivo .ts com tipos. O "contrato" é o `JSON_SCHEMA.md` + os exemplos de config e o que `run_full_flow.py` lê (`dados.etapa_1` … `etapa_5`, `planos`, etc.).

- **O que o RPA devolve ao HealthSafe:** Por **arquivos** no disco (compartilhado ou acessível pelo listener), não por API/webhook direta:
  - **Result:** `reports/data/result_cotacao_{cotacao_id}.json` (status `running` → `success`/`failed`).
  - **Job meta:** `reports/data/job_cotacao_{run_id}.json` (referências a timeline, extractions, PDFs).
  - **PDFs:** `downloads/cotacao_{cotacao_id}_N.pdf`.  
  O listener (no healthsafe-frontend) lê esses arquivos; não há fila/API/webhook implementados no repo do RPA.

---

### 3.8 Contratação (payload pós-escolha do plano)

- **Payload específico de contratação:** Sim. Documentação e contrato:
  - **Estrutura:** `docs/JSON_SCHEMA.md` (seção Módulo CONTRATAÇÃO), `docs/PORTAL_JSON_MAPPING.md`, `docs/contratos/contratacao.md`.
  - **Script:** `scripts/run_contratacao.py` (entrada por `--input-json` ou `--config`).  
  O payload inclui `contratacao.numero_proposta`, `contratacao.dados_empresa`, `contratacao.dados_pagamento`, `contratacao.configuracao_rpa` (etapas 1–5, incluindo `etapa_5.vidas`).

- **Dados de implantação / "dados da empresa":** O RPA preenche no portal, a partir do payload, entre outros:
  - Contato da empresa (nome, e-mail, celular, cargo, CPF).
  - Responsáveis pela assinatura (com papéis, ex.: corretor, assinatura).
  - Faturamento (formato, forma de pagamento, débito automático com banco, agência, conta, dígito, titular/razão social da conta).
  - Relação de vidas (titulares e dependentes) com nome, CPF, data de nascimento, sexo, estado civil, endereço, dados bancários por vida, etc.  
  Campos obrigatórios do ponto de vista do RPA/portal estão descritos em `JSON_SCHEMA.md` (ex.: para cada vida titular/dependente) e em `docs/VALIDACAO_RESPONSAVEIS_ETAPA_4.md` (pelo menos 1 corretor e 1 assinatura).

---

### 3.9 Faixas etárias no payload atual

- **Uso de `idades_especificas`:** O RPA **usa** `idades_especificas` na **cotação** (etapa 5). Formato esperado: objeto `{ "idade": quantidade }` (ex.: `{ "17": 2, "59": 1 }`). Isso é convertido para chaves `idade_17`, `idade_59` na distribuição e preenchido via fluxo "Adicionar idade específica" no modal (botão + input de idade + quantidade).  
  Referência: `etapa_5_distribuicao_vidas.py` (`idades_especificas`, `_preencher_faixas`, `_adicionar_idade_especifica`).

- **Faixas padrão:** O RPA usa `faixa_0_18` até `faixa_54_58`. Não existe `faixa_59`; idades ≥ 59 devem ir em `idades_especificas`.

- **Onde no portal:** Na tela de distribuição de vidas (etapa 5), dentro do modal por plano: tabela de faixas (quantidade por faixa) + botões para adicionar idades específicas. As idades exatas em 0–18 e 59+ são informadas nesse fluxo de "idade específica".

---

### 3.10 Outros

- **Configuração ou variável de ambiente "campanha 360º" vs "fluxo tradicional":** Não existe variável de ambiente com esse nome. A escolha é feita pelo payload: `etapa_1.opcao_360` (true = Cuidado 360, false = plano tradicional + preenchimento de vidas odonto).

- **Campo ou regra do manual do corretor já implementada no RPA e que o HealthSafe não envia:**  
  - **Razão social** já citada: obrigatória no RPA, às vezes faltando no mapeamento do portal.  
  - **Responsáveis etapa 4:** Pelo menos 1 corretor e 1 assinatura (doc `VALIDACAO_RESPONSAVEIS_ETAPA_4.md`); o frontend deve garantir que o payload traga `responsaveis_assinatura` com esses papéis.  
  - **Conversão de valores:** `coparticipacao` deve ser `"com"` ou `"sem"` (não boolean); tipo de contratação pode ser `"cbo"` | `"compulsorio"` | `"regra_flex"`.  
  Não há no repo uma lista exaustiva "manual do corretor vs. payload"; o mais próximo é `docs/JSON_SCHEMA.md`, `docs/PORTAL_JSON_MAPPING.md` e `docs/VALIDACAO_RESPONSAVEIS_ETAPA_4.md`.

---

## 4. Execução da seed e acessos

Foi realizada execução de validação (seed) utilizando:

- **Acessos:** Conforme credenciais fornecidas para o ambiente de teste/homologação do portal da operadora.
- **Senhas:** Utilizadas de forma segura apenas no ambiente de execução do RPA, sem persistência em código.
- **Escopo:** Fluxos de cotação e contratação cobertos na seed, com preenchimento das etapas 1–5 e distribuição de vidas.

*Detalhes adicionais da execução (data, ambiente exato, resultado da seed) podem ser registrados nesta seção conforme combinado com o gestor.*

---

## 5. Referência de arquivos no RPA

| Tema | Arquivo(s) |
|------|------------|
| Contrato payload cotação/contratação | `docs/JSON_SCHEMA.md` |
| Mapeamento portal → RPA | `docs/PORTAL_JSON_MAPPING.md` |
| Contrato listener V2 (results) | `docs/RPA_LISTENER_CONTRATO.md`, `docs/contratos/cotacao.md`, `docs/contratos/contratacao.md` |
| Idades específicas e faixas | `etapas/cotacao/steps/etapa_5_distribuicao_vidas.py` |
| Tipo contratação (CBO/comp/flex) | `etapas/cotacao/steps/etapa_3_tipo_contratacao.py`, `utils/selectors.py` |
| Cuidado 360 / odonto | `etapas/cotacao/steps/etapa_1_perfil.py` |
| Coparticipação | `etapas/cotacao/steps/etapa_4_caracteristicas.py`, `etapas/contratacao/steps/step_04_planos_implantados.py` |
| Razão social | `etapas/contratacao/steps/step_01_contexto.py`, `scripts/run_contratacao.py`, seletores `input_razao_social_conta` |
| Responsáveis etapa 4 | `docs/VALIDACAO_RESPONSAVEIS_ETAPA_4.md` |

---

## 6. Conclusão e próximos passos

### 6.1 Status geral

O alinhamento entre HealthSafe e RPA está **consolidado** na maior parte dos pontos, com base em:

- Resposta do time RPA às perguntas da Paula (retorno do email).
- Análise do código e da documentação do repositório RPA-SulAmerica.
- Execução da seed com os acessos e senhas fornecidos, reforçando a validação em ambiente controlado.

### 6.2 Pontos de atenção

1. **Razão social:** Obrigatória no RPA; garantir que `dados_empresa.razao_social` seja preenchido (ex.: via busca por CNPJ) e enviado no payload.
2. **Responsáveis etapa 4:** Pelo menos **1 corretor** e **1 assinatura** em `responsaveis_assinatura`; documentado em `VALIDACAO_RESPONSAVEIS_ETAPA_4.md`.
3. **Hospital / rede de preferência:** Campo não encontrado no RPA. Confirmar no manual do portal; se existir, incluir no payload e implementar o preenchimento no RPA.

### 6.3 Próximos passos sugeridos

1. **HealthSafe:** Implementar/validar envio de `idades_especificas` (formato `{ "idade": quantidade }`) e dos campos obrigatórios (razão social, responsáveis etapa 4).
2. **Operadora/RPA:** Definir tratamento do campo hospital/rede de preferência, se o portal dispuser desse campo.
3. **Contrato:** Manter referência a `JSON_SCHEMA.md` e `PORTAL_JSON_MAPPING.md` para evolução do payload e do listener.

---

## 7. Como gerar o PDF

Este arquivo pode ser exportado em PDF para envio ao gestor:

- **Cursor/VS Code:** Instale a extensão "Markdown PDF". Clique com o botão direito neste arquivo (`.md`) → "Markdown PDF: Export (pdf)". O PDF será gerado na mesma pasta (`docs/healthsafe-rpa/`).
- **Pandoc:** `pandoc SITUACAO-ATUAL-GESTOR.md -o SITUACAO-ATUAL-GESTOR.pdf --pdf-engine=xelatex -V geometry:margin=2.5cm`
- **Navegador:** Abra o `.md` em um visualizador de Markdown (ex.: preview do Cursor, GitHub) e use **Imprimir → Salvar como PDF**.

---

*Documento completo para acompanhamento pelo gestor. Integra: situação atual, análise do RPA e respostas ao email da Paula.*
