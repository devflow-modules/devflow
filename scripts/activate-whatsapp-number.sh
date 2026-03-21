#!/usr/bin/env bash
set -euo pipefail

# Carrega .env.local do monorepo se existir (mapeia WHATSAPP_* para variáveis do script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env.local"
if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "${ENV_FILE}" 2>/dev/null || true
  set +a
  # Fallback: usa WHATSAPP_* quando ACCESS_TOKEN/PHONE_NUMBER_ID não definidos
  ACCESS_TOKEN="${ACCESS_TOKEN:-${WHATSAPP_ACCESS_TOKEN:-}}"
  PHONE_NUMBER_ID="${PHONE_NUMBER_ID:-${WHATSAPP_PHONE_NUMBER_ID:-}}"
fi

GRAPH_VERSION="${META_API_VERSION:-${WHATSAPP_API_VERSION:-v21.0}}"
[[ "${GRAPH_VERSION}" != v* ]] && GRAPH_VERSION="v${GRAPH_VERSION}"

# ====== PREENCHA (ou via env) ======
ACCESS_TOKEN="${ACCESS_TOKEN:-SEU_ACCESS_TOKEN_AQUI}"
PHONE_NUMBER_ID="${PHONE_NUMBER_ID:-1027838990414844}"
PIN_2FA="${PIN_2FA:-123456}"          # PIN de confirmação em duas etapas
CODE_METHOD="${CODE_METHOD:-SMS}"     # SMS ou VOICE
# ======================

if [[ "${ACCESS_TOKEN}" == "SEU_ACCESS_TOKEN_AQUI" ]] || [[ -z "${ACCESS_TOKEN}" ]]; then
  echo "Erro: defina ACCESS_TOKEN ou WHATSAPP_ACCESS_TOKEN no .env.local ou via variável de ambiente."
  exit 1
fi

BASE_URL="https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_NUMBER_ID}"

header_auth=(-H "Authorization: Bearer ${ACCESS_TOKEN}")
header_json=(-H "Content-Type: application/json")

echo "== 1) Solicitando código de verificação (${CODE_METHOD}) =="

curl -sS -X POST "${BASE_URL}/request_code" \
  "${header_auth[@]}" \
  "${header_json[@]}" \
  -d "{
    \"code_method\": \"${CODE_METHOD}\",
    \"language\": \"pt_BR\"
  }"

echo
echo "Se a resposta acima foi OK, aguarde o código chegar por ${CODE_METHOD}."
read -r -p "Digite o código recebido: " VERIFICATION_CODE

echo
echo "== 2) Verificando código =="

curl -sS -X POST "${BASE_URL}/verify_code" \
  "${header_auth[@]}" \
  "${header_json[@]}" \
  -d "{
    \"code\": \"${VERIFICATION_CODE}\"
  }"

echo
echo "== 3) Registrando número na Cloud API =="

curl -sS -X POST "${BASE_URL}/register" \
  "${header_auth[@]}" \
  "${header_json[@]}" \
  -d "{
    \"messaging_product\": \"whatsapp\",
    \"pin\": \"${PIN_2FA}\"
  }"

echo
echo "== 4) Consultando status do número =="

curl -sS -G "https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_NUMBER_ID}" \
  "${header_auth[@]}" \
  --data-urlencode "fields=id,display_phone_number,verified_name,code_verification_status,name_status,quality_rating,platform_type,status"

echo
echo "== 5) Teste de envio =="
read -r -p "Digite o número destino no formato 55DDDNUMERO: " DESTINO

curl -sS -X POST "https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_NUMBER_ID}/messages" \
  "${header_auth[@]}" \
  "${header_json[@]}" \
  -d "{
    \"messaging_product\": \"whatsapp\",
    \"to\": \"${DESTINO}\",
    \"type\": \"text\",
    \"text\": {
      \"body\": \"Teste de ativação em produção da DevFlow 🚀\"
    }
  }"

echo
echo "Fim."
