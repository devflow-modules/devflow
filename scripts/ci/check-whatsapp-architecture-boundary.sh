#!/usr/bin/env bash
# Garante que o portal (src/) não importa o app whatsapp-platform nem recria rotas API operacionais na raiz.
# Uso: bash scripts/ci/check-whatsapp-architecture-boundary.sh
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

fail() {
  echo "::error::$1" 2>/dev/null || echo "ERROR: $1"
  exit 1
}

# Imports proibidos no código do portal
PATTERN='(from\s+['\''"]@wa/|from\s+['\''"][^'\''"]*apps/whatsapp-platform|require\(['\''"][^'\''"]*apps/whatsapp-platform)'
matches="$(grep -rE "$PATTERN" src \
  --include='*.ts' --include='*.tsx' --include='*.mts' --include='*.cts' \
  2>/dev/null || true)"
if [[ -n "$(echo "$matches" | grep -vE '^\s*$' || true)" ]]; then
  echo "$matches"
  fail "Portal src/ não pode importar apps/whatsapp-platform nem alias @wa/. Remova o acoplamento."
fi

# Rotas API operacionais do WhatsApp só em apps/whatsapp-platform
for path in \
  "src/app/api/webhook/whatsapp" \
  "src/app/api/webhooks/whatsapp" \
  "src/app/api/whatsapp"; do
  if [[ -e "$path" ]]; then
    fail "Caminho proibido na raiz (cutover): $path — use apps/whatsapp-platform."
  fi
done

echo "WhatsApp architecture boundary OK."
