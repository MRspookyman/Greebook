-- Cada nota elige cómo se ve: a la vista de los dos desde el principio, u oculta para el otro hasta que
-- llegue a su página. Se puede ejecutar más de una vez.
begin;

do $$ begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'slips' and column_name = 'hidden') then
    alter table public.slips add column hidden boolean not null default false;
    -- Las notas con página que ya existían se escribieron para encontrarlas al llegar: siguen ocultas.
    update public.slips set hidden = true where at is not null and kind in ('cita', 'nota');
  end if;
end $$;

-- ¿Está esta nota oculta para quien mira? La misma regla vive en src/lib/lock.ts.
-- Solo si su autor la marcó como oculta, tiene página, y quien mira tiene el libro pendiente o abierto
-- y todavía no ha llegado a ese punto.
create or replace function public.slip_locked(s public.slips, viewer uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select s.user_id <> viewer and s.hidden and s.at is not null
    and coalesce((
      select r.status in ('pendiente', 'leyendo') and round(r.position::numeric / r.total, 5) < s.at
      from readings r
      where r.user_id = viewer and r.book_id = s.book_id and r.deleted_at is null
      order by r.updated_at desc limit 1), false)
$$;

-- Las notas que puedo ver: las mías y las de mi pareja, estas sin texto mientras estén ocultas.
drop function if exists public.slips_for_me();
create function public.slips_for_me() returns table (
  id uuid, user_id uuid, book_id uuid, kind text, page int, at numeric, body text,
  seen_at timestamptz, loved boolean, created_at timestamptz, updated_at timestamptz,
  deleted_at timestamptz, hidden boolean, locked boolean
)
language sql stable security definer set search_path = public as $$
  select s.id, s.user_id, s.book_id, s.kind, s.page, s.at,
         case when l.locked then null else s.body end,
         s.seen_at, s.loved, s.created_at, s.updated_at, s.deleted_at, s.hidden, l.locked
  from slips s cross join lateral (select slip_locked(s, auth.uid()) as locked) l
  where s.deleted_at is null and s.user_id in (auth.uid(), my_partner())
$$;
revoke all on function public.slips_for_me() from public, anon;
grant execute on function public.slips_for_me() to authenticated;

commit;
