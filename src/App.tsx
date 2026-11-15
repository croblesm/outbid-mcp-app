import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"
import { BidFeed } from "@/components/BidFeed"
import { LotCard } from "@/components/LotCard"
import { LotDetails } from "@/components/LotDetails"
import { SignIn } from "@/components/SignIn"
import { Watching } from "@/components/Watching"
import { auction } from "@/lib/auction"
import { safeNextPath } from "@/lib/safe-next-path"
import type { Catalog, Lot } from "@/lib/types"

// Set by the OAuth consent page when it needs a signed-in bidder first.
const next = new URLSearchParams(location.search).get("next")

export function App() {
  const [catalog, setCatalog] = useState<Catalog>({ lots: [], feed: [] })
  const [loadError, setLoadError] = useState<string | null>(null)
  const [bidder, setBidder] = useState<string | null>(null)
  const [watching, setWatching] = useState(1)
  const [detailsId, setDetailsId] = useState<number | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setCatalog(await auction.load())
      setLoadError(null)
    } catch (e) {
      setLoadError((e as Error).message)
      toast.error((e as Error).message)
    }
  }, [])

  useEffect(() => {
    // onBidder fires once with the current session, which triggers the first load.
    const stop = [
      auction.onBid(refresh),
      auction.onBidder((e) => {
        if (e && next) return location.replace(safeNextPath(next))
        setBidder(e)
        refresh()
      }),
      auction.onWatching(setWatching),
    ]
    return () => stop.forEach((fn) => fn())
  }, [refresh])

  // Own actions refresh directly; realtime only carries other people's bids, and it may still be waking up.
  const run = async (action: Promise<void>, done?: string) => {
    try {
      await action
      if (done) toast.success(done)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const bid = (lot: Lot) =>
    run(auction.bid(lot.id, lot.minimum).then(refresh), `You bid $${lot.minimum}`)
  const { lots, feed } = catalog

  return (
    <main className="mx-auto max-w-7xl px-4 pt-8 pb-20 sm:px-8">
      <header>
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5">
          <img
            src="/jsnation-logo.svg"
            alt="JSNation"
            className="h-10 w-auto sm:h-12"
          />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Watching count={watching} />
            <SignIn
              name={bidder}
              onSignIn={(address) =>
                run(auction.signIn(address), `Magic link sent to ${address}`)
              }
              onRename={(name) => run(auction.rename(name), `You bid as ${name.trim()}`)}
              onSignOut={() => run(auction.signOut())}
            />
          </div>
        </div>
        <h1 className="mt-10 display text-6xl sm:text-7xl">Closing party auction</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          Six lots, one night, JSNation US 2026. Prices change live as the room
          bids.
        </p>
      </header>

      <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_20rem]">
        <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {lots.map((lot) => (
            <LotCard
              key={lot.id}
              lot={lot}
              signedIn={bidder !== null}
              onBid={bid}
              onOpen={(id) => {
                setDetailsId(id)
                setDetailsOpen(true)
              }}
            />
          ))}
        </ul>
        <aside className="lg:sticky lg:top-8">
          <BidFeed feed={feed} />
        </aside>
      </div>

      <LotDetails
        lot={lots.find((l) => l.id === detailsId)}
        open={detailsOpen}
        signedIn={bidder !== null}
        onOpenChange={setDetailsOpen}
        onBid={bid}
      />
      {lots.length === 0 && (
        <p className="py-16 text-center text-lg text-muted-foreground">
          {loadError
            ? `Couldn't load the auction: ${loadError}. Is the local stack running?`
            : "Loading the auction…"}
        </p>
      )}
      <Toaster position="bottom-center" />
    </main>
  )
}

export default App
