#!/usr/bin/env bash
# One entry point for every evidence layer. Exits nonzero on the first failure.
# Requires the local Supabase stack to be running for the RLS layer.
set -euo pipefail
cd "$(dirname "$0")/.."

# tsc -b, not tsc --noEmit: the root tsconfig only holds references, so --noEmit there checks zero files.
echo "== types";   npx tsc -b
echo "== lint";    npx eslint .
echo "== unit";    npx vitest run src
echo "== rls";     npx vitest run tests --coverage.enabled=false
echo "== build";   npx vite build --logLevel warn
echo "== secrets"
# Only *.env.example files may be committed; .gitignore keeps the rest out, this catches a forced add.
tracked=$(git ls-files | grep -E '(^|/)\.env(\.|$)' | grep -v -E '\.env\.example$' || true)
[ -z "$tracked" ] || { echo "env files committed: $tracked"; exit 1; }
# The SDK itself contains the strings "sb_secret_" and "service_role", so look for this stack's actual secret values.
secrets=$(supabase status --env --output-format json | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{const e=JSON.parse(s.slice(s.indexOf("{")));const v=e.env??e;console.log([v.SECRET_KEY,v.SERVICE_ROLE_KEY,v.JWT_SECRET].filter(Boolean).join("\n"))})')
[ -n "$secrets" ] || { echo "could not read secrets from supabase status"; exit 1; }
if grep -rFl -f <(printf '%s\n' "$secrets") dist/; then echo "secret material in dist/"; exit 1; fi
# Dev tooling (shadcn CLI -> braces) carries known high findings that never ship; production deps must be clean.
echo "== audit";   npm audit --omit=dev --audit-level=high
echo "== audit (dev, informational)"; npm audit --audit-level=high || true
echo "== gauntlet green $(git rev-parse --short HEAD)"
