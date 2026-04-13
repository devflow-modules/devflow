#!/usr/bin/env bash
# Smoke check pós-deploy — webhook verification GET.
# Uso: ./scripts/ops/validate-whatsapp-platform.sh https://whatsapp.exemplo.com.br
set -euo pipefail

BASE="${1:-}"
TOKEN="${WHATSAPP_VERIFY_TOKEN:-}"

if [[ -z "$BASE" ]]; then
  echo "Uso: $0 <base-url>   (ex: https://whatsapp.devflowlabs.com.br)"
  echo "Opcional: WHATSAPP_VERIFY_TOKEN no ambiente para testar o challenge."
  exit 1
fi

BASE="${BASE%/}"
echo "== Base: $BASE"

echo "== Health: GET /api/webhook/whatsapp (sem token — esperado 403 ou 400 conforme implementação)"
code=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}/api/webhook/whatsapp" || true)
echo "    HTTP $code"

if [[ -n "$TOKEN" ]]; then
  echo "== Webhook verify (challenge=999)"
  body=$(curl -s "${BASE}/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=${TOKEN}&hub.challenge=999" || true)
  if [[ "$body" == "999" ]]; then
    echo "    OK — challenge devolvido"
  else
    echo "    Resposta: $body"
    echo "    (Confirme WHATSAPP_VERIFY_TOKEN e URL)"
  fi
else
  echo "== Skipping challenge test (defina WHATSAPP_VERIFY_TOKEN)"
fi

echo "== Feito. Valide login e inbox manualmente."
