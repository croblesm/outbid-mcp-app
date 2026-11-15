# Outbid

A live charity auction for a conference closing party. Bidders sign in, bid on lots, and watch prices change live, from the web app or from Claude.

## Language

**Lot**: one thing up for auction, with a title, a description, a starting price and an increment. _Avoid_: item, product, listing.

**Bid**: one bidder's offer on one lot. Placed only through `place_bid`; never changed or deleted. _Avoid_: offer, order.

**Bidder**: a signed-in person, shown by their display name or the part of their email before the @. _Avoid_: user (in UI copy), account, member.

**Display name**: the name a bidder chooses in the header, stored as `display_name` in their user metadata. _Avoid_: username, nickname, handle.

**Minimum**: the smallest bid the database accepts next: the starting price, then the top bid plus the increment. _Avoid_: reserve, floor.

**Live bids**: the feed of the newest bids across all lots. _Avoid_: activity, history, log.

**Lot photo**: the image stored at `lots/<lot id>.jpg`. _Avoid_: thumbnail, avatar.

**Watching**: how many auction pages are open right now, from Realtime Presence. _Avoid_: online, viewers.
