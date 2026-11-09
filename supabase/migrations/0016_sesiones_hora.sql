begin;

-- Reading start instant for local-time habits. Existing sessions estimate it from logged duration,
-- only when that estimate falls on the session's own local day (late logs would land on the wrong day).
alter table public.sessions add column if not exists started_at timestamptz null;
update public.sessions s
set started_at = s.created_at - coalesce(s.minutes, 0) * interval '1 minute'
from public.profiles p
where s.started_at is null
  and p.id = s.user_id
  and p.timezone in (select name from pg_timezone_names)
  and ((s.created_at - coalesce(s.minutes, 0) * interval '1 minute') at time zone p.timezone)::date = s.read_on;
comment on column public.sessions.started_at is 'Reading start instant: timer start, or logging time minus recorded minutes. Display in the reader profile timezone.';

commit;
