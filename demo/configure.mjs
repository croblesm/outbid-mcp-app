// Act 1 helper: applies Outbid's settings to the supabase/config.toml that `supabase init` wrote.
// Run it before `supabase start`: Auth reads site_url and the redirect allow-list when it starts, and
// `db reset` does not reload them, so magic links would otherwise point at http://127.0.0.1:3000.
// Auth redirects to the Vite dev server, the lots bucket is seeded from demo/photos, and a few
// defaults match a new hosted project, so Act 4's `supabase config diff` shows only what we change.
import { readFileSync, writeFileSync } from "node:fs"

const path = "supabase/config.toml"
let toml = readFileSync(path, "utf8")

// Set `key = value` inside [section], failing loudly if the line is not where init puts it.
function set(section, key, value) {
  const start = toml.indexOf(`\n[${section}]\n`)
  if (start < 0) throw new Error(`[${section}] not found in ${path}`)
  const end = toml.indexOf("\n[", start + 1)
  const body = toml.slice(start, end < 0 ? undefined : end)
  const line = new RegExp(`^${key} = .*$`, "m")
  if (!line.test(body)) throw new Error(`${key} not found in [${section}]`)
  toml = toml.slice(0, start) + body.replace(line, `${key} = ${value}`) + (end < 0 ? "" : toml.slice(end))
}

set("auth", "site_url", '"http://localhost:5173"')
set("auth", "additional_redirect_urls", '["http://localhost:5173", "http://127.0.0.1:5173"]')
set("auth.email", "enable_confirmations", "true")
set("auth.email", "max_frequency", '"1m0s"')
set("auth.email", "otp_length", "8")
set("auth.mfa.totp", "enroll_enabled", "true")
set("auth.mfa.totp", "verify_enabled", "true")
set("db.pooler", "default_pool_size", "15")
set("db.pooler", "max_client_conn", "200")
set("storage.vector", "enabled", "false")
if (!toml.includes("[storage.buckets.lots]")) toml += readFileSync("demo/lots.toml", "utf8")

writeFileSync(path, toml)
console.log(`${path}: Outbid settings applied`)
