/** Cenário fixo para narrativa comercial na landing — sem gerar áudio no servidor */

export const FUNKLAB_DEMO_SCENARIO = {
  title: "Mandelão · 130 BPM",
  steps: [
    "Escolha o preset (groove + kit) alinhado ao estilo.",
    "Defina BPM e quantas variações quer (ex.: 4 sketches).",
    "O engine monta MIDI com humanização leve de velocity.",
  ],
  outputTitle: "O que você recebe",
  outputs: [
    "Arquivos .mid por faixa (kick, snare, bass, perc).",
    "Preview em áudio quando o app demo está no ar.",
    "Nomes padronizados para arrastar para a DAW sem renomear tudo.",
  ],
  footnote:
    "A demo ao vivo está no app hospedado; aqui você vende o roteiro antes de abrir a sessão.",
} as const;
