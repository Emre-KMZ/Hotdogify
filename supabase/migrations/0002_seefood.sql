-- HotdogOrNotHotdog as a Service — schema
-- Apply: Supabase Dashboard SQL editor, or `supabase db push`.

-- API keys belong to an authed user. We store only the SHA-256 hash of the
-- secret; the plaintext key is shown to the user exactly once at creation.
create table if not exists api_keys (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null default 'default',
  prefix       text not null,            -- e.g. "sk_live_a1b2" for display
  key_hash     text not null unique,     -- sha256 hex of the full secret
  revoked      boolean not null default false,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);

create table if not exists classifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  api_key_id   uuid references api_keys (id) on delete set null,
  verdict      text not null,            -- 'hotdog' | 'not_hotdog'
  confidence   numeric not null,         -- 0..1
  label        text,                     -- model's guess at what it actually is
  latency_ms   integer,
  source       text not null default 'api', -- 'api' | 'playground'
  created_at   timestamptz not null default now()
);

create index if not exists classifications_user_created_idx
  on classifications (user_id, created_at desc);
create index if not exists classifications_key_created_idx
  on classifications (api_key_id, created_at desc);

-- RLS: dashboard access is scoped to the logged-in user.
alter table api_keys enable row level security;
alter table classifications enable row level security;

create policy "own api_keys" on api_keys
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own classifications" on classifications
  for select using (auth.uid() = user_id);

-- The dashboard playground runs under the user's session (not an API key), so
-- it inserts results directly. The public API path uses api_log() instead.
create policy "insert own classifications" on classifications
  for insert with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Public API path. Requests authenticate with a bearer API key, not a user
-- session, so there is no auth.uid(). These SECURITY DEFINER functions run as
-- the table owner (bypassing RLS) and are the only anon-callable surface that
-- can touch keys/usage. No service-role key needed in the app.
-- ---------------------------------------------------------------------------

-- Verify a key by hash, bump last_used_at, and report today's usage so the
-- caller can enforce a daily quota. Returns no rows for invalid/revoked keys.
create or replace function public.api_authorize(p_key_hash text)
returns table (api_key_id uuid, user_id uuid, used_today bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id   uuid;
  v_user uuid;
begin
  select id, api_keys.user_id into v_id, v_user
  from api_keys
  where key_hash = p_key_hash and revoked = false;

  if v_id is null then
    return;
  end if;

  update api_keys set last_used_at = now() where id = v_id;

  return query
  select v_id,
         v_user,
         (select count(*) from classifications c
          where c.api_key_id = v_id
            and c.created_at >= date_trunc('day', now()));
end;
$$;

-- Record a classification result for usage/logging.
create or replace function public.api_log(
  p_api_key_id uuid,
  p_user_id    uuid,
  p_verdict    text,
  p_confidence numeric,
  p_label      text,
  p_latency_ms integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into classifications
    (user_id, api_key_id, verdict, confidence, label, latency_ms, source)
  values
    (p_user_id, p_api_key_id, p_verdict, p_confidence, p_label, p_latency_ms, 'api');
end;
$$;

revoke all on function public.api_authorize(text) from public;
revoke all on function public.api_log(uuid, uuid, text, numeric, text, integer) from public;
grant execute on function public.api_authorize(text) to anon, authenticated;
grant execute on function public.api_log(uuid, uuid, text, numeric, text, integer) to anon, authenticated;
