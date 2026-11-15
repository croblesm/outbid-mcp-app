import type { Bid } from "@/lib/types"

const time = new Intl.DateTimeFormat(undefined, { timeStyle: "medium" })

export function BidFeed({ feed }: { feed: Bid[] }) {
  return (
    <section aria-labelledby="feed-title" className="border bg-popover p-5">
      <h2 id="feed-title" className="font-heading text-xl font-semibold">
        Live bids
      </h2>
      {feed.length === 0 ? (
        <p className="mt-4 text-base text-muted-foreground">
          Bids show up here the moment anyone places one.
        </p>
      ) : (
        <ol className="mt-4 divide-y" aria-live="polite">
          {feed.map((bid, i) => (
            <li
              key={bid.id}
              className={
                i === 0
                  ? "py-3 motion-safe:animate-[price-flash_1.2s_ease-out]"
                  : "py-3"
              }
            >
              <p className="flex items-baseline justify-between gap-3">
                <span className="truncate text-base font-semibold">
                  {bid.bidder}
                </span>
                <span className="numeral text-2xl">${bid.amount}</span>
              </p>
              <p className="mt-1 flex justify-between gap-3 text-sm text-muted-foreground">
                <span className="truncate">{bid.lotTitle}</span>
                <time dateTime={bid.at} className="shrink-0">
                  {time.format(new Date(bid.at))}
                </time>
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
