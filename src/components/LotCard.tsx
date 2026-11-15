import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Lot } from "@/lib/types"

type Props = {
  lot: Lot
  signedIn: boolean
  onBid: (lot: Lot) => void
  onOpen: (id: number) => void
}

export function LotPhoto({ lot, className }: { lot: Lot; className?: string }) {
  return lot.photoUrl ? (
    <img
      src={lot.photoUrl}
      alt=""
      className={cn("size-full object-cover", className)}
    />
  ) : (
    <div
      className={cn(
        "grid size-full place-items-center bg-secondary display text-6xl text-quiet",
        className
      )}
      aria-hidden
    >
      {String(lot.id).padStart(2, "0")}
    </div>
  )
}

export function LotCard({ lot, signedIn, onBid, onOpen }: Props) {
  return (
    <li
      className={cn(
        "flex flex-col border bg-card",
        lot.mine && "border-primary"
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <LotPhoto lot={lot} />
        <span className="absolute right-3 bottom-3 bg-background/85 px-2 py-1 numeral text-sm text-muted-foreground">
          Lot {String(lot.id).padStart(2, "0")}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <h2 className="font-heading text-xl leading-snug font-semibold tracking-tight text-balance">
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => onOpen(lot.id)}
            className="cursor-pointer rounded-sm text-left decoration-primary decoration-2 underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
          >
            {lot.title}
          </button>
        </h2>

        <div className="mt-auto flex items-end justify-between gap-4">
          {/* min-w-0: a long bidder name truncates instead of pushing the Bid button out of the card. */}
          <div className="min-w-0">
            {/* key: a new top bid remounts the price, which replays the flash. */}
            <p
              key={lot.current ?? "start"}
              className="numeral text-5xl motion-safe:animate-[price-flash_1.2s_ease-out]"
              aria-label={
                lot.current === null
                  ? `Starts at $${lot.startingPrice}`
                  : `Top bid $${lot.current}`
              }
            >
              ${lot.current ?? lot.startingPrice}
            </p>
            <p
              className="mt-2 truncate text-base text-muted-foreground"
              title={lot.leader ?? undefined}
            >
              {lot.mine
                ? "You're winning"
                : lot.leader
                  ? `${lot.bids} ${lot.bids === 1 ? "bid" : "bids"}, top: ${lot.leader}`
                  : "No bids yet"}
            </p>
          </div>
          <Button
            className="h-11 shrink-0 rounded-full px-5 text-base font-semibold disabled:border-input disabled:bg-transparent disabled:text-muted-foreground disabled:opacity-100"
            disabled={!signedIn || lot.mine}
            title={
              signedIn
                ? lot.mine
                  ? "You're the top bidder"
                  : undefined
                : "Sign in to bid"
            }
            aria-label={`Bid $${lot.minimum} on ${lot.title}`}
            onClick={() => onBid(lot)}
          >
            Bid ${lot.minimum}
          </Button>
        </div>
      </div>
    </li>
  )
}
