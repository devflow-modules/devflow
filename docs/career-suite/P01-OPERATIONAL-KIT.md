# Kit Operacional — Piloto P01 da Career Suite

**Related:** [`PILOT-RUNBOOK.md`](./PILOT-RUNBOOK.md) · [`PILOT-VALIDATION.md`](./PILOT-VALIDATION.md) · [`UI-UX-POLISH.md`](./UI-UX-POLISH.md)

**Operational status (2026-06-23):** `P01 READY TO SCHEDULE` — PR [#141](https://github.com/devflow-modules/devflow/pull/141) merged on `main` @ `b9fc3b2` (closes [#140](https://github.com/devflow-modules/devflow/issues/140)); Fixture F post-merge smoke passed on `main` Preview. See [`REAL-RESUME-PARSING.md`](./REAL-RESUME-PARSING.md). Production não promovida (`1dfb9de`).

**Preview URL (moderador):** `https://devflow-applyflow-git-main-gustavos-projects-74c68bcc.vercel.app`

---

## 1. Objetivo do piloto

Validar com uma pessoa real se a Career Suite consegue ajudá-la a:

1. compreender melhor o próprio currículo;
2. comparar o perfil com uma vaga real;
3. identificar lacunas e pontos fortes;
4. transformar os achados em um plano de ação;
5. concluir a jornada sem orientação excessiva;
6. confiar no tratamento dos dados e nas limitações do produto.

O piloto testa o produto, não o participante.

---

## 2. Escopo da sessão

### Incluído

- análise de currículo;
- comparação com uma vaga;
- plano de carreira;
- compreensão dos resultados;
- percepção de utilidade;
- confiança e privacidade;
- navegação desktop ou mobile;
- feedback final.

### Fora do escopo

- candidatura automática;
- envio de currículo;
- integração com Gmail;
- integração com Google Calendar;
- automações externas;
- LLM ou provider real;
- alteração automática no currículo;
- persistência silenciosa;
- avaliação técnica do participante;
- promessa de emprego ou contratação.

---

## 3. Perfil ideal do participante P01

O participante deve:

- estar buscando emprego ou considerando uma mudança profissional;
- possuir um currículo atual;
- ter uma vaga real para comparação;
- não ter acompanhado o desenvolvimento da Career Suite;
- não conhecer previamente os fluxos;
- conseguir compartilhar a tela;
- aceitar falar em voz alta durante o uso;
- aceitar participar por aproximadamente 30 minutos.

Evitar como P01:

- pessoa que ajudou no desenvolvimento;
- pessoa que já viu demonstrações detalhadas;
- desenvolvedor que avaliará apenas o código;
- participante sem currículo;
- participante sem uma vaga para comparação;
- pessoa que não possa compartilhar a tela.

---

## 4. Materiais necessários

### Participante

- currículo atualizado;
- descrição ou link de uma vaga real;
- computador ou celular;
- navegador atualizado;
- conexão estável;
- disponibilidade de 30 minutos.

### Moderador

- URL do Preview validado;
- acesso autenticado ao Preview;
- roteiro da sessão;
- ficha de observação;
- cronômetro;
- identificador anônimo do participante;
- plano de contingência;
- local seguro para registrar notas;
- confirmação de que não há dados reais no GitHub.

### Identificação

Usar somente:

```text
P01
```

Não registrar no GitHub:

- nome;
- e-mail;
- telefone;
- currículo completo;
- empresa atual;
- descrição completa da vaga;
- endereço;
- prints com dados pessoais;
- gravações sem autorização.

---

## 5. Convite ao participante

### Mensagem de convite

Olá! Estou validando uma ferramenta que ajuda pessoas a analisar o currículo, comparar o perfil com uma vaga e organizar os próximos passos da carreira.

A sessão dura cerca de 30 minutos e será feita por compartilhamento de tela. O objetivo é testar a ferramenta, não avaliar você.

Você precisará ter:

- um currículo atualizado;
- uma vaga real que considere interessante;
- disponibilidade para falar em voz alta sobre o que está entendendo.

Nenhuma candidatura será enviada e nenhuma alteração será feita automaticamente no seu currículo.

Seu feedback será registrado de forma anônima.

Você teria disponibilidade para participar?

---

## 6. Confirmação da sessão

### Mensagem de confirmação

Sua participação no teste da Career Suite está confirmada.

Data:

Horário:

Duração estimada: 30 minutos

Você precisará ter em mãos:

- seu currículo;
- uma vaga real;
- acesso a um computador ou celular;
- conexão estável.

Durante o teste, vou pedir que compartilhe a tela e diga em voz alta o que está pensando.

Não existe resposta certa ou errada. Estamos avaliando o produto, não você.

Nenhuma candidatura será enviada.

---

## 7. Consentimento inicial

O moderador deve ler este texto antes de iniciar:

> Estamos testando a ferramenta, não seu desempenho. Durante a sessão, quero observar como você entende e utiliza a experiência sem explicar onde clicar.
>
> Vou registrar apenas observações anônimas usando o identificador P01.
>
> Nenhuma candidatura será enviada e nenhuma ação externa será executada.
>
> Seu currículo e a descrição da vaga não serão copiados para o GitHub.
>
> Você pode interromper a sessão a qualquer momento.
>
> Não faremos gravação de áudio, vídeo ou tela sem sua autorização explícita.
>
> Você concorda em participar?

Registrar:

```text
Consentimento para participação: Sim / Não
Consentimento para gravação: Sim / Não / Não solicitado
Consentimento para screenshots sanitizados: Sim / Não
```

Sem consentimento para participação, não iniciar.

---

## 8. Regras do moderador

### O moderador deve

- permanecer neutro;
- observar antes de ajudar;
- pedir que a pessoa pense em voz alta;
- registrar comportamento;
- fazer perguntas abertas;
- interromper apenas em caso de risco ou bloqueio;
- anotar o momento exato de dúvidas;
- separar fatos de interpretações.

### O moderador não deve

- dizer onde clicar;
- explicar o significado do score antes da pessoa;
- defender o produto;
- completar frases do participante;
- sugerir respostas;
- corrigir o currículo;
- transformar a sessão em consultoria de carreira;
- abrir DevTools durante o uso;
- corrigir código durante a sessão;
- pedir dados pessoais desnecessários.

### Frases proibidas

- “Clique aqui.”
- “Agora vá para a vaga.”
- “Esse score significa…”
- “O próximo passo é…”
- “Você deveria preencher assim.”
- “Essa parte funciona desse jeito.”

### Frases neutras permitidas

- “O que você espera que aconteça agora?”
- “O que você está procurando nesta tela?”
- “O que esta mensagem significa para você?”
- “Qual seria sua próxima ação?”
- “O que deixou você em dúvida?”
- “O que você faria sem minha ajuda?”
- “Isso parece útil ou genérico?”
- “O que você esperava encontrar aqui?”

---

## 9. Preflight técnico

Executar de 10 a 15 minutos antes da sessão.

### Ambiente

- [ ] Preview correto aberto
- [ ] Ambiente identificado como `preview`
- [ ] Pilot mode ativo
- [ ] Commit esperado
- [ ] `blockers=[]`
- [ ] Production não está aberta
- [ ] Providers desabilitados
- [ ] LLM desabilitado ou mock
- [ ] Automation desabilitada
- [ ] Database desabilitada
- [ ] Nenhum token visível

### Interface

- [ ] Header da Career Suite aparece
- [ ] CTA principal funciona
- [ ] Stepper aparece
- [ ] Três fluxos aparecem
- [ ] Sem Gmail
- [ ] Sem Calendar
- [ ] Sem OAuth
- [ ] Sem `Approve once`
- [ ] Sem provider consent
- [ ] Sem overflow

### Fluxo mínimo

- [ ] Análise de currículo concluída
- [ ] Loading aparece
- [ ] Resultado aparece
- [ ] Details começa fechado
- [ ] Feedback funciona
- [ ] Retry funciona
- [ ] Sem erro de Console perceptível

### Preparação da sessão

- [ ] Navegador limpo
- [ ] Dados fictícios removidos
- [ ] DevTools fechado
- [ ] Zoom em 100%
- [ ] Sessão autenticada
- [ ] Cronômetro pronto
- [ ] Ficha de observação aberta
- [ ] Plano de contingência disponível

Decisão:

```text
PREFLIGHT PASS
```

ou:

```text
PREFLIGHT FAIL — SESSION POSTPONED
```

**Último preflight automatizado (2026-06-22):** `PREFLIGHT PASS` — `livez`/`readyz`/`health` OK; smoke funcional (entrada, currículo, recovery, feedback, mobile 375) OK no Preview `main` @ `7e5dfbc`.

---

## 10. Estrutura da sessão

### Duração total

```text
25 a 30 minutos
```

### Divisão recomendada

| Etapa                    | Tempo |
| ------------------------ | ----: |
| Abertura e consentimento | 3 min |
| Primeira impressão       | 2 min |
| Análise do currículo     | 6 min |
| Comparação com vaga      | 6 min |
| Plano de carreira        | 5 min |
| Perguntas finais         | 5 min |
| Encerramento             | 2 min |

---

## 11. Roteiro do moderador

### 11.1 Abertura

Dizer:

> Obrigado por participar. Estamos avaliando a ferramenta, não você.
>
> Durante a sessão, tente falar em voz alta sobre o que está pensando, o que espera que aconteça e o que não estiver claro.
>
> Eu vou evitar explicar onde clicar. Caso você fique completamente bloqueado, posso ajudar para continuarmos.

Registrar horário de início.

### 11.2 Primeira impressão

Abrir a tela inicial da Career Suite. Não explicar nada.

Perguntar:

1. “O que você acha que esta ferramenta faz?”
2. “Por onde você começaria?”
3. “O que você espera receber ao final?”
4. “Existe algo que deixa você inseguro nesta primeira tela?”

Observar: CTA, proposta, jornada, privacidade, painel legado, hesitação.

### 11.3 Fluxo de currículo

Pedir: “Use a ferramenta para analisar seu currículo.” Não explicar como preencher.

Observar campos, loading, resultado, score, pontos fortes/melhorias, ações, detalhes técnicos.

Perguntas após o resultado: resumo, ponto mais importante, próxima ação, genericidade, clareza do score.

### 11.4 Fluxo de comparação com vaga

Pedir: “Agora compare seu perfil com uma vaga que seja interessante para você.”

Observar etapa, vaga real, compatibilidade estimada, lacunas, ações, tentativa de execução automática.

Perguntas: significado da compatibilidade, candidatura, mudanças antes de aplicar, confiança, informação faltante.

### 11.5 Fluxo de plano de carreira

Pedir: “Use agora a ferramenta para organizar seus próximos passos profissionais.”

Observar objetivo, disponibilidade, prioridades, plano 30/60/90, realismo das ações.

Perguntas: executabilidade, primeira ação, genericidade, retorno ao produto, expectativa pós-tela.

### 11.6 Feedback

Pedir: “Finalize com o feedback disponível na tela.”

Observar opcionalidade, escala, consentimento, envio, preocupações de privacidade.

---

## 12. Perguntas finais

Fazer após concluir os três fluxos.

### Compreensão

1. Em uma frase, o que a Career Suite faz?
2. Qual foi o resultado mais útil?
3. Qual resultado foi menos útil?
4. Houve algum termo difícil?
5. O score foi fácil de interpretar?

### Utilidade

6. Você identificou uma ação concreta para executar?
7. Usaria novamente com outra vaga?
8. Indicaria para alguém buscando emprego?
9. O que faria você voltar ao produto?

### Confiança

10. Você acredita que alguma candidatura foi enviada?
11. Você acredita que seu currículo foi armazenado?
12. Algo gerou preocupação sobre privacidade?
13. Você confiaria em usar seu currículo real novamente?

### Experiência

14. Em algum momento você não soube o que fazer?
15. Qual tela foi mais confusa?
16. O que removeria?
17. O que adicionaria?
18. De 0 a 10, qual nota daria para a experiência?
19. Por que não deu uma nota maior?
20. Qual foi o principal benefício percebido?

---

## 13. Ficha de observação

### Identificação

```text
Participante: P01
Data:
Horário:
Moderador:
Dispositivo:
Viewport aproximado:
Navegador:
Duração:
```

### Consentimento

```text
Participação autorizada: Sim / Não
Gravação autorizada: Sim / Não / Não solicitada
Screenshots sanitizados autorizados: Sim / Não
```

### Primeira impressão

| Critério                | Resultado                   | Observação |
| ----------------------- | --------------------------- | ---------- |
| Entendeu a proposta     | Sim / Parcial / Não         |            |
| Encontrou o CTA         | Sem ajuda / Com ajuda / Não |            |
| Entendeu as três etapas | Sim / Parcial / Não         |            |
| Percebeu privacidade    | Sim / Não                   |            |
| Tempo até primeira ação |                             |            |

### Fluxo de currículo

| Critério                 | Resultado           | Observação |
| ------------------------ | ------------------- | ---------- |
| Entendeu os campos       | Sim / Parcial / Não |            |
| Preencheu sem ajuda      | Sim / Não           |            |
| Entendeu loading         | Sim / Parcial / Não |            |
| Entendeu o resumo        | Sim / Parcial / Não |            |
| Entendeu o score         | Sim / Parcial / Não |            |
| Identificou ponto forte  | Sim / Não           |            |
| Identificou melhoria     | Sim / Não           |            |
| Identificou próxima ação | Sim / Não           |            |
| Tempo do fluxo           |                     |            |

### Comparação com vaga

| Critério                            | Resultado           | Observação |
| ----------------------------------- | ------------------- | ---------- |
| Encontrou a etapa                   | Sim / Não           |            |
| Entendeu a entrada da vaga          | Sim / Parcial / Não |            |
| Completou sem ajuda                 | Sim / Não           |            |
| Entendeu compatibilidade            | Sim / Parcial / Não |            |
| Confundiu com chance de contratação | Sim / Não           |            |
| Identificou requisitos atendidos    | Sim / Não           |            |
| Identificou lacunas                 | Sim / Não           |            |
| Identificou próxima ação            | Sim / Não           |            |
| Tempo do fluxo                      |                     |            |

### Plano de carreira

| Critério                    | Resultado           | Observação |
| --------------------------- | ------------------- | ---------- |
| Encontrou a etapa           | Sim / Não           |            |
| Entendeu os campos          | Sim / Parcial / Não |            |
| Completou sem ajuda         | Sim / Não           |            |
| Entendeu prioridades        | Sim / Parcial / Não |            |
| Considerou o plano realista | Sim / Parcial / Não |            |
| Identificou primeira ação   | Sim / Não           |            |
| Tempo do fluxo              |                     |            |

### Feedback e confiança

| Critério                          | Resultado           | Observação |
| --------------------------------- | ------------------- | ---------- |
| Entendeu que feedback é opcional  | Sim / Não           |            |
| Entendeu consentimento            | Sim / Parcial / Não |            |
| Acreditou que houve armazenamento | Sim / Não           |            |
| Acreditou que houve candidatura   | Sim / Não           |            |
| Sentiu confiança                  | Sim / Parcial / Não |            |
| Enviou feedback                   | Sim / Não           |            |

### Resultado geral

```text
Completou os três fluxos: Sim / Não
Precisou de ajuda: Nenhuma / Uma vez / Múltiplas vezes
Identificou ação útil: Sim / Não
Entendeu privacidade: Sim / Parcial / Não
Utilizaria novamente: Sim / Talvez / Não
Nota de 0 a 10:
Tempo total:
```

**Nota:** preencher a ficha em armazenamento operacional externo ao Git — nunca commitar PII.

---

## 14. Registro de intervenções

| Horário | Tela | Motivo | Ajuda fornecida | Participante continuou? |
| ------- | ---- | ------ | --------------- | ----------------------- |

Classificação: `N0` nenhuma · `N1` pergunta neutra · `N2` orientação geral · `N3` instrução direta · `N4` moderador executou ação.

---

## 15. Registro de eventos

| ID   | Horário | Fluxo | Evento observado | Impacto |
| ---- | ------- | ----- | ---------------- | ------- |

---

## 16. Registro de evidências

Formato: Fato observado → Frase do participante → Contexto → Interpretação → Severidade → Recomendação.

---

## 17. Classificação dos problemas

| Nível | Decisão |
|-------|---------|
| **P0** | `PILOT STOPPED` |
| **P1** | `PILOT SUSPENDED` |
| **P2** | `CONTINUE AND OBSERVE` |
| **P3** | `BACKLOG CANDIDATE` |

---

## 18. Protocolo de incidente durante a sessão

Erro curto → aguardar → retry uma vez → registrar → continuar se recuperar.

Erro recorrente / P1 / P0 — seguir protocolo do [`PILOT-RUNBOOK.md`](./PILOT-RUNBOOK.md) § Incident severity.

---

## 19. Script de encerramento

> Obrigado pela participação. Seu uso ajudou a identificar como a ferramenta funciona para alguém que não acompanhou o desenvolvimento.
>
> O que estamos avaliando agora é a clareza da experiência, a utilidade dos resultados e a confiança no produto.
>
> Nenhuma candidatura foi enviada.
>
> Suas observações serão registradas de forma anônima como P01.

---

## 20. Avaliação pós-sessão

Métricas e decisão individual: `P01 PASS` · `P01 PASS WITH OBSERVATIONS` · `P01 FAILED — PRODUCT BLOCKER` · `P01 STOPPED — CRITICAL INCIDENT`.

---

## 21. Critérios de sucesso do P01

Sucesso quando: CTA sem ajuda direta, três fluxos completos, compreensão geral, achado relevante, próxima ação, privacidade entendida, ≤30 min, sem P0/P1.

---

## 22. Regra de decisão após P01

| Situação | Decisão |
|----------|---------|
| P0 | `STOP` |
| P1 | `SUSPEND` |
| Apenas P2 | `CONTINUE WITH CAUTION` |
| Apenas P3 | `CONTINUE` |

---

## 23. Resumo executivo do P01

Template: participante, dispositivo, duração, resultado, fluxos, compreensão, privacidade, P0–P3, evidência positiva, dificuldade, frase-chave, decisão `CONTINUE TO P02` / `FIX BEFORE P02` / `STOP PILOT`.

---

## 24. Matriz de decisão do piloto

| Condição | Decisão |
|----------|---------|
| Sem P0/P1, P01 concluiu | Continuar para P02 |
| P2 apenas | Continuar e observar |
| P1 em fluxo principal | Corrigir antes de P02 |
| P0 | Interromper piloto |
| Participante inadequado | Repetir P01 |
| Conexão ruim | Reagendar |
| Erro do moderador | Repetir sessão |

---

## 25. Checklist final do moderador

**Antes:** participante, consentimento, Preview, ficha, cronômetro, contingência.

**Durante:** consentimento lido, cronômetro, pensamento em voz alta, intervenções registradas, sem código.

**Depois:** encerramento, privacidade, ficha, classificação, resumo, sem PII no GitHub, decisão P02.

---

## 26. Status operacional

| Fase | Status |
|------|--------|
| Antes da sessão | `P01 READY TO SCHEDULE` |
| Após agendamento | `P01 SCHEDULED` |
| Durante | `P01 IN PROGRESS` |
| Após conclusão | `P01 COMPLETED — REVIEW PENDING` |
| Após avaliação | `P01 PASS — CONTINUE TO P02` / `P01 PASS WITH OBSERVATIONS` / `P01 FAILED — FIX BEFORE P02` / `PILOT STOPPED` |

**Estado atual (2026-06-23):** `P01 READY TO SCHEDULE`
