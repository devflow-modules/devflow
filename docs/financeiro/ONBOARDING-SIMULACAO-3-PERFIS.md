# Simulação guiada — 3 perfis (onboarding Financeiro)

**Data:** 2026-03-31 · **Ambiente:** `localhost:3000` (Next dev)  
**Metodologia:** abrir o app como usuário, seguir roteiros, anotar hesitação.  
**Limite desta rodada:** o dashboard exige sessão; ao acessar `/ferramentas/financeiro/dashboard` houve **redirect para `/ferramentas/financeiro/auth`**. Abaixo: observação **real** dessa barreira + inferências **estruturais** a partir do código (banner, ordem dos blocos, CTAs duplicados).

---

## Perfil 1 — Leigo

- **Travou em:**  
  - **Antes do produto:** não entrou no dashboard sem login — primeira tela útil foi **Entrar** (e-mail/senha ou Google), não o onboarding. Para quem “só quer ver o financeiro”, isso é fricção zero.  
  - **Possível após login (código):** se existir **casa** mas fluxo de “Casa” ainda não estiver claro, a mensagem *“Nenhuma casa ativa…”* é outro ponto de parada (não é o banner de mês vazio).  
  - **Dois caminhos para a mesma ação:** o banner manda para **Lançamentos** (`#nova-receita` / `#nova-despesa`); a **seção operacional** (abaixo do checklist) também oferece atalhos — leigo pode hesitar *“uso o de cima ou o de baixo?”*.

- **Não entendeu (risco):**  
  - No copy inicial do banner aparecem os termos **“score”** e **“alertas”** antes do usuário ver os blocos — pode soar abstrato em 3–5 s (depende de ler o parágrafo inteiro).  
  - **“Organização do mês”** no score (painel) vs **“Seu mês ainda não começou”** (banner) — conceitos alinhados, mas nomes diferentes podem pedir uma leitura a mais.

- **Ponto forte:**  
  - Banner no **topo**, acima do score — ordem correta para “mensagem → ação”.  
  - CTAs explícitos **“Adicionar receita / despesa”** (verbos claros).  
  - Após a sequência, o texto de celebração **liga explicitamente** número / alertas / checklist.

---

## Perfil 2 — Prático

- **Ignorou (provável):**  
  - Parágrafo longo do banner inicial (usuário que “só quer clicar” pode ir direto nos botões ou descer para **ações rápidas**).  
  - Breadcrumbs e título **“Visão financeira do mês”** mais abaixo na página — o valor imediato está no topo (score + insights), mas o **hero textual** do dashboard fica **depois** de muita coisa; prático pode nem rolar até lá.

- **Foi rápido em (se autenticado):**  
  - Dois botões grandes no banner → uma navegação com hash para formulário.  
  - Google na auth (se usar) reduz atrito de cadastro.

- **Usaria ou não:**  
  - **Sim**, se em &lt; 1 minuto conseguir **duas ações** e ver o score mudar.  
  - **Risco:** se já tiver dados no mês, `localStorage` pode estar em `completed` e o **banner some** — prático não “vê” onboarding; ok para retorno, mas testes de “primeira vez” precisam **limpar** `financeiro_onboarding_step` ou usar perfil novo.

---

## Perfil 3 — Exigente

- **Confiou em:**  
  - Tom de produto consistente (sem prometer IA mágica no banner).  
  - Checklist e insights amarrados a **dados reais** (motores determinísticos no código).

- **Desconfiou de (a validar com dados reais):**  
  - **Score** sem “por quê” na primeira dobra — o painel tem breakdown/expansão, mas exigente pode querer **uma linha** do tipo “baseado em X critérios” ainda na celebração.  
  - **Insights** podem parecer genéricos se os dados forem mínimos — precisa de sessão com cenários variados (só receita, só despesa, atraso, etc.).

- **Crítica principal (hipótese):**  
  - *“É útil, mas quero saber **o peso** de cada coisa no score sem abrir tudo.”* — gap de **transparência em uma frase** na fase de primeira impressão.

---

## Melhorias claras (3–5) — saída da simulação

1. **Barreira pré-onboarding:** tratar **auth + casa** como parte da “primeira experiência” (copy ou passo único “para ver seu mês, entre e escolha/crie uma casa”) — senão o onboarding in-product **nunca aparece** para o leigo que desiste antes.  
2. **Reduzir termos no primeiro parágrafo** do banner inicial (ex.: trocar “score, alertas” por “um resumo e o que fazer a seguir”) para bater na meta de 3–5 s.  
3. **Alinhar ou explicar** os dois caminhos (banner vs **DashboardOperationalSection**) — mesmo destino ok, mas um microtexto *“Ou use as ações rápidas abaixo”* evita dúvida.  
4. **Teste E2E com sessão:** repetir os 3 perfis **logado**, com household ativo e `localStorage` limpo, cronometrando 30–40 s para duas ações (perfil 2).  
5. **Perfil exigente:** uma frase de **credibilidade** próxima ao score na fase pós-celebração (ou link “Como calculamos” → doc interna), sem modal.

---

## Confiança no onboarding

- **Estrutura (banner → ação → próximo passo → celebração → highlights):** forte no código.  
- **Confiança “sem você no loop”:** **média** até rodar os 3 perfis **com login** e dados; a simulação parou na **auth**, que é o maior risco de abandono antes de qualquer onboarding in-product.

---

## Próximo passo recomendado

- Rodar o mesmo roteiro em **staging/produção** com 3 contas de teste (ou limpar `financeiro_onboarding_step` no DevTools) e **gravar 5 min de tela** por perfil — preencher este doc com observações **100% comportamentais**.
