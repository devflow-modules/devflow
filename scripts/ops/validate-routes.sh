#!/usr/bin/env bash
set -Eeuo pipefail

# ============================================================
# Validate routes and redirects for cutover / smoke checks
#
# Usage:
#   BASE_URL="https://devflowlabs.com.br" bash scripts/ops/validate-routes.sh
#
# Optional envs:
#   APP_URL, FINANCEIRO_APP_URL, PROTECTED_TEST_PATH, AUTH_REDIRECT_PREFIX
#   AUTH_EXPECT_REDIRECT=true|false   FAIL_FAST=true|false
#   STRICT_MODE=true|false            (Bloco D: sem cadeia de redirect em 200 público; hop protegido ≠ 200)
#   STRICT_MAX_PUBLIC_REDIRECTS=0     (em STRICT_MODE, permite N redirects até 200 — ex.: 1 para slash)
#   PERF_CHECK=true|false             PERF_MAX_FINANCEIRO_LANDING=1.5 (segundos)
#   OUTPUT_JSON=true                  linha JSON final no stdout
#   MAX_REDIRECTS_ALLOWED=5           falha se a cadeia -L exceder (loop / chain longa)
#   CURL_FOLLOW_MAX=10                teto do curl -L (deve ser >= MAX_REDIRECTS_ALLOWED)
#   TRACE_REDIRECTS=true              imprime hop-a-hop (debug pesado)
#   MAX_TRACE_HOPS=15                 teto de hops no trace manual
#   FINANCEIRO_SEPARATE_HOST=true|false  força fluxo portal→app (308) + auth no host do app; se vazio, deduz quando BASE_URL ≠ FINANCEIRO_APP_URL
#   SKIP_FINANCEIRO_DEMO_CHECK=true   pula o check de /ferramentas/financeiro/demo (ex.: env sem URL do app)
#
# Modos: normal | STRICT_MODE=true | TRACE_REDIRECTS=true (ver runbook)
#
# Carregar env:
#   set -a && source scripts/ops/validate-routes.financeiro.env && set +a
#   bash scripts/ops/validate-routes.sh
# ============================================================

BASE_URL="${BASE_URL:-http://localhost:3000}"
APP_URL="${APP_URL:-$BASE_URL}"
FINANCEIRO_APP_URL="${FINANCEIRO_APP_URL:-$APP_URL}"
AUTH_EXPECT_REDIRECT="${AUTH_EXPECT_REDIRECT:-true}"
FAIL_FAST="${FAIL_FAST:-false}"
STRICT_MODE="${STRICT_MODE:-false}"
STRICT_MAX_PUBLIC_REDIRECTS="${STRICT_MAX_PUBLIC_REDIRECTS:-0}"
PERF_CHECK="${PERF_CHECK:-true}"
PERF_MAX_FINANCEIRO_LANDING="${PERF_MAX_FINANCEIRO_LANDING:-1.5}"
OUTPUT_JSON="${OUTPUT_JSON:-false}"

MAX_REDIRECTS_ALLOWED="${MAX_REDIRECTS_ALLOWED:-5}"
CURL_FOLLOW_MAX="${CURL_FOLLOW_MAX:-10}"
TRACE_REDIRECTS="${TRACE_REDIRECTS:-false}"
MAX_TRACE_HOPS="${MAX_TRACE_HOPS:-15}"
SKIP_FINANCEIRO_DEMO_CHECK="${SKIP_FINANCEIRO_DEMO_CHECK:-false}"

PROTECTED_TEST_PATH="${PROTECTED_TEST_PATH:-/ferramentas/financeiro/dashboard}"
AUTH_REDIRECT_PREFIX="${AUTH_REDIRECT_PREFIX:-${BASE_URL%/}/ferramentas/financeiro/auth}"

RED=""
GREEN=""
YELLOW=""
BLUE=""
RESET=""

