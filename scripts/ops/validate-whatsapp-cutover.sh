#!/usr/bin/env bash
set -euo pipefail

# Defaults; treat empty string as unset (ex.: CI env var vazio).
PORTAL_URL="${PORTAL_URL:-https://devflowlabs.com.br}"
WHATSAPP_APP_URL="${WHATSAPP_APP_URL:-https://whatsapp.devflowlabs.com.br}"
[[ -z "${PORTAL_URL}" ]] && PORTAL_URL="https://devflowlabs.com.br"
[[ -z "${WHATSAPP_APP_URL}" ]] && WHATSAPP_APP_URL="https://whatsapp.devflowlabs.com.br"
VERIFY_TOKEN="${VERIFY_TOKEN:-}"
TRACE_REDIRECTS="${TRACE_REDIRECTS:-0}"
STRICT_MODE="${STRICT_MODE:-0}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-20}"
MAX_TIME_SECONDS="${MAX_TIME_SECONDS:-30}"

PASS_COUNT=0
FAIL_COUNT=0

REDIRECT_EXPECTED_PATHS=(
  "/dashboard/whatsapp"
  "/login"
  "/forgot-password"
  "/reset-password"
)

PUBLIC_PORTAL_PATHS=(
  "/"
  "/produtos"
  "/ferramentas"
  "/ferramentas/whatsapp"
)

REMOVED_OR_MOVED_API_PATHS=(
  "/api/whatsapp/test"
  "/api/whatsapp"
  "/api/admin/whatsapp"
  "/api/admin/conversations"
)

APP_REQUIRED_PATHS=(
  "/login"
)

APP_OPTIONAL_AUTH_PATHS=(
  "/dashboard/whatsapp"
)

log() {
  printf "%s\n" "$*"
}

pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  log "✅ PASS: $*"
}

fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  log "❌ FAIL: $*"
}

section() {
  printf "\n== %s ==\n" "$*"
}

curl_headers() {
  curl -sS -I \
    --connect-timeout "$TIMEOUT_SECONDS" \
    --max-time "$MAX_TIME_SECONDS" \
    "$1"
}

curl_body_and_status() {
  local url="$1"
  curl -sS \
    --connect-timeout "$TIMEOUT_SECONDS" \
    --max-time "$MAX_TIME_SECONDS" \
    -o /tmp/validate_whatsapp_body.$$ \
    -w "%{http_code}" \
    "$url"
}

assert_redirect_to_whatsapp() {
  local path="$1"
  local url="${PORTAL_URL}${path}"
  local headers
  headers="$(curl_headers "$url")" || {
    fail "redirect check failed to request ${url}"
    return
  }

  local status
  status="$(printf "%s" "$headers" | awk 'toupper($1) ~ /^HTTP\// {code=$2} END {print code}')"
  local location
  location="$(printf "%s" "$headers" | awk 'BEGIN{IGNORECASE=1} /^location:/ {sub(/\r/,""); print substr($0,11)}' | tail -n1 | sed 's/^ *//')"

  if [[ "${status}" =~ ^30[1278]$ ]] && [[ "${location}" == "${WHATSAPP_APP_URL}"* ]]; then
    pass "${path} redirects to WhatsApp app (${status} -> ${location})"
  else
    fail "${path} expected redirect to WhatsApp app, got status=${status:-none} location=${location:-none}"
    if [[ "$TRACE_REDIRECTS" == "1" ]]; then
      log "$headers"
    fi
  fi
}

assert_public_stays_on_portal() {
  local path="$1"
  local url="${PORTAL_URL}${path}"
  local headers
  headers="$(curl_headers "$url")" || {
    fail "public portal check failed to request ${url}"
    return
  }

  local status
  status="$(printf "%s" "$headers" | awk 'toupper($1) ~ /^HTTP\// {code=$2} END {print code}')"
  local location
  location="$(printf "%s" "$headers" | awk 'BEGIN{IGNORECASE=1} /^location:/ {sub(/\r/,""); print substr($0,11)}' | tail -n1 | sed 's/^ *//')"

  if [[ ! "${status}" =~ ^30[1278]$ ]]; then
    pass "${path} stays on portal (status ${status})"
  elif [[ "${location}" != "${WHATSAPP_APP_URL}"* ]]; then
    pass "${path} does not redirect to WhatsApp app (location=${location})"
  else
    fail "${path} should stay on portal but redirects to WhatsApp app (${location})"
  fi
}

assert_removed_api_not_operational_on_portal() {
  local path="$1"
  local url="${PORTAL_URL}${path}"
  local headers
  headers="$(curl_headers "$url")" || {
    pass "${path} is unreachable on portal, acceptable"
    return
  }

  local status
  status="$(printf "%s" "$headers" | awk 'toupper($1) ~ /^HTTP\// {code=$2} END {print code}')"
  local location
  location="$(printf "%s" "$headers" | awk 'BEGIN{IGNORECASE=1} /^location:/ {sub(/\r/,""); print substr($0,11)}' | tail -n1 | sed 's/^ *//')"

  if [[ "${status}" == "404" || "${status}" == "405" || "${status}" == "401" || "${status}" == "403" ]]; then
    pass "${path} is not operational on portal (status ${status})"
  elif [[ "${location}" == "${WHATSAPP_APP_URL}"* ]]; then
    pass "${path} is redirected off portal to WhatsApp app"
  else
    fail "${path} appears still active on portal (status=${status:-none}, location=${location:-none})"
  fi
}

