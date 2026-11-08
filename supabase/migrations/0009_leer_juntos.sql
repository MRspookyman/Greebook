-- Greenbook · Leer juntos en directo (rediseño, fase 3).
-- Cuando uno está leyendo, el otro puede unirse: los dos cronómetros quedan enlazados en una «lectura a la vez»
-- que se cierra sola cuando los dos guardan su parte. Además, avisa cuando el otro se pone a leer (uno por noche).
-- Ejecutar completo en el SQL editor, después de 0008 (reutiliza notify_partner_webhook()).

begin;

create table read_together (
  id uuid primary key default gen_random_uuid(),
  -- user_a ya estaba leyendo; user_b se unió
  user_a uuid not null references profiles(id),
  user_b uuid not null references profiles(id),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  note text check (length(note) <= 200),
  check (user_a <> user_b)
);
create index read_together_users on read_together (user_a, user_b, started_at desc);

alter table read_together enable row level security;
create policy read_together_select on read_together for select to authenticated
  using (auth.uid() in (user_a, user_b));
-- Solo la nota y el cierre se tocan desde la app; se crea con join_reading().
create policy read_together_update on read_together for update to authenticated
  using (auth.uid() in (user_a, user_b)) with check (auth.uid() in (user_a, user_b));

alter table sessions add column together_id uuid references read_together(id) on delete set null;
create index sessions_together on sessions (together_id) where together_id is not null;

-- Una sesión solo puede enlazarse a una lectura a la vez de su propia pareja.
create function public.check_session_together() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.together_id is not null and not exists (
    select 1 from read_together t where t.id = new.together_id and new.user_id in (t.user_a, t.user_b)
  ) then
    new.together_id := null;
  end if;
  return new;
end $$;
create trigger sessions_check_together before insert or update of together_id on sessions
  for each row execute function public.check_session_together();

-- La lectura a la vez abierta de la pareja (de las últimas 4 horas), si la hay.
create function public.open_together() returns read_together
language sql stable security definer set search_path = public as $$
  select * from read_together
  where ended_at is null
    and started_at > now() - interval '4 hours'
    and auth.uid() in (user_a, user_b)
    and my_partner() in (user_a, user_b)
  order by started_at desc
  limit 1
$$;

-- Unirse a la lectura de tu pareja: reutiliza la abierta o crea una nueva.
create function public.join_reading() returns read_together
language plpgsql security definer set search_path = public as $$
declare
  partner uuid := my_partner();
  found_row read_together;
begin
  if partner is null then raise exception 'Aún no tienes pareja vinculada' using errcode = '42501'; end if;
  select * into found_row from public.open_together();
  if found_row.id is not null then return found_row; end if;
  insert into read_together (user_a, user_b) values (partner, auth.uid()) returning * into found_row;
  return found_row;
end $$;

revoke all on function public.open_together() from public, anon;
revoke all on function public.join_reading() from public, anon;
grant execute on function public.open_together() to authenticated;
grant execute on function public.join_reading() to authenticated;

-- Cuando los dos han guardado su parte, la lectura a la vez queda cerrada.
create function public.close_together() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.together_id is not null then
    update read_together t set ended_at = now()
    where t.id = new.together_id
      and t.ended_at is null
      and exists (select 1 from sessions s where s.together_id = t.id and s.user_id = t.user_a)
      and exists (select 1 from sessions s where s.together_id = t.id and s.user_id = t.user_b);
  end if;
  return new;
end $$;
revoke all on function public.close_together() from public, anon, authenticated;
create trigger sessions_close_together after insert or update of together_id on sessions
  for each row execute function public.close_together();

-- ───────────── Avisos ─────────────
-- «Laura se ha puesto a leer»: como mucho uno por noche (la función guarda el día en live_notified_on).
alter table profiles add column live_notified_on date;
create trigger profiles_reading_now_notify_partner
  after update of reading_now_since on profiles
  for each row when (old.reading_now_since is null and new.reading_now_since is not null)
  execute function public.notify_partner_webhook();
-- «Javier se ha unido a tu lectura».
create trigger read_together_notify_partner after insert on read_together
  for each row execute function public.notify_partner_webhook();

alter publication supabase_realtime add table read_together;

commit;