if [[ -t 1 ]]; then
  RED="\033[0;31m"
  GREEN="\033[0;32m"
  YELLOW="\033[1;33m"
  BLUE="\033[0;34m"
  RESET="\033[0m"
fi

failures=0
checks=0

log() {
  printf "%b\n" "${BLUE}[$(date +'%H:%M:%S')]${RESET} $*"
}

ok() {
  printf "%b\n" "${GREEN}✔${RESET} $*"
}

warn() {
  printf "%b\n" "${YELLOW}⚠${RESET} $*"
}

err() {
  printf "%b\n" "${RED}✘${RESET} $*"
}

emit_stats() {
  # Parseável por CI / logs (sempre; uma linha por variável)
  printf "CHECKS=%s\n" "$checks"
  printf "FAILURES=%s\n" "$failures"
  if [[ "$OUTPUT_JSON" == "true" ]]; then
    local sm
    [[ "$STRICT_MODE" == "true" ]] && sm=true || sm=false
    printf '{"checks":%s,"failures":%s,"strict_mode":%s}\n' "$checks" "$failures" "$sm"
  fi
}

normalize_url() {
  local base="$1"
  local path="$2"

  if [[ "$path" =~ ^https?:// ]]; then
    printf "%s" "$path"
    return
  fi

  if [[ "$path" == /* ]]; then
    printf "%s%s" "${base%/}" "$path"
  else
    printf "%s/%s" "${base%/}" "$path"
  fi
}

trim_trailing_slash() {
  local s="$1"
  if [[ "$s" != "/" ]]; then
    s="${s%/}"
  fi
  printf "%s" "$s"
}

# Portal e app em hosts distintos (Bloco B): smoke de auth no primeiro hop do app, não do portal.
financeiro_validate_separate_host() {
  if [[ "${FINANCEIRO_SEPARATE_HOST+x}" == "x" ]]; then
    [[ "$FINANCEIRO_SEPARATE_HOST" == "true" ]]
    return $?
  fi
  local b f
  b="$(trim_trailing_slash "$BASE_URL")"
  f="$(trim_trailing_slash "$FINANCEIRO_APP_URL")"
  [[ "$b" != "$f" ]]
}

fetch_headers() {
  local url="$1"
  curl -sS -I -L --max-redirs "$CURL_FOLLOW_MAX" -o /dev/null -w \
    "FINAL_URL=%{url_effective}\nHTTP_CODE=%{http_code}\nREDIRECTS=%{num_redirects}\nTIME_TOTAL=%{time_total}\n" \
    "$url"
}

first_hop_http_code() {
  curl -sS -o /dev/null -w "%{http_code}" -I "$1"
}

fetch_first_hop() {
  local url="$1"
  curl -sS -I -D - -o /dev/null "$url" 2>/dev/null || true
}

extract_location() {
  awk 'BEGIN{IGNORECASE=1} /^Location:/ {sub(/\r$/, "", $2); print $2; exit}'
}

resolve_location_abs() {
  local loc="$1"
  if [[ "$loc" =~ ^https?:// ]]; then
    printf "%s" "$loc"
    return
  fi
  if [[ "$loc" == /* ]]; then
    printf "%s%s" "${BASE_URL%/}" "$loc"
    return
  fi
  printf "%s" "$loc"
}

# Origem (scheme + host[:port]) da URL atual — para resolver Location relativo na cadeia
get_origin() {
  local u="$1"
  if [[ "$u" =~ ^(https?://[^/]+) ]]; then
    printf "%s" "${BASH_REMATCH[1]}"
  fi
}

# Próximo URL após um 3xx (Location relativo ao recurso solicitado)
resolve_redirect_target() {
  local current="$1"
  local loc="$2"
  [[ -z "$loc" ]] && return
  if [[ "$loc" =~ ^https?:// ]]; then
    printf "%s" "$loc"
    return
  fi
  if [[ "$loc" == /* ]]; then
    printf "%s%s" "$(get_origin "$current")" "$loc"
    return
  fi
  printf "%s" "$loc"
}

# URL final após seguir redirects (curl -L)
trace_redirect_chain() {
  local url="$1"
  curl -sS -I -L --max-redirs "$CURL_FOLLOW_MAX" -o /dev/null -w "%{url_effective}\n" "$url"
}

# Lista hop-a-hop (Location + detecção de loop na URL visitada)
trace_redirect_hops() {
  local start_url="$1"
  local label="${2:-}"
  log "TRACE redirect chain${label:+ — $label}"
  log "  final (curl -L): $(trace_redirect_chain "$start_url")"

  local current="$start_url"
  local i=0
  local seen="|"

  while [[ $i -lt $MAX_TRACE_HOPS ]]; do
    local headers
    headers="$(curl -sS -I -D - -o /dev/null "$current" 2>/dev/null || true)"
    local code
    code="$(printf "%s\n" "$headers" | head -1 | awk '{print $2}')"
    [[ -z "$code" ]] && code="???"

    if [[ "$seen" == *"|${current}|"* ]]; then
      warn "TRACE: redirect loop (URL repetida na cadeia) [$current]"
      return
    fi
    seen="${seen}${current}|"

    local loc
    loc="$(printf "%s\n" "$headers" | extract_location)"
    printf "%b    hop %s:%s %s → HTTP %s%s\n" "$YELLOW" "$((i + 1))" "$RESET" "$current" "$code" "${loc:+ → Location: $loc}"

    if [[ "$code" =~ ^3[0-9][0-9]$ ]] && [[ -n "${loc:-}" ]]; then
      current="$(resolve_redirect_target "$current" "$loc")"
      i=$((i + 1))
      continue
    fi
    break
  done
}

assert_final_code() {
  local label="$1"
  local url="$2"
  local expected_code="$3"

  checks=$((checks + 1))
  local result
  result="$(fetch_headers "$url")"

  local final_url http_code redirects time_total
  final_url="$(printf "%s\n" "$result" | awk -F= '/^FINAL_URL=/{print $2}')"
  http_code="$(printf "%s\n" "$result" | awk -F= '/^HTTP_CODE=/{print $2}')"
  redirects="$(printf "%s\n" "$result" | awk -F= '/^REDIRECTS=/{print $2}')"
  time_total="$(printf "%s\n" "$result" | awk -F= '/^TIME_TOTAL=/{print $2}')"

  local rd="${redirects:-0}"
  if [[ "$rd" -gt "$MAX_REDIRECTS_ALLOWED" ]]; then
    err "$label -> too many redirects ($rd > $MAX_REDIRECTS_ALLOWED) — possível loop ou cadeia excessiva [$final_url]"
    if [[ "$TRACE_REDIRECTS" == "true" ]]; then
      trace_redirect_hops "$url" "pós-falha ($label)"
    fi
    failures=$((failures + 1))
    [[ "$FAIL_FAST" == "true" ]] && exit 1
    return
  fi
  if [[ "$rd" -ge "$CURL_FOLLOW_MAX" ]]; then
    warn "$label -> redirects ($rd) atingiram CURL_FOLLOW_MAX=$CURL_FOLLOW_MAX — verifique loop ou aumente CURL_FOLLOW_MAX"
  fi

  if [[ "$http_code" != "$expected_code" ]]; then
    err "$label -> expected final code $expected_code, got $http_code (${time_total}s) [$final_url]"
    failures=$((failures + 1))
    [[ "$FAIL_FAST" == "true" ]] && exit 1
    return
  fi

  ok "$label -> final code $http_code (redirects: $redirects, ${time_total}s) [$final_url]"

  if [[ "$STRICT_MODE" == "true" ]] && [[ "$expected_code" == "200" ]]; then
    checks=$((checks + 1))
    local rc="${redirects:-0}"
    if [[ "$rc" -gt "$STRICT_MAX_PUBLIC_REDIRECTS" ]]; then
      err "$label -> STRICT_MODE: at most $STRICT_MAX_PUBLIC_REDIRECTS redirect(s) allowed to reach 200, got $redirects [$final_url]"
      failures=$((failures + 1))
      [[ "$FAIL_FAST" == "true" ]] && exit 1
    else
      ok "$label -> STRICT_MODE: redirect count OK ($redirects <= $STRICT_MAX_PUBLIC_REDIRECTS)"
    fi
  fi
}

assert_response_time() {
  local label="$1"
  local url="$2"
  local max_time="$3"

  [[ "$PERF_CHECK" == "true" ]] || return 0

  checks=$((checks + 1))
  local result time_s
  result="$(curl -sS -o /dev/null -w "TIME_TOTAL=%{time_total}\n" "$url")"
  time_s="$(printf "%s\n" "$result" | awk -F= '/^TIME_TOTAL=/{print $2}')"

  if awk -v t="$time_s" -v max="$max_time" 'BEGIN { exit (t + 0 > max + 0) }'; then
    ok "$label -> response time OK (${time_s}s <= ${max_time}s)"
  else
    err "$label -> slow response (${time_s}s > ${max_time}s)"
    failures=$((failures + 1))
    [[ "$FAIL_FAST" == "true" ]] && exit 1
  fi
}

assert_redirect_to() {
  local label="$1"
  local from_url="$2"
  local expected_location="$3"

  checks=$((checks + 1))

  if [[ "$STRICT_MODE" == "true" ]]; then
    local code
    code="$(first_hop_http_code "$from_url")"
    if [[ "$code" == "200" ]]; then
      err "$label -> STRICT_MODE: expected redirect (3xx), got 200 [$from_url]"
      failures=$((failures + 1))
      [[ "$FAIL_FAST" == "true" ]] && exit 1
      return
    fi
  fi

  local headers
  headers="$(fetch_first_hop "$from_url")"
  local first_location
  first_location="$(printf "%s\n" "$headers" | extract_location)"
  first_location="$(resolve_location_abs "$first_location")"

  local expected_norm first_norm
  expected_norm="$(trim_trailing_slash "$(resolve_location_abs "$expected_location")")"
  first_norm="$(trim_trailing_slash "$first_location")"

  if [[ -z "$first_location" ]]; then
    err "$label -> expected redirect to $expected_location but response had no Location header"
    failures=$((failures + 1))
    [[ "$FAIL_FAST" == "true" ]] && exit 1
    return
  fi

  if [[ "$first_norm" == "$expected_norm" ]]; then
    ok "$label -> redirect location OK [$first_location]"
  else
    err "$label -> expected redirect to [$expected_location], got [$first_location]"
    failures=$((failures + 1))
    [[ "$FAIL_FAST" == "true" ]] && exit 1
  fi
}

assert_redirect_prefix() {
  local label="$1"
  local from_url="$2"
  local expected_prefix="$3"

  checks=$((checks + 1))

  if [[ "$STRICT_MODE" == "true" ]]; then
    local code
    code="$(first_hop_http_code "$from_url")"
    if [[ "$code" == "200" ]]; then
      err "$label -> STRICT_MODE: expected redirect (3xx), got 200 [$from_url]"
      failures=$((failures + 1))
      [[ "$FAIL_FAST" == "true" ]] && exit 1
      return
    fi
  fi

  local headers
  headers="$(fetch_first_hop "$from_url")"
  local first_location
  first_location="$(printf "%s\n" "$headers" | extract_location)"
  first_location="$(resolve_location_abs "$first_location")"
  expected_prefix="$(resolve_location_abs "$expected_prefix")"

  if [[ -z "$first_location" ]]; then
    err "$label -> expected redirect with prefix $expected_prefix but response had no Location header"
    failures=$((failures + 1))
    [[ "$FAIL_FAST" == "true" ]] && exit 1
    return
  fi

  if [[ "$first_location" == "$expected_prefix"* ]]; then
    ok "$label -> redirect prefix OK [$first_location]"
  else
    err "$label -> expected redirect prefix [$expected_prefix], got [$first_location]"
    failures=$((failures + 1))
    [[ "$FAIL_FAST" == "true" ]] && exit 1
  fi
}

assert_query_preserved() {
  local label="$1"
  local from_url="$2"
  local expected_query_fragment="$3"

  checks=$((checks + 1))
  local headers
  headers="$(fetch_first_hop "$from_url")"
  local first_location
  first_location="$(printf "%s\n" "$headers" | extract_location)"
  first_location="$(resolve_location_abs "$first_location")"

  if [[ -z "$first_location" ]]; then
    err "$label -> expected redirect preserving query [$expected_query_fragment], but no Location header found"
    failures=$((failures + 1))
    [[ "$FAIL_FAST" == "true" ]] && exit 1
    return
  fi

  if [[ "$first_location" == *"$expected_query_fragment"* ]]; then
    ok "$label -> query preserved [$first_location]"
  else
    err "$label -> expected redirect containing query fragment [$expected_query_fragment], got [$first_location]"
    failures=$((failures + 1))
    [[ "$FAIL_FAST" == "true" ]] && exit 1
  fi
}

section() {
  printf "\n%b\n" "${BLUE}=== $* ===${RESET}"
}

log "BASE_URL=$BASE_URL"
log "APP_URL=$APP_URL"
log "FINANCEIRO_APP_URL=$FINANCEIRO_APP_URL"
log "PROTECTED_TEST_PATH=$PROTECTED_TEST_PATH"
log "AUTH_REDIRECT_PREFIX=$AUTH_REDIRECT_PREFIX"
log "AUTH_EXPECT_REDIRECT=$AUTH_EXPECT_REDIRECT"
log "FAIL_FAST=$FAIL_FAST"
log "STRICT_MODE=$STRICT_MODE STRICT_MAX_PUBLIC_REDIRECTS=$STRICT_MAX_PUBLIC_REDIRECTS"
log "PERF_CHECK=$PERF_CHECK PERF_MAX_FINANCEIRO_LANDING=$PERF_MAX_FINANCEIRO_LANDING"
log "OUTPUT_JSON=$OUTPUT_JSON"
log "MAX_REDIRECTS_ALLOWED=$MAX_REDIRECTS_ALLOWED CURL_FOLLOW_MAX=$CURL_FOLLOW_MAX TRACE_REDIRECTS=$TRACE_REDIRECTS"
log "SKIP_FINANCEIRO_DEMO_CHECK=$SKIP_FINANCEIRO_DEMO_CHECK"

# ------------------------------------------------------------
# 1) Public portal / marketing routes
# ------------------------------------------------------------
section "Public routes"

assert_final_code "Portal home" \
  "$(normalize_url "$BASE_URL" "/")" \
  "200"

assert_final_code "Ferramentas hub" \
  "$(normalize_url "$BASE_URL" "/ferramentas")" \
  "200"

assert_final_code "Financeiro landing" \
  "$(normalize_url "$BASE_URL" "/ferramentas/financeiro")" \
  "200"

if [[ "$SKIP_FINANCEIRO_DEMO_CHECK" == "true" ]]; then
  warn "Skipping Financeiro demo check (SKIP_FINANCEIRO_DEMO_CHECK=true)"
else
  demo_portal_url="$(normalize_url "$BASE_URL" "/ferramentas/financeiro/demo")"
  if financeiro_validate_separate_host; then
    # Portal só redireciona para o app; não exige 200 no primeiro hop (STRICT_MODE valida 3xx).
    demo_app_prefix="$(normalize_url "$FINANCEIRO_APP_URL" "/ferramentas/financeiro")"
    assert_redirect_prefix "Financeiro demo (portal → app canônico)" \
      "$demo_portal_url" \
      "$demo_app_prefix"
  else
    # Mesmo host (ex.: dev): pode haver redirect interno até 200 na landing.
    assert_final_code "Financeiro demo" \
      "$demo_portal_url" \
      "200"
  fi
fi

if [[ "$PERF_CHECK" == "true" ]]; then
  section "Performance (latency)"
  assert_response_time "Financeiro landing perf" \
    "$(normalize_url "$BASE_URL" "/ferramentas/financeiro")" \
    "$PERF_MAX_FINANCEIRO_LANDING"
fi

# ------------------------------------------------------------
# 2) Financeiro canonical targets (adjust if your cutover changes)
# ------------------------------------------------------------
section "Financeiro canonical surface"

# assert_final_code "Financeiro app root" \
#   "$(normalize_url "$FINANCEIRO_APP_URL" "/")" \
#   "200"

# ------------------------------------------------------------
# 3) Auth / protected routes
# ------------------------------------------------------------
section "Protected routes"

if [[ "$AUTH_EXPECT_REDIRECT" == "true" ]]; then
  if financeiro_validate_separate_host; then
    cutover_target="$(normalize_url "$FINANCEIRO_APP_URL" "$PROTECTED_TEST_PATH")"
    auth_on_app="$(normalize_url "$FINANCEIRO_APP_URL" "/ferramentas/financeiro/auth")"
    assert_redirect_to "Portal → app Financeiro (308 cutover)" \
      "$(normalize_url "$BASE_URL" "$PROTECTED_TEST_PATH")" \
      "$cutover_target"
    assert_redirect_prefix "App Financeiro → auth (sem sessão)" \
      "$cutover_target" \
      "$auth_on_app"
    assert_query_preserved "Cutover preserva next (portal → app)" \
      "$(normalize_url "$BASE_URL" "${PROTECTED_TEST_PATH}?next=%2Fferramentas%2Ffinanceiro%2Fdashboard")" \
      "next="
  else
    # Bloco C: portal não serve operação; mesmo host (ex.: dev só com raiz) ⇒ 404, não redirect para auth.
    assert_final_code "Portal não serve rota operacional Financeiro (Bloco C)" \
      "$(normalize_url "$BASE_URL" "$PROTECTED_TEST_PATH")" \
      "404"
  fi
else
  warn "Skipping protected redirect expectation because AUTH_EXPECT_REDIRECT=false"
fi

# ------------------------------------------------------------
# 4) Legacy -> canonical redirects
# ------------------------------------------------------------
section "Legacy redirects"

# assert_redirect_to "Legacy ..." ...

# ------------------------------------------------------------
# 5) Billing separation
# ------------------------------------------------------------
section "Billing"

assert_final_code "Portal pricing/commercial page" \
  "$(normalize_url "$BASE_URL" "/precos")" \
  "200"

# ------------------------------------------------------------
# Redirect trace (debug)
# ------------------------------------------------------------
if [[ "$TRACE_REDIRECTS" == "true" ]]; then
  section "Redirect trace (TRACE_REDIRECTS=true)"
  trace_redirect_hops "$(normalize_url "$BASE_URL" "/ferramentas/financeiro")" "Financeiro landing"
  if [[ "$AUTH_EXPECT_REDIRECT" == "true" ]]; then
    trace_redirect_hops "$(normalize_url "$BASE_URL" "$PROTECTED_TEST_PATH")" "Protected (sem sessão)"
  fi
fi

# ------------------------------------------------------------
# Summary
# ------------------------------------------------------------
section "Summary"

if [[ "$failures" -eq 0 ]]; then
  ok "All checks passed ($checks checks)"
  emit_stats
  exit 0
else
  err "Validation failed: $failures of $checks checks failed"
  emit_stats
  exit 1
fi
