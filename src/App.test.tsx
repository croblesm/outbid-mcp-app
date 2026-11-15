import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { Auction } from "@/lib/types"
import type { BidRow, LotRow } from "@/lib/lots"

// An auction whose realtime never delivers: the UI must not depend on change events for its own actions.
const fake = vi.hoisted(() => {
  const state = { lots: [] as LotRow[], bids: [] as BidRow[], failLoad: null as Error | null }
  const renames: string[] = []
  return { state, renames }
})
vi.mock("@/lib/mock-auction", async () => {
  const { summarize, latest } = await import("@/lib/lots")
  const auction: Auction = {
    load: async () => {
      if (fake.state.failLoad) throw fake.state.failLoad
      return {
        lots: summarize(fake.state.lots, fake.state.bids, "ada", () => null),
        feed: latest(fake.state.bids, fake.state.lots),
      }
    },
    signIn: async () => {},
    signOut: async () => {},
    onBidder: (cb) => (cb("ada"), () => {}),
    rename: async (name) => void fake.renames.push(name),
    bid: async (lotId, amount) => {
      fake.state.bids = [
        ...fake.state.bids,
        { id: fake.state.bids.length + 1, lot_id: lotId, amount, bidder: "ada", user_id: "ada", created_at: "2026-11-19T20:00:00Z" },
      ]
    },
    onBid: () => () => {},
    onWatching: (cb) => (cb(1), () => {}),
  }
  return { auction }
})
// main swaps the import to the Supabase adapter; point it at the same fake.
vi.mock("@/lib/auction", async () => ({ auction: (await import("@/lib/mock-auction")).auction }))

const { App } = await import("./App")

const lot = (id: number, title: string, starting_price = 20): LotRow => ({
  id,
  title,
  description: `About ${title}.`,
  starting_price,
  increment: 5,
})

afterEach(() => {
  cleanup()
  fake.state.failLoad = null
  fake.state.bids = []
  fake.renames.length = 0
})

describe("App", () => {
  it("shows the bidder's own bid without waiting for a realtime event", async () => {
    fake.state.lots = [lot(1, "Duck"), lot(2, "Keyboard")]
    render(<App />)
    const button = await screen.findByRole("button", { name: "Bid $20 on Duck" })
    await act(async () => fireEvent.click(button))
    expect(await screen.findByText("You're winning")).toBeTruthy()
    expect(screen.getByLabelText("Top bid $20")).toBeTruthy()
    expect(screen.getByRole("region", { name: "Live bids" }).textContent).toContain("Duck")
  })

  it("renames the bidder from the header on Enter, and drops a blank name", async () => {
    fake.state.lots = [lot(1, "Duck")]
    render(<App />)
    await act(async () => fireEvent.click(await screen.findByRole("button", { name: "ada" })))
    const input = screen.getByLabelText("Display name")
    fireEvent.change(input, { target: { value: "  " } })
    await act(async () => fireEvent.submit(input))
    fireEvent.click(await screen.findByRole("button", { name: "ada" }))
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: " Ada Lovelace " } })
    await act(async () => fireEvent.submit(screen.getByLabelText("Display name")))
    expect(fake.renames).toEqual(["Ada Lovelace"])
  })

  it("opens a lot's details from its title", async () => {
    fake.state.lots = [lot(1, "Duck")]
    render(<App />)
    const title = await screen.findByRole("button", { name: "Duck" })
    await act(async () => fireEvent.click(title))
    const dialog = await screen.findByRole("dialog")
    expect(dialog.textContent).toContain("About Duck.")
  })

  it("says why the auction is empty when it cannot load", async () => {
    fake.state.failLoad = new Error("Failed to fetch")
    render(<App />)
    expect(await screen.findByText(/couldn't load the auction/i)).toBeTruthy()
  })
})
