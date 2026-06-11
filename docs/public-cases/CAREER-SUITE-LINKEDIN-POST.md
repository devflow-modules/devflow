# LinkedIn post — short version

Transformei candidaturas dispersas em preparação estruturada de entrevista — com um fluxo **local-first**, sem backend obrigatório e sem upload automático de currículo.

No **DevFlow Career Suite**, conectei três peças que normalmente ficam desconectadas:

→ **ApplyFlow** — extensão Chrome + dashboard para organizar candidaturas do LinkedIn Easy Apply  
→ **CareerBundle** — JSON tipado (Zod) que transporta vagas, skills e status entre apps  
→ **Interview Lab** — importação, **Resume Match** determinístico e prática de entrevista por vaga  

O handoff ApplyFlow → Interview Lab usa `postMessage` com ACK (confirmação de entrega). Se falhar, há fallback por clipboard ou arquivo — sempre explícito, nunca bundle na URL.

O núcleo é **determinístico**: análise estilo ATS, gaps, perguntas prováveis e prep panel gerados no browser. **IA é opcional** — só roda quando o usuário pede coaching, com chave no próprio navegador.

Cobertura de testes no escopo Career Suite: **175 testes** (bundle, handoff, import, Resume Match).

Case técnico de Product Engineering + integração de IA com critério — produto e privacidade antes de hype.

Material do case (documentação interna do projeto): Career Suite public case + demo script.

---

_Character count target: ≤ 1.300 — edit before posting._

---

# LinkedIn post — technical version

**De candidatura a entrevista sem perder contexto da vaga — arquitetura local-first com contrato tipado entre apps.**

Durante meses vi o mesmo padrão: muitas candidaturas no Easy Apply, zero preparação estruturada para a entrevista daquela vaga específica. Ferramentas de IA pedem upload de CV antes de qualquer valor. Dashboards genéricos não sabem qual stack ou senioridade você está negociando.

Construí o **DevFlow Career Suite** para fechar esse loop no browser.

**Problema**  
Candidaturas espalhadas. Prep desconectado da vaga. Dados sensíveis tratados como input default de cloud.

**Solução**  
1. **ApplyFlow** — extensão MV3 + dashboard Next.js: captura, funil, export local (sem auto-submit).  
2. **CareerBundle** — pacote `@devflow/career-core` com Zod: mesma validação para clipboard, arquivo, paste e postMessage.  
3. **Interview Lab** — import em `/import/applyflow`, **Resume Match** em `/career/ats`, prática com `?careerPrep=`.

**Arquitetura**  
Monorepo pnpm: apps não importam apps — só `packages/career-core`. Handoff: `devflow.careerBundle.v1` + ACK `devflow.careerBundle.ack.v1`, origins allowlisted. ApplyFlow abre Interview Lab sem `noopener` para o filho confirmar entrega. Fallback clipboard se popup bloqueado ou timeout.

**Privacidade**  
Sem backend Career Suite no MVP. Sem bundle em query string. localStorage / chrome.storage.local. OpenAI só após clique explícito em coaching — mesma chave browser-side do AI Answer Review.

**Testes**  
```bash
pnpm --filter @devflow/career-core test      # 17
pnpm --filter applyflow test                # 22
pnpm --filter @devflow/app-interview-lab test  # 136
```  
Cobertura: schema, export mapping, sender/receiver postMessage, prep determinístico, ATS heuristics — IA isolada dos gates core.

**Próximos passos (roadmap honesto)**  
Sync cloud opt-in criptografado, job context mais rico no bundle, histórico de imports, integrações explícitas (ATS/calendar) — não promessa de produto público hoje; evolução documentada.

**O que isso demonstra**  
Arquitetura de produto multi-app, DX com contratos compartilhados, integração segura entre superfícies, IA como amplificador — não motor oculto.

Se você lidera produto ou engenharia e valoriza **local-first + testes + narrativa técnica clara**, o case completo está documentado no repositório (material de portfólio — não posicionado como SaaS aberto).

Comentários com perguntas sobre handoff, Zod ou Resume Match determinístico — respondo com prazer.

---

_Character count target: ≤ 2.800 — edit before posting. Max 1–3 emojis if desired; none added by default._
