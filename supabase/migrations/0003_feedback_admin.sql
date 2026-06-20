-- Feedback (report a wrong verdict) + admin metrics.
-- Apply: Supabase Dashboard SQL editor, or `supabase db push`.

-- Visitors can flag a classification whose verdict looks wrong.
alter table classifications add column if not exists reported boolean not null default false;
alter table classifications add column if not exists reported_at timestamptz;

create index if not exists classifications_reported_idx
  on classifications (reported_at desc) where reported;

-- Flip the reported flag on a single classification. SECURITY DEFINER so the
-- public demo (anon session) can report without granting a broad UPDATE policy.
create or replace function public.report_classification(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update classifications
  set reported = true, reported_at = now()
  where id = p_id;
end;
$$;

-- Aggregate, cross-user metrics for the admin dashboard. SECURITY DEFINER so it
-- reads across all users despite the per-user RLS on classifications.
create or replace function public.admin_metrics()
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'total',           (select count(*) from classifications),
    'today',           (select count(*) from classifications where created_at >= date_trunc('day', now())),
    'last7',           (select count(*) from classifications where created_at >= now() - interval '7 days'),
    'hotdog',          (select count(*) from classifications where verdict = 'hotdog'),
    'not_hotdog',      (select count(*) from classifications where verdict = 'not_hotdog'),
    'from_api',        (select count(*) from classifications where source = 'api'),
    'from_playground', (select count(*) from classifications where source = 'playground'),
    'reported',        (select count(*) from classifications where reported),
    'avg_confidence',  (select coalesce(avg(confidence), 0) from classifications),
    'avg_latency_ms',  (select coalesce(avg(latency_ms), 0) from classifications),
    'total_keys',      (select count(*) from api_keys),
    'active_keys',     (select count(*) from api_keys where not revoked),
    'visitors',        (select count(distinct user_id) from classifications),
    'daily', (
      select coalesce(json_agg(json_build_object('day', day, 'count', count) order by day), '[]'::json)
      from (
        select date_trunc('day', created_at)::date as day, count(*)::int as count
        from classifications
        where created_at >= date_trunc('day', now()) - interval '13 days'
        group by 1
      ) d
    ),
    'recent_reports', (
      select coalesce(json_agg(r order by r.reported_at desc nulls last), '[]'::json)
      from (
        select id, verdict, confidence, label, source, created_at, reported_at
        from classifications
        where reported
        order by reported_at desc nulls last
        limit 10
      ) r
    )
  );
$$;

revoke all on function public.report_classification(uuid) from public;
revoke all on function public.admin_metrics() from public;
grant execute on function public.report_classification(uuid) to anon, authenticated;
grant execute on function public.admin_metrics() to anon, authenticated;
