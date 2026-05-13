# ApplyFlow — roteiro de demo em vídeo (60–90 s)

Objetivo: **case de portefólio técnico/produto** — local-first, privacy-first, **sem backend ApplyFlow obrigatório**, **sem auto-submit**, **IA opt-in**. Gravar em **1080p** (1920×1080), zoom do browser ~100%, tema escuro consistente.

**Não** afirmar: Chrome Web Store publicada, backend cloud activo, sync automático obrigatório, SaaS Pro ou mass apply. Distribuição = **código / build local** conforme o repositório, salvo factualmente verdadeiro no teu caso.

---

## Roteiro final (60–90 s) — ordem sugerida

| Beat | Duração alvo | O que mostrar / VO |
|------|----------------|---------------------|
| **1. Problema** | ~10 s | Easy Apply **repetitivo**; histórico **disperso** por abas e notas; risco de ferramentas agressivas (bots / mass apply). |
| **2. Solução** | ~12 s | **ApplyFlow** como copiloto **no dispositivo**: extensão MV3 + dashboard; dados em **storage local** / **localStorage** após import; **sem servidor ApplyFlow** no caminho do MVP. |
| **3. Dashboard — demo fictícia** | ~12 s | Abrir `/dashboard` → **Carregar demo** → confirmar métricas e cartões com dados **públicos fictícios** (sem PII). |
| **4. Dashboard — import e análise** | ~15 s | Em voz-over ou texto: o utilizador **exporta JSON** na extensão e **importa** no dashboard (mostrar zona de import / drag-and-drop **sem** revelar path nem conteúdo de ficheiro real); após import válido, dados ficam só em **localStorage** no browser. Alternativa segura para o vídeo: ficar na **demo** e **mencionar** o import JSON em VO. |
| **5. Métricas, funil e tabela** | ~15 s | Scroll: **funil / gráficos** + **tabela** filtrável; números legíveis; reforçar que a análise corre **só no browser**. |
| **6. Extensão — preview controlado** | ~10 s | **Opções da extensão → Preview (captura)** — painel demo alinhado ao produto **sem** depender do DOM do LinkedIn (evita mensagens e contactos reais no enquadramento). |
| **7. Fechamento** | ~8 s | Frase-chave: **sem backend ApplyFlow obrigatório**; **sem auto-submit**; **IA opt-in** (chave tua, desligada por defeito); demo fictícia para portefólio. CTA: **código e documentação no repositório** — não prometer Chrome Web Store. |

**Total:** ~82 s — ajustar compressão de VO se precisares de **60 s** (corta beat 4 para menção só de import em voz).

---

## Cenas (storyboard) — referência detalhada

| Cena | Duração alvo | O que mostrar |
|------|----------------|----------------|
| 1 — Problema | ~8 s | Mensagem em ecrã ou VO: Easy Apply repetitivo; histórico disperso; risco com “bots”. |
| 2 — Solução / landing (opcional) | ~4 s | Flash da `/` ou só VO sobre local-first. |
| 3 — Dashboard demo | ~12 s | **Carregar demo**; feedback e resumo visíveis. |
| 4 — Import / persistência | ~8 s | Área de import ou VO sobre JSON + `localStorage`; **não** mostrar ficheiros reais nem API keys. |
| 5 — Métricas e tabela | ~12 s | Cards + 1–2 gráficos + scroll rápido na tabela. |
| 6 — Preview extensão | ~10 s | **Opções → Preview (captura)** — material alinhado ao print oficial **06**. |
| 7 — LinkedIn (opcional / B-roll) | ~0–8 s | Só se tiveres conta de teste e UI mascarada; **não** obrigatório para o roteiro mínimo sem PII. |
| 8 — Fechamento | ~8 s | Sem backend obrigatório; sem auto-submit; IA opt-in; CTA repositório. |

---

## Narração sugerida — PT-BR (~90 s)

> Candidatar-se no LinkedIn cansa quando cada vaga repete as mesmas perguntas e o histórico espalha-se por abas e notas.  
> O ApplyFlow é um copiloto **no dispositivo**: extensão para o Easy Apply que entende o formulário e sugere respostas a partir de um perfil validado.  
> O autofill é **assistido** — só quando eu clico — e a candidatura **não** é enviada pela ferramenta.  
> Para textos longos existe **IA opt-in**, com a tua própria chave, desligada por defeito.  
> O histórico fica em armazenamento local; quando quero métricas, **exporto um JSON** e abro o **dashboard** — os dados analisados ficam em **localStorage** neste browser, **sem backend ApplyFlow** no meio.  
> No vídeo uso a **demo fictícia**; em produção tratas o teu export como sensível.  
> ApplyFlow: velocidade com controlo e privacidade local-first — código e docs no repositório, **sem** prometer loja nem SaaS que não existam no MVP.

---

## Narração sugerida — EN (~90 s)

> Easy Apply gets painful when every posting repeats the same fields and your pipeline lives across random tabs.  
> **ApplyFlow** is a **local-first** copilot: a Chrome extension that parses the form and suggests answers from a validated profile.  
> Autofill is **assisted**—it acts **after** I choose to—**without** auto-submitting applications.  
> Long-form help is **opt-in AI** with your **own** key, off by default.  
> History stays in local extension storage; when I want analytics, I export **JSON** and open the **dashboard**—analytics land in **localStorage** in this browser, with **no mandatory ApplyFlow backend**.  
> On camera I use the shipped **fictional demo**; treat real exports as sensitive.  
> ApplyFlow is speed **with** control and privacy—code and docs in the repo, **without** claiming a store listing or cloud SaaS that the MVP doesn’t ship.

---

## Checklist antes de gravar

- [ ] **Dados:** demo no dashboard; vagas **fictícias** ou mascaradas se mostrar LinkedIn; **não** gravar chaves API, e-mails nem URLs privadas.
- [ ] **LinkedIn (opcional):** apenas conta de teste / UI limpa; respeitar ToS.
- [ ] **Extensão:** build actual (`pnpm --filter applyflow-extension build`); **Preview (captura)** para o beat da extensão sem PII.
- [ ] **Dashboard:** `pnpm --filter applyflow build` + `pnpm --filter applyflow start` **ou** janela anónima sem extensões em dev — evitar overlay «1 issue» por extensões de browser.
- [ ] **Áudio:** microfone estável; música opcional baixa royalty-free.
- [ ] **Resolução:** 1920×1080; legendas PT ou EN opcionais para LinkedIn.
- [ ] **CTA final:** código / documentação no repositório DevFlow Labs — **sem** Chrome Web Store nem sync cloud **salvo factual**.

---

## Checklist de screenshots (conjunto oficial)

Após gravar, actualizar os PNG oficiais em `docs/applyflow/assets/` conforme [`SCREENSHOTS_CHECKLIST.md`](./SCREENSHOTS_CHECKLIST.md).
