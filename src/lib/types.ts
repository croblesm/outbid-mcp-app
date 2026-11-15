export type Lot = {
  id: number
  title: string
  description: string | null
  startingPrice: number
  increment: number
  /** Highest bid so far, null before the first bid. */
  current: number | null
  /** The smallest bid the database will accept next. */
  minimum: number
  bids: number
  leader: string | null
  /** The signed-in bidder holds the highest bid. */
  mine: boolean
  photoUrl: string | null
}

export type Bid = {
  id: number
  lotId: number
  lotTitle: string
  amount: number
  bidder: string
  at: string
}

export type Catalog = { lots: Lot[]; feed: Bid[] }

/** The seam between the UI and wherever the data lives. Two adapters: mock-auction (demo start) and auction (Supabase). */
export type Auction = {
  load(): Promise<Catalog>
  signIn(email: string): Promise<void>
  signOut(): Promise<void>
  /** The signed-in bidder's display name (never the full email), null when signed out. */
  onBidder(cb: (name: string | null) => void): () => void
  rename(name: string): Promise<void>
  bid(lotId: number, amount: number): Promise<void>
  onBid(cb: () => void): () => void
  onWatching(cb: (count: number) => void): () => void
}
