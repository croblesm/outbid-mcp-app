#!/usr/bin/env bash
# Rebuilds tag demo-start (the on-camera starting state) from main: the same frontend on mock data,
# with the backend removed. Run it after every change on main, so the recording never shows a stale UI.
set -euo pipefail
root=$(git rev-parse --show-toplevel)
cd "$root"
[ "$(git branch --show-current)" = main ] && [ -z "$(git status --porcelain)" ] || { echo "run this on a clean main"; exit 1; }
wt=$(mktemp -d)
trap 'git -C "$root" worktree remove --force "$wt" >/dev/null 2>&1 || true' EXIT
git worktree add -q --detach "$wt" main
cd "$wt"
# Act 4 (demo/ship.mjs) copies these over the Library block's files; keep them, they live under supabase/ on main.
mkdir -p demo/mcp
cp supabase/functions/mcp/tools/{index,lots,result,view}.ts demo/mcp/
git add demo/mcp
# What Acts 1 to 4 create on camera does not exist yet.
git rm -rq supabase src/database.types.ts tests/rls.test.ts
# The UI reads the in-memory adapter; the Supabase client exists but is untyped until Act 4.
sed -i '' 's#from "@/lib/auction"#from "@/lib/mock-auction"#' src/App.tsx
cat > src/lib/supabase.ts <<'TS'
import { createClient } from "@supabase/supabase-js"

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
)
TS
grep -q '"@/lib/mock-auction"' src/App.tsx || { echo "App.tsx import swap failed"; exit 1; }
# Prove the starting state compiles, renders its tests and builds before tagging it.
ln -s "$root/node_modules" node_modules
npx tsc -b && npx vitest run src --reporter=dot && npx vite build --logLevel error >/dev/null
rm -rf node_modules dist
git add -A
git commit -qm "demo start: frontend on mock data, no backend (generated from main $(git rev-parse --short main))"
sha=$(git rev-parse HEAD)   # resolve here: HEAD in "$root" is main
git -C "$root" tag -f demo-start "$sha" >/dev/null
[ "$(git -C "$root" rev-parse demo-start)" = "$sha" ] || { echo "tagging failed"; exit 1; }
echo "demo-start -> $(git rev-parse --short "$sha") (from main $(git rev-parse --short main))"
