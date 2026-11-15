// Act 4 helper: ships Outbid to the linked Supabase project and points the app at it. Run it after the
// two commands Act 4 types by hand: `supabase link ... && supabase db push --linked --include-seed`, and
// the Library block, `npx shadcn@latest add https://supabase.com/library/r/mcp.json`.
// Every step prints the command it runs, so the recording shows the same steps a CI job would run.
import { execSync } from "node:child_process"
import {
  cpSync,
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs"
import { createClient } from "@supabase/supabase-js"

// Agent shells make the CLI print JSON; the recording runs in a plain terminal, so force that output.
const env = { ...process.env, CLAUDECODE: "", AI_AGENT: "" }
const step = (title) => console.log(`\n\x1b[1;33m▸ ${title}\x1b[0m`)
const fail = (message) => {
  console.error(`\n\x1b[1;31m✗ ${message}\x1b[0m`)
  process.exit(1)
}
// Network calls can blip (a deploy once failed with TransportError and worked on the next try): retry once.
// Every step is safe to repeat, so on a second failure the fix is to run the script again.
const run = (command) => {
  console.log(`\x1b[36m$ ${command}\x1b[0m`)
  for (let attempt = 1; ; attempt++) {
    try {
      return execSync(command, { stdio: "inherit", env })
    } catch {
      if (attempt === 2)
        fail(
          `${command} failed twice. Read its output above, then run node demo/ship.mjs again.`
        )
      console.log("\x1b[33mFailed, trying once more…\x1b[0m")
    }
  }
}

const ref = existsSync("supabase/supabase.lock")
  ? JSON.parse(readFileSync("supabase/supabase.lock", "utf8")).linked?.project
  : undefined
if (!ref) fail("no linked project: run supabase link first")
if (!existsSync("supabase/functions/mcp/index.ts"))
  fail(
    "no MCP server: run npx shadcn@latest add https://supabase.com/library/r/mcp.json first"
  )

step(
  "The app: types from the schema, a typed client, and the cloud project's URL and key"
)
run("npm run --silent types")
run("npx prettier --log-level warn --write src/database.types.ts") // the CLI writes it unformatted; Act 4 shows it
run("node tools/env-hosted.mjs")
writeFileSync(
  "src/lib/supabase.ts",
  `import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/database.types"

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
)
`
)
const app = readFileSync("src/App.tsx", "utf8").replace(
  'from "@/lib/mock-auction"',
  'from "@/lib/auction"'
)
if (!app.includes('from "@/lib/auction"'))
  fail("src/App.tsx: auction import not found")
writeFileSync("src/App.tsx", app)
console.log(
  "src/lib/supabase.ts: typed client · src/App.tsx: mock data → Supabase"
)
run("npx tsc -b")

step("Storage: the lot photos")
run("supabase seed buckets --linked --yes")

step(
  "Auth: turn on the OAuth server in config.toml and push it (the push prints the diff)"
)
const toml = readFileSync("supabase/config.toml", "utf8")
const start = toml.indexOf("\n[auth.oauth_server]\n")
if (start < 0) fail("[auth.oauth_server] not found in supabase/config.toml")
const end = toml.indexOf("\n[", start + 1)
const section = toml
  .slice(start, end)
  .replace(/^enabled = false$/m, "enabled = true")
  .replace(
    /^allow_dynamic_registration = false$/m,
    "allow_dynamic_registration = true"
  )
writeFileSync(
  "supabase/config.toml",
  toml.slice(0, start) + section + toml.slice(end)
)
console.log(
  "supabase/config.toml: [auth.oauth_server] enabled = true, allow_dynamic_registration = true"
)
run("supabase config push --yes")

step("MCP server: my two tools, then deploy the Edge Function")
// demo/mcp exists on the demo-start tag; on main the tools already live in supabase/functions/mcp/tools.
if (existsSync("demo/mcp")) {
  for (const file of readdirSync("demo/mcp"))
    cpSync(`demo/mcp/${file}`, `supabase/functions/mcp/tools/${file}`)
  console.log(
    `demo/mcp → supabase/functions/mcp/tools: ${readdirSync("demo/mcp").join(", ")}`
  )
}
run("supabase functions deploy mcp --no-verify-jwt")

step("Check: what the app and Claude will see")
const url = `https://${ref}.supabase.co`
const key = readFileSync(".env.hosted.local", "utf8").match(
  /^VITE_SUPABASE_PUBLISHABLE_KEY=(.+)$/m
)?.[1]
const supabase = createClient(url, key)
const lots = await supabase.from("lots").select("id")
const photos = await supabase.storage.from("lots").list()
if (lots.error || lots.data.length !== 6)
  fail(
    `expected 6 lots in the cloud, got ${lots.error?.message ?? lots.data.length}: did db push run?`
  )
if (photos.error || photos.data.length < 6)
  fail(
    `expected 6 photos in the cloud, got ${photos.error?.message ?? photos.data.length}`
  )
console.log(`${url}: ${lots.data.length} lots, ${photos.data.length} photos`)
const mcp = await fetch(`${url}/functions/v1/mcp`, {
  method: "POST",
  body: "{}",
})
if (mcp.status !== 401)
  fail(`MCP server answered ${mcp.status}, expected 401 (sign in first)`)
// Auth can take a few seconds to serve the OAuth metadata after config push.
let oauth
for (let i = 0; i < 15 && oauth?.status !== 200; i++) {
  if (i) await new Promise((r) => setTimeout(r, 1000))
  oauth = await fetch(`${url}/.well-known/oauth-authorization-server/auth/v1`)
}
if (oauth.status !== 200)
  fail(`OAuth metadata answered ${oauth.status}: is the OAuth server on?`)
console.log(
  `${url}/functions/v1/mcp: asks Claude to sign in · OAuth server: on`
)
console.log("\n\x1b[1;32m✓ Ready. Reload the app: http://localhost:5173\x1b[0m")
