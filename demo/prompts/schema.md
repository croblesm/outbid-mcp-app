# Outbid: the database

Create the database for a live charity auction. My frontend already uses this data.

A lot:

```json
{ "id": 1, "title": "A rubber duck that has seen production", "description": "On call since 2020.", "starting_price": 20, "increment": 5 }
```

A bid:

```json
{ "id": 1, "lot_id": 1, "amount": 25, "bidder": "ada", "user_id": "the signed-in user", "created_at": "2026-10-23T18:00:00Z" }
```

Make a lots table and a bids table with these fields. Keep the prices whole dollars.

## Rules

- Anyone can see the lots and the bids, signed in or not.
- Nobody writes to bids directly. A function, `place_bid(lot_id, amount)`, is the only way in, and only signed-in users can call it.
- Bids must be fair when two people bid at the same moment. A bid must be at least the top bid plus the lot's increment, or the starting price if it's the first bid. Otherwise fail with `Bid at least $N`.
- The bidder is the user's display name (`display_name` in their user metadata), or the part of their email before the @ if they haven't set one.
- New bids go out over Realtime.
- Lot photos live in a Storage bucket called `lots`: anyone can see them, and nobody uploads from the app. The seed adds them.

## How

Run it against my local Supabase database with one `execute_sql` call on the supabase MCP server. Don't write a migration file: I'll extract it with `supabase db diff`.
