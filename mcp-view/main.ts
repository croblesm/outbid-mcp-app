import { App } from "@modelcontextprotocol/ext-apps"

// The view Claude renders for list_lots and place_bid. Both tools return the same shape:
// { lots: ViewLot[], placed?: { lotId, amount } }, so one renderer covers both.
type ViewLot = {
  id: number
  title: string
  current: number | null
  minimum: number
  bids: number
  leader: string | null
  mine: boolean
  photoUrl: string | null
}
type Result = { lots: ViewLot[]; placed?: { lotId: number; amount: number } }

const grid = document.getElementById("lots")!
const note = document.getElementById("note")!
const app = new App({ name: "outbid-auction", version: "1.0.0" }, {})

function say(text: string, error = false) {
  note.textContent = text
  note.className = error ? "note error" : "note"
}

function card(lot: ViewLot, fresh: boolean) {
  const li = document.createElement("article")
  li.className = `lot${lot.mine ? " mine" : ""}${fresh ? " fresh" : ""}`
  const photo = document.createElement("div")
  photo.className = "photo"
  if (lot.photoUrl) {
    const img = document.createElement("img")
    img.src = lot.photoUrl
    img.alt = ""
    photo.append(img)
  } else {
    photo.textContent = String(lot.id).padStart(2, "0")
  }
  const body = document.createElement("div")
  body.className = "body"
  const title = document.createElement("div")
  title.className = "title"
  title.textContent = lot.title
  const row = document.createElement("div")
  row.className = "row"
  const left = document.createElement("div")
  const price = document.createElement("div")
  price.className = "price"
  price.textContent = `$${lot.current ?? lot.minimum}`
  const meta = document.createElement("div")
  meta.className = "meta"
  meta.textContent = lot.mine
    ? "You're winning"
    : lot.leader
      ? `${lot.bids} ${lot.bids === 1 ? "bid" : "bids"}, top: ${lot.leader}`
      : "No bids yet"
  meta.title = lot.leader ?? ""
  left.append(price, meta)
  const button = document.createElement("button")
  button.textContent = lot.mine ? "Winning" : `Bid $${lot.minimum}`
  button.disabled = lot.mine
  button.setAttribute("aria-label", `Bid $${lot.minimum} on ${lot.title}`)
  button.addEventListener("click", () => bid(lot, button))
  row.append(left, button)
  body.append(title, row)
  li.append(photo, body)
  return li
}

function render(result: Result) {
  grid.replaceChildren(...result.lots.map((l) => card(l, l.id === result.placed?.lotId)))
  if (result.placed) {
    const lot = result.lots.find((l) => l.id === result.placed!.lotId)
    say(`You bid $${result.placed.amount} on ${lot?.title ?? `lot ${result.placed.lotId}`}.`)
  }
}

async function bid(lot: ViewLot, button: HTMLButtonElement) {
  button.disabled = true
  button.textContent = "Bidding…"
  try {
    const res = await app.callServerTool({ name: "place_bid", arguments: { lot_id: lot.id, amount: lot.minimum } })
    if (res.isError) {
      const text = res.content?.find((c) => c.type === "text")
      say(text && "text" in text ? String(text.text) : "That bid didn't go through.", true)
      await refresh()
      return
    }
    render(res.structuredContent as Result)
  } catch (e) {
    say((e as Error).message, true)
    button.disabled = false
    button.textContent = `Bid $${lot.minimum}`
  }
}

async function refresh() {
  const res = await app.callServerTool({ name: "list_lots", arguments: {} })
  if (!res.isError) render(res.structuredContent as Result)
}

// Register before connecting so the first result isn't missed.
app.ontoolresult = ({ structuredContent, isError }) => {
  if (isError || !structuredContent) return
  render(structuredContent as Result)
}

await app.connect()
