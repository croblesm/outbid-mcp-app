import { describe, expect, it } from "vitest"
import { bidderName, latest, minimumBid, summarize, type BidRow, type LotRow } from "./lots"

const lot = (id: number, starting_price = 20, increment = 5): LotRow => ({
  id,
  title: `Lot ${id}`,
  description: null,
  starting_price,
  increment,
})
const bid = (id: number, lot_id: number, amount: number, user_id = "u1"): BidRow => ({
  id,
  lot_id,
  amount,
  bidder: user_id,
  user_id,
  created_at: `2026-11-19T20:00:0${id}Z`,
})

describe("bidderName", () => {
  it("is the display name when one is set, trimmed", () => {
    expect(bidderName("contact@croblesm.com", "  Carlos Robles ")).toBe("Carlos Robles")
  })
  it("falls back to the part of the email before the @, never the whole email", () => {
    for (const blank of [undefined, null, "", "   ", 42]) expect(bidderName("contact@croblesm.com", blank)).toBe("contact")
  })
})

describe("minimumBid", () => {
  it("is the starting price before the first bid", () => {
    expect(minimumBid(lot(1, 20, 5), null)).toBe(20)
  })
  it("is the top bid plus the increment after that", () => {
    expect(minimumBid(lot(1, 20, 5), 35)).toBe(40)
  })
})

describe("summarize", () => {
  it("takes the highest bid, not the latest one, as the current price", () => {
    const [l] = summarize([lot(1)], [bid(1, 1, 30, "a"), bid(2, 1, 25, "b")], null, () => null)
    expect(l.current).toBe(30)
    expect(l.leader).toBe("a")
    expect(l.bids).toBe(2)
    expect(l.minimum).toBe(35)
  })
  it("marks the lot as mine only when I hold the top bid", () => {
    const lots = summarize([lot(1), lot(2)], [bid(1, 1, 20, "me"), bid(2, 2, 20, "me"), bid(3, 2, 25, "other")], "me", () => null)
    expect(lots.map((l) => l.mine)).toEqual([true, false])
  })
  it("keeps catalog order and shows unbid lots at their starting price", () => {
    const lots = summarize([lot(2, 50, 10), lot(1)], [], null, () => null)
    expect(lots.map((l) => [l.id, l.current, l.minimum, l.leader])).toEqual([
      [1, null, 20, null],
      [2, null, 50, null],
    ])
  })
})

describe("latest", () => {
  it("lists the newest bids first with their lot titles", () => {
    const feed = latest([bid(1, 1, 20), bid(2, 2, 30)], [lot(1), lot(2)], 1)
    expect(feed).toHaveLength(1)
    expect(feed[0]).toMatchObject({ id: 2, lotTitle: "Lot 2", amount: 30 })
  })
})
