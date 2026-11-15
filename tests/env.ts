import { execSync } from "node:child_process"

/** Connection details of the running local stack, straight from the CLI. */
export function stackEnv() {
  const out = execSync("supabase status --env --output-format json", { encoding: "utf8" })
  const parsed = JSON.parse(out.slice(out.indexOf("{")))
  const env: Record<string, string> = parsed.env ?? parsed
  for (const key of ["API_URL", "PUBLISHABLE_KEY", "SECRET_KEY"]) {
    if (!env[key]) throw new Error(`${key} missing from supabase status --env; is the stack running?`)
  }
  return env
}
