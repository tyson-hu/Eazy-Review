-- Task 21: human-curated product collections for Feed (and later reuse).
-- Code still owns auto sections. These tables store only editorial membership
-- and presentation; the client resolves product cards from the published
-- catalog. RLS is enabled at create (deny-by-default). Clients receive SELECT
-- on published rows only. No client writes, no RPC, no rule engine.

create table public.product_collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null
    check (char_length(trim(title)) > 0),
  caption text not null
    check (char_length(trim(caption)) > 0),
  lead_label text not null
    check (char_length(trim(lead_label)) > 0),
  signal text not null default 'eazy'
    check (signal in ('eazy', 'community')),
  is_ranked boolean not null default false,
  feed_position integer,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index product_collections_one_published_feed_position
  on public.product_collections (feed_position)
  where is_published and feed_position is not null;

create trigger product_collections_set_updated_at
  before update on public.product_collections
  for each row
  execute function public.set_updated_at();

create table public.product_collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null
    references public.product_collections(id) on delete cascade,
  product_id uuid not null
    references public.products(id) on delete cascade,
  position integer not null
    check (position >= 1),
  unique (collection_id, product_id),
  unique (collection_id, position)
);

create index product_collection_items_product_id_idx
  on public.product_collection_items (product_id);

alter table public.product_collections enable row level security;
revoke all privileges on table public.product_collections from public;
revoke all privileges on table public.product_collections
  from anon, authenticated, service_role;

alter table public.product_collection_items enable row level security;
revoke all privileges on table public.product_collection_items from public;
revoke all privileges on table public.product_collection_items
  from anon, authenticated, service_role;

create policy "anon_select_published_product_collections"
on public.product_collections
for select
to anon
using (is_published = true);

create policy "authenticated_select_published_product_collections"
on public.product_collections
for select
to authenticated
using (is_published = true);

create policy "anon_select_published_product_collection_items"
on public.product_collection_items
for select
to anon
using (
  exists (
    select 1
    from public.product_collections as c
    where c.id = product_collection_items.collection_id
      and c.is_published = true
  )
);

create policy "authenticated_select_published_product_collection_items"
on public.product_collection_items
for select
to authenticated
using (
  exists (
    select 1
    from public.product_collections as c
    where c.id = product_collection_items.collection_id
      and c.is_published = true
  )
);

grant select on table
  public.product_collections,
  public.product_collection_items
to anon, authenticated;

grant select, insert, update, delete on table
  public.product_collections,
  public.product_collection_items
to service_role;
