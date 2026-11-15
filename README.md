# Outbid

A live charity auction for the JSNation US 2026 closing party, built for the talk *Your App Has a
Backend. Here's the Supabase Workflow You're Missing*. Bidders sign in with a magic link, bid on six
lots, and watch prices change live. They can also bid from Claude: the app ships its
own MCP server as a Supabase Edge Function.

Everything the backend needs lives in this repo: `supabase/config.toml`, the migration in
`supabase/migrations/`, the seed, the Edge Function and the generated TypeScript types.

## Prerequisites

- Node 22 or later.
- The Supabase CLI 2.122 or later: `brew install supabase/tap/supabase` (update with `brew upgrade supabase`). No Docker.
- A coding agent with the Supabase agent skills, installed once for your user rather than per project:
  - Claude Code: `claude plugin marketplace add supabase/agent-skills`, then
    `claude plugin install supabase@supabase-agent-skills` and
    `claude plugin install postgres-best-practices@supabase-agent-skills`.
    Update them with `claude plugin marketplace update supabase-agent-skills` and `claude plugin update <plugin>`.
  - Other agents: `npx skills add supabase/agent-skills -g` (update with `npx skills update -g`).
- To let the agent work on your local database, connect it to the local project's MCP server after
  `supabase start`: Studio, Connect, MCP, pick your agent, and run the command it shows. The port changes
  on every start, so connect again after a new start.

## Run it locally

```bash
npm install
export SUPABASE_EXPERIMENTAL_STACK=1
supabase start --runtime native   # Postgres, Auth, Storage, Realtime, Edge Functions, Studio, MCP, Mailpit
supabase db reset                 # applies the migration, the seed and the lot photos
npm run env:local                 # writes .env.local from the running stack
npm run dev
```

Open http://localhost:5173. Magic-link emails land in Mailpit; `supabase status` prints its URL.

## Deploy to your own project

```bash
supabase link --project-ref <your-project-ref>
supabase db push --linked --include-seed && supabase seed buckets --linked
supabase config push   # first set [auth] site_url in config.toml to your deployed app's URL
supabase functions deploy mcp --no-verify-jwt
npm run env:hosted && npm run dev:hosted
```

`config push` turns on the OAuth 2.1 server (`[auth.oauth_server]` in `config.toml`), which MCP
clients use to sign in. To bid from Claude, add a custom connector with the URL
`https://<your-project-ref>.supabase.co/functions/v1/mcp`, sign in on the consent page, and approve.

## How it is put together

- `src/lib/types.ts` holds the `Auction` interface the UI talks to. `src/lib/auction.ts` is the Supabase adapter; `src/lib/mock-auction.ts` is the in-memory stand-in the talk starts from.
- `public.place_bid(lot_id, amount)` is the only way to bid. It locks the lot row, so two bids at the same price can't both win, and it enforces the minimum. Clients can't write to `bids` directly.
- The bidder's name is their display name (click your name in the header to change it), or the part of their email before the @. The full email is never shown.
- Realtime: `postgres_changes` on `bids` refreshes prices; a Presence channel powers "N watching".
- Lot photos live in the public `lots` bucket as `<lot id>.jpg`.
- `supabase/functions/mcp/` is the MCP server: `list_lots`, `place_bid` and `whoami`, plus an MCP App view (`mcp-view/`) that shows the lots as cards inside the chat. Every call runs as the signed-in user, through row level security.
- The look follows jsnation.us. The JSNation logo in `public/` belongs to GitNation.

The glossary is in `CONTEXT.md`.

## Tests

```bash
npm test          # unit tests: bidding rules, the UI against a fake adapter
npm run test:rls  # row level security, bidding, storage and realtime against the running local stack
npm run gauntlet  # types, lint, both suites, build, secret scan, audit
```

The RLS suite creates throwaway users through the admin API, so it needs `supabase start` first.

## The talk's four acts

`demo/` holds what the talk uses: the prompts Claude Code gets in Act 2 (`demo/prompts/`), the schema
they should produce (`demo/expected-schema.sql`), the seed and photos, and the MCP tools Act 4 copies in.

1. `supabase init`, `node demo/configure.mjs`, `supabase start --runtime native --eager`, and Claude Code connected to the local MCP server.
2. Claude Code builds the schema from `demo/prompts/schema.md`, then checks it against `demo/prompts/schema-details.md`.
3. `supabase db diff -f create_lots_and_bids` extracts the migration; `supabase db reset` rebuilds from git.
4. By hand: `supabase link` and `supabase db push --linked --include-seed`, then the MCP server from the Supabase Library (`npx shadcn@latest add https://supabase.com/library/r/mcp.json`). Then `node demo/ship.mjs` does the rest and prints each command: types and the typed client, the app pointed at the cloud, the photos, the OAuth server in `config.toml` (the push prints the diff), the two MCP tools, and the deploy. Last, bid from Claude.

`demo/reset.sh` returns the repo to the starting state (tag `demo-start`, branch `supa-backend`), and
`demo/reset-hosted.sh` empties the hosted project. `demo/make-demo-start.sh` regenerates the tag from
`main`; run it after any change on `main`.

## Agent skills

The repo doesn't vendor the Supabase agent skills: install them for your user (see Prerequisites), so
they stay current across projects. Instructions for agents are in `AGENTS.md`.
