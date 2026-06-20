-- Seed ~14 days of classification activity so the admin dashboard has data to
-- draw. Loaded automatically on `supabase db reset`, or paste into the SQL
-- editor. All rows are attributed to the first existing auth user, so sign in
-- once first (auth.users must have at least one row).

with u as (
  select id from auth.users order by created_at limit 1
),
-- One random row-count per day (10..50). This must be computed here, one row
-- per day, so random() runs per day. Putting random() directly in the lateral
-- bound below lets Postgres evaluate it once for the whole query, which gives
-- every day an identical count.
days as (
  select g.days_ago, (10 + random() * 40)::int as n_rows
  from generate_series(0, 13) as g(days_ago)
),
seed as (
  select
    d.days_ago,
    random() as r_verdict,
    random() as r_conf,
    random() as r_label,
    random() as r_lat,
    random() as r_source,
    random() as r_report,
    random() as r_hour
  from days d
  cross join lateral generate_series(1, d.n_rows) as n(i)
)
insert into classifications
  (user_id, verdict, confidence, label, latency_ms, source, created_at, reported, reported_at)
select
  u.id,
  case when s.r_verdict < 0.5 then 'hotdog' else 'not_hotdog' end,
  round((0.94 + s.r_conf * 0.06)::numeric, 4),
  (array['hot dog','frankfurter','pizza','cat','sandwich','taco','burrito'])[1 + (s.r_label * 6)::int],
  150 + (s.r_lat * 900)::int,
  case when s.r_source < 0.7 then 'api' else 'playground' end,
  date_trunc('day', now()) - (s.days_ago || ' days')::interval + (s.r_hour * interval '23 hours'),
  s.r_report < 0.08,
  case when s.r_report < 0.08
       then date_trunc('day', now()) - (s.days_ago || ' days')::interval + (s.r_hour * interval '23 hours')
       else null end
from seed s cross join u;
