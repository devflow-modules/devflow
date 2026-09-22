#!/usr/bin/env bash
# Fictional diffs: modifying an existing route must pass; adding a route without
# a governance file must fail; adding a route plus ROUTING_POLICY.md must pass.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCRIPT="$ROOT/scripts/ci/check-routing-governance.sh"
TMP="$(mktemp -d)"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

git init -q "$TMP"
git -C "$TMP" config user.email "routing-gov-test@example.invalid"
git -C "$TMP" config user.name "Routing Gov Test"

mkdir -p "$TMP/src/app/api/existing" "$TMP/docs/architecture"
printf 'export function GET() {}\n' > "$TMP/src/app/api/existing/route.ts"
printf '# policy\n' > "$TMP/docs/architecture/ROUTING_POLICY.md"
git -C "$TMP" add src/app/api/existing/route.ts docs/architecture/ROUTING_POLICY.md
git -C "$TMP" commit -qm "base"

printf 'export function POST() {}\n' >> "$TMP/src/app/api/existing/route.ts"
git -C "$TMP" add src/app/api/existing/route.ts
git -C "$TMP" commit -qm "modify existing route"

if ! (cd "$TMP" && bash "$SCRIPT" HEAD~1 HEAD); then
  echo "FAIL: modify of existing route.ts should not trip the gate"
  exit 1
fi

mkdir -p "$TMP/apps/financeiro/src/app/api/new"
printf 'export function GET() {}\n' > "$TMP/apps/financeiro/src/app/api/new/route.ts"
git -C "$TMP" add apps/financeiro/src/app/api/new/route.ts
git -C "$TMP" commit -qm "add new route without governance"

if (cd "$TMP" && bash "$SCRIPT" HEAD~1 HEAD); then
  echo "FAIL: added route.ts without governance should fail"
  exit 1
fi

printf '\nGate: added page/route files only.\n' >> "$TMP/docs/architecture/ROUTING_POLICY.md"
git -C "$TMP" add docs/architecture/ROUTING_POLICY.md
git -C "$TMP" commit -qm "document new route"

if ! (cd "$TMP" && bash "$SCRIPT" HEAD~2 HEAD); then
  echo "FAIL: added route.ts plus ROUTING_POLICY.md should pass"
  exit 1
fi

echo "check-routing-governance.test.sh: OK"
