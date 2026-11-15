# AGENTS.md

Outbid is a Vite + React + TypeScript app on Supabase: a live auction with magic-link sign-in, bids
through one Postgres function, lot photos in Storage, live prices over Realtime, and an MCP server as an
Edge Function. `README.md` explains the layout; `CONTEXT.md` has the words to use.

## Commands

- `npm test`: unit tests. Run after any change in `src/`.
- `npm run test:rls`: row level security, bidding, storage and realtime against the local stack. Needs `SUPABASE_EXPERIMENTAL_STACK=1 supabase start --runtime native` first.
- `npm run gauntlet`: every check (types, lint, both suites, build, secret scan, audit). Run it before you call a change done.
- `npm run types`: regenerate `src/database.types.ts` after any schema change.

## Rules

- Never commit an env file. Only `.env.example` files are tracked; `.gitignore` covers the rest and the gauntlet fails on a committed one. Secret keys never go in browser code: the app uses only the publishable key.
- Bids go through `public.place_bid(lot_id, amount)` only. Don't add insert, update or delete grants or policies on `public.bids`, and don't move the minimum-bid rule into the frontend.
- Change the schema with a new migration (`supabase migration new <name>`, or `supabase db diff -f <name>` after changing the local database). Don't edit a migration that has been pushed.
- `src/lib/auction.ts` is the only UI module that talks to Supabase. Components use the `Auction` interface in `src/lib/types.ts`; `src/lib/mock-auction.ts` must keep implementing it.
- The MCP tools in `supabase/functions/mcp/tools/` act as the signed-in user. Keep every query on the client the middleware provides, so row level security applies.
- After a change on `main`, run `demo/make-demo-start.sh` so the talk's starting point (tag `demo-start`) matches.

## Supabase know-how

Use the official Supabase agent skills before you write SQL, policies or Edge Function code. They are
installed per user, not in this repo (README, Prerequisites). The local stack also runs an MCP server;
`supabase status` prints its URL, and Studio's Connect, MCP tab prints the command that connects an agent.
