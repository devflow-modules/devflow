#!/usr/bin/env bash
# CI / local: se um page.tsx ou route.ts foi *adicionado* (raiz ou apps/*),
# exige mudança em pelo menos um artefato de governança.
# Edições em page/route existentes não disparam o gate.
# Uso local: bash scripts/ci/check-routing-governance.sh origin/main HEAD
set -euo pipefail

BASE_REF="${1:?usage: check-routing-governance.sh <base-ref> <head-ref>}"
HEAD_REF="${2:?usage: check-routing-governance.sh <base-ref> <head-ref>}"

GOV_FILES=(
  "src/lib/routing-governance.ts"
  "docs/site/MATRIZ-DECISAO-ROTAS.md"
  "docs/architecture/ROUTING_POLICY.md"
)

is_route_file() {
  local file="$1"
  [[ "$file" =~ ^src/app/.*(page\.tsx|route\.ts)$ ]] ||
    [[ "$file" =~ ^apps/.+/src/app/.*(page\.tsx|route\.ts)$ ]]
}

changed="$(git diff --name-only "$BASE_REF" "$HEAD_REF" 2>/dev/null || true)"
added="$(git diff --diff-filter=A --name-only "$BASE_REF" "$HEAD_REF" 2>/dev/null || true)"

routes_changed=0
gov_changed=0

while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  for g in "${GOV_FILES[@]}"; do
    if [[ "$file" == "$g" ]]; then
      gov_changed=1
      break
    fi
  done
done <<< "$changed"

while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  if is_route_file "$file"; then
    routes_changed=1
  fi
done <<< "$added"

if [[ "$routes_changed" -eq 1 && "$gov_changed" -eq 0 ]]; then
  if [[ -n "${GITHUB_ACTIONS:-}" ]]; then
    echo "::error title=Routing governance::PR adiciona page.tsx / route.ts sem atualizar governança."
  else
    echo "ERRO: rotas novas (ficheiros adicionados) sem atualização de governança."
  fi
  echo ""
  echo "Altere pelo menos um destes arquivos no mesmo PR:"
  for g in "${GOV_FILES[@]}"; do
    echo "  - $g"
  done
  echo ""
  echo "Policy: docs/architecture/ROUTING_POLICY.md"
  echo "O gate usa git diff --diff-filter=A (só ficheiros adicionados)."
  echo "Rodar localmente: bash scripts/ci/check-routing-governance.sh <base> <head>"
  exit 1
fi

echo "routing-governance check: OK (routes_changed=$routes_changed, gov_changed=$gov_changed)"
