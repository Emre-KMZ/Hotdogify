-- Example migration template. Rename/replace during the task.
-- Apply options:
--   A) Dashboard SQL editor (fastest, no setup)
--   B) supabase login && supabase link --project-ref kxplwxelmmmnqdpymknn && supabase db push
--   C) supabase db push --db-url "<pooler connection string from dashboard>"

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz not null default now()
);

alter table items enable row level security;

-- Open policy for the take-home (no auth). Tighten if auth is added.
create policy "items public access" on items
  for all using (true) with check (true);
