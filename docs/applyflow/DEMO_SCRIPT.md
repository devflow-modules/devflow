# ApplyFlow — roteiro de demo em vídeo (60–90 s)

Objetivo: mostrar **produto autoral**, **local-first**, **sem backend**, **IA opt-in** e **dashboard** em sequência rápida. Gravar em **1080p**, browser zoom ~100%, tema escuro consistente.

---

## Cenas (storyboard)

| Cena | Duração alvo | O que mostrar |
|------|----------------|----------------|
| 1 — Problema | ~8 s | Mensagem em ecrã ou VO: Easy Apply repetitivo; histórico disperso; risco com “bots”. |
| 2 — Abrir Easy Apply | ~8 s | LinkedIn, vaga com botão Easy Apply; iniciar fluxo (sem mostrar dados pessoais reais). |
| 3 — ApplyFlow detecta | ~10 s | Painel da extensão sobre o modal; campos reconhecidos / labels. |
| 4 — Autofill assistido | ~12 s | Clicar “preencher” ou equivalente **após** intenção humana; gate se aparecer. |
| 5 — IA opt-in | ~10 s | Opções ou toggle: IA desligada por defeito; se ligada, gerar texto curto **sem** colar API key em ecrã. |
| 6 — Histórico | ~8 s | Lista local na extensão; entrada guardada (empresa/título genéricos ou demo). |
| 7 — Exportar JSON | ~8 s | Opções › export / backup; guardar ficheiro (ou só mostrar botão sem path). |
| 8 — Dashboard | ~10 s | `applyflow` dashboard; import ou **Carregar demo** se quiseres evitar PII. |
| 9 — Métricas | ~12 s | Cards + 1–2 gráficos + scroll rápido na tabela. |
| 10 — Fechamento | ~8 s | Frase: local-first, sem backend ApplyFlow, submissão sempre manual. |

---

## Narração sugerida — PT-BR (~90 s)

> Candidatar-se no LinkedIn cansa quando cada vaga repete as mesmas perguntas e o histórico espalha-se por abas e notas.  
> O ApplyFlow é um copiloto **no dispositivo**: extensão para o Easy Apply que entende o formulário e sugere respostas a partir de um perfil validado.  
> O autofill é **assistido** — só quando eu clico — e a candidatura **não** é enviada pela ferramenta.  
> Para textos longos existe **IA opt-in**, com a tua própria chave, desligada por defeito.  
> O histórico fica em armazenamento local; quando quiseres métricas, exportas um JSON e abres o **dashboard** — também sem servidor nosso, só o browser.  
> Na demo pública usas dados fictícios. ApplyFlow: velocidade com controlo e privacidade local-first.

---

## Narração sugerida — EN (~90 s)

> Easy Apply gets painful when every posting repeats the same fields and your pipeline lives across random tabs.  
> **ApplyFlow** is a **local-first** copilot: a Chrome extension that parses the form and suggests answers from a validated profile.  
> Autofill is **assisted**—it acts **after** I choose to—**without** auto-submitting applications.  
> Long-form help is **opt-in AI** with your **own** key, off by default.  
> History stays in local extension storage; when I want analytics, I export **JSON** and open the **dashboard**—still **no ApplyFlow backend**, just the browser.  
> The shipped **demo** uses fictional jobs. ApplyFlow is about speed **with** control and privacy.

---

## Checklist antes de gravar

- [ ] **Dados:** usar vagas demo ou mascarar empresa/cidade; não gravar chaves API nem e-mails reais.
- [ ] **LinkedIn:** conta de teste ou modo janela privada conforme necessidade; respeitar ToS.
- [ ] **Extensão:** build actual (`applyflow-extension`); ícones e nomes consistentes.
- [ ] **Dashboard:** `pnpm --filter applyflow dev` ou build de preview; demo carregada se não for mostrar import real.
- [ ] **Áudio:** microfone estável; música opcional baixa royalty-free.
- [ ] **Resolução:** 1920×1080; legendas PT ou EN opcionais para LinkedIn.
- [ ] **CTA final:** “código / documentação no repositório DevFlow Labs” — sem prometer Chrome Web Store se não for verdade.
