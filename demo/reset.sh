#!/usr/bin/env bash
# Back to the on-camera starting state: branch "supa-backend" at tag demo-start (frontend with mock data, no backend),
# local stack destroyed so Act 2 starts from an empty database. Keeps node_modules. main is untouched.
# The hosted project has its own reset: demo/reset-hosted.sh.
set -euo pipefail
if [ -z "${RESET_COPY:-}" ]; then t=$(mktemp); cp "$0" "$t"; RESET_COPY=1 exec bash "$t" "$@"; fi   # the file vanishes on checkout
cd "$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel 2>/dev/null || echo "$HOME/js-nation-2026/outbid")"
git rev-parse -q --verify demo-start >/dev/null || { echo "tag demo-start missing"; exit 1; }
if [ -n "$(git status --porcelain)" ]; then
  echo "working tree has changes (previous take?). They will be discarded in 5 s; Ctrl+C to keep them."
  sleep 5
fi
# Stacks are per git branch: destroy this branch's stack, switch to supa-backend, destroy its stack from the previous rehearsal.
supabase stack destroy --yes >/dev/null 2>&1 || true
git checkout -q -f -B supa-backend demo-start   # -f: a previous take's edits to tracked files must not ride along
git branch -D take >/dev/null 2>&1 || true      # the branch's name before October 24
supabase stack destroy --yes >/dev/null 2>&1 || true
git clean -qfdx -e node_modules
echo "on branch supa-backend at demo-start ($(git rev-parse --short HEAD)), local stack destroyed. Start the dev server with: npm run dev:hosted"