assert_app_path_is_alive() {
  local path="$1"
  local url="${WHATSAPP_APP_URL}${path}"
  local headers
  headers="$(curl_headers "$url")" || {
    fail "app path check failed to request ${url}"
    return
  }

  local status
  status="$(printf "%s" "$headers" | awk 'toupper($1) ~ /^HTTP\// {code=$2} END {print code}')"

  if [[ "${status}" =~ ^(200|301|302|307|308|401)$ ]]; then
    pass "App path ${path} is alive (status ${status})"
  else
    fail "App path ${path} unexpected status ${status:-none}"
  fi
}

assert_webhook_handshake() {
  if [[ -z "${VERIFY_TOKEN}" ]]; then
    log "ℹ️ Skipping webhook handshake: VERIFY_TOKEN not provided"
    return
  fi

  local challenge="123456"
  local url="${WHATSAPP_APP_URL}/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=${challenge}"
  local status
  status="$(curl -sS \
    --connect-timeout "$TIMEOUT_SECONDS" \
    --max-time "$MAX_TIME_SECONDS" \
    -o /tmp/validate_whatsapp_webhook_body.$$ \
    -w "%{http_code}" \
    "$url")" || {
      fail "webhook handshake request failed"
      return
    }

  local body
  body="$(cat /tmp/validate_whatsapp_webhook_body.$$)"

  if [[ "${status}" == "200" && "${body}" == "${challenge}" ]]; then
    pass "Webhook handshake returned expected challenge"
  else
    fail "Webhook handshake unexpected response status=${status} body=${body}"
  fi
}

assert_webhook_post_accepts_payload() {
  local url="${WHATSAPP_APP_URL}/api/webhook/whatsapp"
  local payload='{"entry":[{"changes":[{"value":{"messages":[{"id":"test-message","text":{"body":"teste cutover"},"from":"5513999999999","timestamp":"1712400000","type":"text"}]}}]}]}'

  local status
  status="$(curl -sS \
    --connect-timeout "$TIMEOUT_SECONDS" \
    --max-time "$MAX_TIME_SECONDS" \
    -o /tmp/validate_whatsapp_post_body.$$ \
    -w "%{http_code}" \
    -X POST "$url" \
    -H "Content-Type: application/json" \
    -d "$payload")" || {
      fail "webhook POST request failed"
      return
    }

  if [[ "${status}" == "200" || "${status}" == "202" ]]; then
    pass "Webhook POST accepted payload (status ${status})"
  else
    local body
    body="$(cat /tmp/validate_whatsapp_post_body.$$)"
    fail "Webhook POST unexpected status=${status} body=${body}"
  fi
}

assert_response_time() {
  local label="$1"
  local url="$2"
  local threshold_ms="$3"

  local time_total
  time_total="$(curl -sS -o /dev/null \
    --connect-timeout "$TIMEOUT_SECONDS" \
    --max-time "$MAX_TIME_SECONDS" \
    -w "%{time_total}" \
    "$url")" || {
      fail "${label} response-time request failed"
      return
    }

  local ms
  ms="$(awk -v t="$time_total" 'BEGIN { printf "%.0f", t * 1000 }')"

  if [[ "$ms" -le "$threshold_ms" ]]; then
    pass "${label} response time ${ms}ms <= ${threshold_ms}ms"
  else
    if [[ "$STRICT_MODE" == "1" ]]; then
      fail "${label} response time ${ms}ms > ${threshold_ms}ms"
    else
      log "⚠️ WARN: ${label} response time ${ms}ms > ${threshold_ms}ms"
    fi
  fi
}

main() {
  section "Config"
  log "PORTAL_URL=${PORTAL_URL}"
  log "WHATSAPP_APP_URL=${WHATSAPP_APP_URL}"
  log "TRACE_REDIRECTS=${TRACE_REDIRECTS}"
  log "STRICT_MODE=${STRICT_MODE}"

  section "Portal redirects to WhatsApp app"
  for path in "${REDIRECT_EXPECTED_PATHS[@]}"; do
    assert_redirect_to_whatsapp "$path"
  done

  section "Portal public routes remain public"
  for path in "${PUBLIC_PORTAL_PATHS[@]}"; do
    assert_public_stays_on_portal "$path"
  done

  section "Portal removed or moved APIs are not active"
  for path in "${REMOVED_OR_MOVED_API_PATHS[@]}"; do
    assert_removed_api_not_operational_on_portal "$path"
  done

  section "WhatsApp app required routes"
  for path in "${APP_REQUIRED_PATHS[@]}"; do
    assert_app_path_is_alive "$path"
  done

  section "WhatsApp app auth-gated routes"
  for path in "${APP_OPTIONAL_AUTH_PATHS[@]}"; do
    assert_app_path_is_alive "$path"
  done

  section "Webhook"
  assert_webhook_handshake
  assert_webhook_post_accepts_payload

  section "Basic latency checks"
  assert_response_time "Portal home" "${PORTAL_URL}/" 2500
  assert_response_time "WhatsApp login" "${WHATSAPP_APP_URL}/login" 3000
  assert_response_time "WhatsApp webhook GET" "${WHATSAPP_APP_URL}/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=invalid&hub.challenge=1" 3000

  section "Summary"
  log "PASS=${PASS_COUNT}"
  log "FAIL=${FAIL_COUNT}"

  rm -f /tmp/validate_whatsapp_body.$$ /tmp/validate_whatsapp_webhook_body.$$ /tmp/validate_whatsapp_post_body.$$ 2>/dev/null || true

  if [[ "$FAIL_COUNT" -gt 0 ]]; then
    exit 1
  fi
}

main "$@"
