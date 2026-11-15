// Optional closing beat: a bidding war on the linked (cloud) project, run after Act 4.
// Twelve bidders try to place the same next bid on one lot at the same moment, round after round. place_bid
// locks the lot row, so exactly one bid wins each round and the rest are refused with "Bid at least $N".
// Watch the app window while it runs; the script ends by checking the lot's bid history.
//   node demo/bidding-war.mjs --yes            the rubber duck, 10 rounds
//   node demo/bidding-war.mjs --yes 4 15       lot 4, 15 rounds
// The bidders are real users on the project (bidder01@outbid.test ...), created on the first run and kept,
// like your own user, so resets don't recreate them. Their passwords are reset on every run. To remove them,
// delete the bidder*@outbid.test users in Authentication; their bids go with them.
import { execSync } from "node:child_process"
import { randomBytes } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"

const args = process.argv.slice(2).filter((a) => a !== "--yes")
const LOT = Number(args[0] ?? 3)
const ROUNDS = Number(args[1] ?? 10)
const NAMES = [
  "otter",
  "lynx",
  "quokka",
  "narwhal",
  "heron",
  "ibex",
  "marmot",
  "puffin",
  "okapi",
  "tapir",
  "gecko",
  "wombat",
]

const fail = (message) => {
  console.error(`\n\x1b[1;31m✗ ${message}\x1b[0m`)
  process.exit(1)
}
const ref = existsSync("supabase/supabase.lock")
  ? JSON.parse(readFileSync("supabase/supabase.lock", "utf8")).linked?.project
  : undefined
if (!ref) fail("no linked project: run Act 4 first")
const url = `https://${ref}.supabase.co`
if (!process.argv.includes("--yes")) {
  console.log(
    `This creates 12 test users (bidder01@outbid.test ...) on project ${ref} and bids as them on lot ${LOT}.`
  )
  console.log(
    "Run it only against a demo project: node demo/bidding-war.mjs --yes"
  )
  process.exit(1)
}

// The secret key stays in this process: it creates the bidders and reads the history, never reaches a browser.
const out = execSync(
  `supabase projects api-keys --project-ref ${ref} --reveal --output-format json`,
  {
    encoding: "utf8",
    env: { ...process.env, CLAUDECODE: "", AI_AGENT: "" },
  }
)
const parsed = JSON.parse(out.slice(out.search(/[[{]/)))
const keys = Array.isArray(parsed) ? parsed : parsed.keys
const key = (type) => keys.find((k) => k.type === type)?.api_key
const admin = createClient(url, key("secret"), {
  auth: { persistSession: false },
})

const { data: lot, error: lotError } = await admin
  .from("lots")
  .select("title, starting_price, increment")
  .eq("id", LOT)
  .single()
if (lotError)
  fail(
    `lot ${LOT} not found in the cloud: did Act 4 run? (${lotError.message})`
  )

console.log(`\x1b[1;33m▸ ${NAMES.length} bidders sign in\x1b[0m`)
const { data: existing } = await admin.auth.admin.listUsers({ perPage: 1000 })
const bidders = await Promise.all(
  NAMES.map(async (name, i) => {
    const email = `bidder${String(i + 1).padStart(2, "0")}@outbid.test`
    const password = randomBytes(18).toString("base64url")
    const found = existing.users.find((u) => u.email === email)
    const { data: created, error } = found
      ? await admin.auth.admin.updateUserById(found.id, { password })
      : await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { display_name: name },
        })
    if (error) fail(`${email}: ${error.message}`)
    const id = found?.id ?? created.user.id
    const client = createClient(url, key("publishable"), {
      auth: { persistSession: false },
    })
    const signIn = await client.auth.signInWithPassword({ email, password })
    if (signIn.error)
      fail(`${email} could not sign in: ${signIn.error.message}`)
    return { name, client, id }
  })
)
console.log(NAMES.join(", "))

const top = async () => {
  const { data } = await admin
    .from("bids")
    .select("amount")
    .eq("lot_id", LOT)
    .order("amount", { ascending: false })
    .limit(1)
  return data[0]?.amount ?? null
}
const before = await top()
const first = before === null ? lot.starting_price : before + lot.increment

console.log(
  `\n\x1b[1;33m▸ ${ROUNDS} rounds on lot ${LOT}, ${lot.title}: everyone bids the same amount at once\x1b[0m`
)
let accepted = 0
let refused = 0
for (let round = 1; round <= ROUNDS; round++) {
  const current = await top()
  const amount = current === null ? lot.starting_price : current + lot.increment
  const results = await Promise.all(
    bidders.map(async (b) => ({
      name: b.name,
      error: (await b.client.rpc("place_bid", { lot_id: LOT, amount })).error,
    }))
  )
  const winners = results.filter((r) => !r.error)
  accepted += winners.length
  refused += results.length - winners.length
  const other = results.find(
    (r) => r.error && !/Bid at least/.test(r.error.message)
  )
  if (other) fail(`unexpected error from ${other.name}: ${other.error.message}`)
  console.log(
    `round ${String(round).padStart(2)}  $${amount}  ${winners.map((w) => w.name).join(", ") || "nobody"} wins, ${results.length - winners.length} refused`
  )
  await new Promise((r) => setTimeout(r, 700))
}

console.log(`\n\x1b[1;33m▸ Check the lot's history\x1b[0m`)
const { data: war } = await admin
  .from("bids")
  .select("amount")
  .eq("lot_id", LOT)
  .in(
    "user_id",
    bidders.map((b) => b.id)
  ) // only the war's bids: a real bid placed meanwhile must not fail the check
  .gte("amount", first)
  .order("created_at")
const amounts = war.map((b) => b.amount)
const expected = Array.from(
  { length: ROUNDS },
  (_, i) => first + i * lot.increment
)
if (
  accepted !== ROUNDS ||
  JSON.stringify(amounts) !== JSON.stringify(expected)
) {
  fail(
    `expected one winner per round at ${expected.join(", ")}; got ${accepted} winners at ${amounts.join(", ")}`
  )
}
console.log(
  `${accepted + refused} bids in ${ROUNDS} rounds: ${accepted} accepted, ${refused} refused.`
)
console.log(
  `Prices $${expected[0]} to $${expected.at(-1)}, one winner per price, no gaps, no duplicates.`
)
console.log(
  "\n\x1b[1;32m✓ The database held the rules under contention.\x1b[0m"
)
