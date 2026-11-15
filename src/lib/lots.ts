import type { Bid, Lot } from "./types"

export type LotRow = {
  id: number
  title: string
  description: string | null
  starting_price: number
  increment: number
}

export type BidRow = {
  id: number
  lot_id: number
  amount: number
  bidder: string
  user_id: string
  created_at: string
}

/** Same rule as public.place_bid: the name the bidder chose, or the part of their email before the @. */
export function bidderName(email: string, displayName?: unknown) {
  return (typeof displayName === "string" && displayName.trim()) || email.split("@")[0]
}

/** Same rule as public.place_bid: the first bid is the starting price, then the top bid plus the increment. */
export function minimumBid(lot: Pick<LotRow, "starting_price" | "increment">, current: number | null) {
  return current === null ? lot.starting_price : current + lot.increment
}

export function summarize(
  lots: LotRow[],
  bids: BidRow[],
  me: string | null,
  photoUrl: (lotId: number) => string | null
): Lot[] {
  const top = new Map<number, BidRow>()
  const count = new Map<number, number>()
  for (const b of bids) {
    count.set(b.lot_id, (count.get(b.lot_id) ?? 0) + 1)
    const best = top.get(b.lot_id)
    if (!best || b.amount > best.amount) top.set(b.lot_id, b)
  }
  return [...lots]
    .sort((a, b) => a.id - b.id)
    .map((l) => {
      const best = top.get(l.id) ?? null
      const current = best?.amount ?? null
      return {
        id: l.id,
        title: l.title,
        description: l.description,
        startingPrice: l.starting_price,
        increment: l.increment,
        current,
        minimum: minimumBid(l, current),
        bids: count.get(l.id) ?? 0,
        leader: best?.bidder ?? null,
        mine: best !== null && best.user_id === me,
        photoUrl: photoUrl(l.id),
      }
    })
}

/** Newest bids first, for the live feed. */
export function latest(bids: BidRow[], lots: LotRow[], n = 8): Bid[] {
  const titles = new Map(lots.map((l) => [l.id, l.title]))
  return [...bids]
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
    .slice(0, n)
    .map((b) => ({
      id: b.id,
      lotId: b.lot_id,
      lotTitle: titles.get(b.lot_id) ?? `Lot ${b.lot_id}`,
      amount: b.amount,
      bidder: b.bidder,
      at: b.created_at,
    }))
}
