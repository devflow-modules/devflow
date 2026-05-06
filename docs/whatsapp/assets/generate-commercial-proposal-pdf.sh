#!/usr/bin/env bash
# Gera docs/whatsapp/assets/devflow-whatsapp-multicanal-proposta.pdf a partir do HTML comercial.
# Requisitos: Google Chrome/Chromium instalado (headless).
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HTML="${DIR}/devflow-whatsapp-multicanal-proposta.html"
PDF="${DIR}/devflow-whatsapp-multicanal-proposta.pdf"

for c in google-chrome-stable google-chrome chromium chromium-browser; do
  if command -v "$c" &>/dev/null; then CHROME="$c"; break; fi
done

if [[ -z "${CHROME:-}" ]]; then
  echo "Nenhum Chrome/Chromium encontrado no PATH." >&2
  exit 1
fi

if [[ ! -f "$HTML" ]]; then
  echo "Arquivo fonte não encontrado: $HTML" >&2
  exit 1
fi

ABS_HTML="$(realpath "$HTML")"
FILE_URL="file://${ABS_HTML}"

# --no-pdf-header-footer elimina selo automático data/URL do Chrome ao imprimir
"$CHROME" --headless=new --disable-gpu --no-sandbox \
  --no-pdf-header-footer \
  --print-to-pdf="$PDF" \
  "$FILE_URL"

echo "PDF gerado: $PDF ($(wc -c < "$PDF" | tr -d ' ') bytes)"
