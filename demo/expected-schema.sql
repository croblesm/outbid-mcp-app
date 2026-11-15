-- What the Studio AI prompt in Act 2 should produce. Fallback: paste this into the Studio SQL editor.

create table public.lots (
  id bigint generated always as identity primary key,
  title text not null,
  description text,
  starting_price integer not null check (starting_price > 0),
  increment integer not null default 5 check (increment > 0),
  created_at timestamptz not null default now()
);

create table public.bids (
  id bigint generated always as identity primary key,
  lot_id bigint not null references public.lots (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  bidder text not null check (char_length(bidder) <= 40),
  amount integer not null check (amount between 1 and 100000),
  created_at timestamptz not null default now()
);

create index bids_lot_id_amount_idx on public.bids (lot_id, amount desc);

alter table public.lots enable row level security;
alter table public.bids enable row level security;

create policy "Anyone can see the lots" on public.lots
  for select to anon, authenticated using (true);

create policy "Anyone can see the bids" on public.bids
  for select to anon, authenticated using (true);

-- No insert, update or delete policy on bids: the only way in is place_bid.

create function public.place_bid(lot_id bigint, amount integer)
returns public.bids
language plpgsql
security definer
set search_path = ''
as $$
declare
  lot public.lots;
  minimum integer;
  bid public.bids;
begin
  if auth.uid() is null then
    raise exception 'Sign in to bid' using errcode = '28000';
  end if;

  -- Lock the lot so two bids on it can't both pass the minimum check.
  select * into lot from public.lots l where l.id = place_bid.lot_id for update;
  if not found then
    raise exception 'There is no lot %', place_bid.lot_id using errcode = 'P0002';
  end if;

  select coalesce(max(b.amount) + lot.increment, lot.starting_price) into minimum
  from public.bids b where b.lot_id = place_bid.lot_id;

  if place_bid.amount < minimum then
    raise exception 'Bid at least $%', minimum using errcode = '22023';
  end if;

  insert into public.bids (lot_id, user_id, bidder, amount)
  values (
    place_bid.lot_id,
    auth.uid(),
    -- From auth.users, not the token: a name changed a minute ago counts on the next bid.
    (select left(coalesce(nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''), split_part(u.email, '@', 1)), 40)
     from auth.users u where u.id = auth.uid()),
    place_bid.amount
  )
  returning * into bid;

  return bid;
end;
$$;

revoke execute on function public.place_bid(bigint, integer) from public, anon;
grant execute on function public.place_bid(bigint, integer) to authenticated;

alter publication supabase_realtime add table public.bids;

-- Lot photos live in the public "lots" bucket as <lot id>.jpg (the bucket itself is created by seed.sql).
create policy "Anyone can see lot photos" on storage.objects
  for select to anon, authenticated using (bucket_id = 'lots');

-- No insert, update or delete policy on lot photos: the seed adds them, and nobody uploads from the app.
