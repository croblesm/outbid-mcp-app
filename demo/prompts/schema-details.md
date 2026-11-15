# Outbid: match the frontend exactly

The frontend and its tests already use these exact names and rules. A schema that's close isn't enough: a renamed parameter or a missing rule breaks the app. Check the database against this list.

- **Columns:** `lots(id, title, description, starting_price, increment, created_at)` and `bids(id, lot_id, amount, bidder, user_id, created_at)`. Every column is required (not null) except `lots.description`. `bids.user_id` defaults to `auth.uid()` and references `auth.users`. `bids.amount` is between 1 and 100000 and `bids.bidder` is at most 40 characters (check constraints), so one huge bid or a giant name can't break a lot.
- **The function:** `public.place_bid(lot_id bigint, amount integer) returns public.bids`, with exactly those parameter names. It runs with its owner's rights (security definer) and an empty search_path, locks the lot row with `select ... for update`, raises `no_data_found` when the lot doesn't exist and `insufficient_privilege` when nobody is signed in, and rejects a low bid with `Bid at least $N` and errcode `22023`. Revoke execute from `public` and `anon`, and grant it to `authenticated`.
- **The bidder:** `place_bid` reads it from `auth.users` for `auth.uid()` at the moment of the bid, not from the token, so a name changed a minute ago counts: `raw_user_meta_data ->> 'display_name'` when it isn't blank, otherwise the part of `email` before the @, cut to 40 characters.
- **Storage:** anyone can read and list objects in the `lots` bucket. No insert, update or delete policy for clients: the seed adds the photos.

Fix anything that doesn't match. Then show me the tables, the policies and the function signature, so I can see it matches.
