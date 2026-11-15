import { lotRows } from "@/mock"
import { bidderName, latest, minimumBid, summarize, type BidRow } from "./lots"
import type { Auction } from "./types"

// In-memory stand-in for the Supabase adapter in ./auction.ts. Same interface, no network.
let bids: BidRow[] = []
let email: string | null = null
let displayName: string | null = null
const changed = new Set<() => void>()
const bidder = new Set<(name: string | null) => void>()
const name = () => (email ? bidderName(email, displayName) : null)
const notify = () => changed.forEach((cb) => cb())

export const auction: Auction = {
  async load() {
    return {
      lots: summarize(lotRows, bids, email, () => null),
      feed: latest(bids, lotRows),
    }
  },
  async signIn(address) {
    email = address
    displayName = null
    bidder.forEach((cb) => cb(name()))
  },
  async signOut() {
    email = null
    bidder.forEach((cb) => cb(name()))
  },
  async rename(next) {
    displayName = next
    bidder.forEach((cb) => cb(name()))
  },
  onBidder(cb) {
    bidder.add(cb)
    cb(name())
    return () => bidder.delete(cb)
  },
  async bid(lotId, amount) {
    if (!email) throw new Error("Sign in to bid")
    const lot = lotRows.find((l) => l.id === lotId)
    if (!lot) throw new Error(`There is no lot ${lotId}`)
    const top = Math.max(...bids.filter((b) => b.lot_id === lotId).map((b) => b.amount))
    const minimum = minimumBid(lot, Number.isFinite(top) ? top : null)
    if (amount < minimum) throw new Error(`Bid at least $${minimum}`)
    bids = [
      ...bids,
      {
        id: bids.length + 1,
        lot_id: lotId,
        amount,
        bidder: bidderName(email, displayName),
        user_id: email,
        created_at: new Date().toISOString(),
      },
    ]
    notify()
  },
  onBid(cb) {
    changed.add(cb)
    return () => changed.delete(cb)
  },
  onWatching(cb) {
    cb(1)
    return () => {}
  },
}
