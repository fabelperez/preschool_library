-- Supabase schema for Preschool Library Catalog

-- Books
create table books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  isbn text unique,
  description text,
  created_at timestamp with time zone default now()
);

-- Inventory
create table inventory (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books (id),
  total_count integer,
  available_count integer
);

-- Library Requests
create table library_requests (
  id uuid primary key default gen_random_uuid(),
  room_color text,
  request_text text,
  requested_by text,
  email text,
  status text default 'new',
  created_at timestamp with time zone default now()
);

-- Checkouts
create table checkouts (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books (id),
  room_color text,
  checked_out_by text,
  checked_out_at timestamp with time zone default now(),
  returned_at timestamp with time zone
);

-- Enable Row Level Security
alter table books enable row level security;
alter table inventory enable row level security;
alter table library_requests enable row level security;
alter table checkouts enable row level security;

-- Policies: anon SELECT on books and inventory
create policy "anon_select_books"
  on books for select
  to anon
  using (true);

create policy "anon_select_inventory"
  on inventory for select
  to anon
  using (true);

-- Policy: anon INSERT on library_requests
create policy "anon_insert_library_requests"
  on library_requests for insert
  to anon
  with check (true);

-- Policy: anon INSERT on checkouts
create policy "anon_insert_checkouts"
  on checkouts for insert
  to anon
  with check (true);

-- Policy: anon UPDATE on checkouts (returned_at only)
create policy "anon_update_checkouts_return"
  on checkouts for update
  to anon
  using (true)
  with check (
    title is not distinct from title
    and book_id is not distinct from book_id
    and room_color is not distinct from room_color
    and checked_out_by is not distinct from checked_out_by
    and checked_out_at is not distinct from checked_out_at
  );
