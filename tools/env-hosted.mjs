// Writes .env.hosted.local for the linked project (vite --mode hosted reads it). Only the publishable key:
// it is safe in a browser; the secret key never leaves the CLI.
import { execSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"

// CLI 2.122+ records the link in supabase/supabase.lock; older versions wrote supabase/.temp/project-ref.
const ref = existsSync("supabase/supabase.lock")
  ? JSON.parse(readFileSync("supabase/supabase.lock", "utf8")).linked?.project
  : readFileSync("supabase/.temp/project-ref", "utf8").trim()
if (!ref) throw new Error("no linked project: run supabase link first")
const out = execSync(`supabase projects api-keys --project-ref ${ref} --output-format json`, {
  encoding: "utf8",
  env: { ...process.env, CLAUDECODE: "", AI_AGENT: "" },
})
const parsed = JSON.parse(out.slice(out.search(/[[{]/)))
const keys = Array.isArray(parsed) ? parsed : parsed.keys
const publishable = keys.find((k) => k.type === "publishable")?.api_key
if (!publishable) throw new Error("no publishable key on the linked project")
writeFileSync(
  ".env.hosted.local",
  `VITE_SUPABASE_URL=https://${ref}.supabase.co\nVITE_SUPABASE_PUBLISHABLE_KEY=${publishable}\n`,
)
console.log(`.env.hosted.local -> https://${ref}.supabase.co`)
