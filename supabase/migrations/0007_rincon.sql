-- Greenbook · Rincón de los dos.
-- Sustituye toques, recomendaciones, reto de páginas, club por notas compartidas, reacciones múltiples y
-- presencia con aviso por: huellas/mensajes con bloqueo real de spoilers, invitaciones a un ratito,
-- lista «Queremos leer juntos» y un reto cooperativo del mes.
-- Ejecutar completo en el SQL editor, después de 0006 (reutiliza notify_partner_webhook()).

begin;

-- ───────────── Limpieza de lo sustituido ─────────────
drop table if exists nudges cascade;
drop table if exists recommendations cascade;
drop table if exists challenges cascade;
drop trigger if exists profiles_reading_now_notify_partner on profiles;
drop trigger if exists readings_progress_notify_partner on readings;
drop trigger if exists notes_notify_partner on notes;

-- Las notas vuelven a ser el diario privado de cada uno (compartir = dejar una huella).
delete from reactions where target_type <> 'message';
-- (La política de reacciones de 0005 depende de notes.shared: se recrea más abajo.)
drop policy reactions_insert on reactions;
delete from notes where kind = 'message';
drop policy notes_select on notes;
create policy notes_select on notes for select to authenticated using (user_id = auth.uid());
alter table notes drop column reply_to;
alter table notes drop column shared;
alter table notes drop constraint notes_kind_check;
alter table notes add constraint notes_kind_check check (kind in ('note', 'quote'));

alter table profiles drop column last_seen_us_at, drop column last_live_notified_on;
-- reading_now_id / reading_now_since se mantienen: presencia suave en Hoy, sin aviso.

-- ───────────── Mensajes: huellas, sala y respuestas ─────────────
create table messages (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references profiles(id) default auth.uid(),
  to_user uuid not null references profiles(id),
  -- trace = huella («Dejarle algo»), room = mensaje en la sala de un libro, reply = respuesta a otro mensaje
  kind text not null check (kind in ('trace', 'room', 'reply')),
  book_id uuid references books(id) on delete cascade,
  page int check (page >= 0),
  emotion text check (emotion in ('love', 'twist', 'laugh', 'moved', 'thinking')),
  body text check (length(body) between 1 and 1000),
  reply_to uuid references messages(id) on delete cascade,
  read_at timestamptz,
  opened_early boolean not null default false,
  unlock_notified_at timestamptz,
  created_at timestamptz not null default now(),
  check (kind <> 'reply' or reply_to is not null),
  check (kind = 'reply' or book_id is not null),
  check (body is not null or emotion is not null)
);
create index messages_to_user on messages (to_user, created_at desc);
create index messages_book on messages (book_id);
create index messages_reply_to on messages (reply_to);

alter table messages enable row level security;
-- Sin política de lectura: se lee a través de messages_visible, que oculta el contenido bloqueado.
create policy messages_insert on messages for insert to authenticated
  with check (from_user = auth.uid() and to_user = my_partner());
create policy messages_delete on messages for delete to authenticated
  using (from_user = auth.uid());

-- ¿Está bloqueado para quien lo recibe? Solo si tiene ese libro abierto y aún no ha llegado a esa página.
create function public.message_locked(m messages) returns boolean
language sql stable security definer set search_path = public as $$
  select m.to_user = auth.uid()
    and not m.opened_early
    and m.page is not null
    and m.book_id is not null
    and exists (
      select 1
      from readings r join books b on b.id = r.book_id
      where r.user_id = m.to_user
        and r.book_id = m.book_id
        and r.status in ('want', 'reading')
        and case
          when r.unit = 'pages' then r.current_position < m.page
          when coalesce(b.page_count, 0) > 0 then r.current_position::numeric / r.total_units < m.page::numeric / b.page_count
          else true
        end
    )
$$;

-- Vista con permisos del propietario: solo los mensajes de la pareja, con texto y emoción ocultos si están bloqueados.
create view public.messages_visible as
select
  m.id, m.from_user, m.to_user, m.kind, m.book_id, m.page, m.reply_to, m.read_at, m.opened_early, m.created_at,
  l.locked,
  case when l.locked then null else m.emotion end as emotion,
  case when l.locked then null else m.body end as body
from messages m
cross join lateral (select public.message_locked(m) as locked) l
where auth.uid() in (m.from_user, m.to_user);

revoke all on public.messages_visible from anon;
grant select on public.messages_visible to authenticated;

create function public.mark_messages_read(ids uuid[]) returns void
language sql security definer set search_path = public as $$
  update messages set read_at = now()
  where id = any(ids) and to_user = auth.uid() and read_at is null and not public.message_locked(messages)
$$;

create function public.open_message_early(message_id uuid) returns void
language sql security definer set search_path = public as $$
  update messages set opened_early = true where id = message_id and to_user = auth.uid()
$$;

revoke all on function public.mark_messages_read(uuid[]) from public, anon;
revoke all on function public.open_message_early(uuid) from public, anon;
grant execute on function public.mark_messages_read(uuid[]) to authenticated;
grant execute on function public.open_message_early(uuid) to authenticated;

-- Realtime: la tabla de mensajes no es legible directamente, así que se avisa con un «ping» sin contenido.
create table message_pings (
  id bigint generated always as identity primary key,
  from_user uuid not null references profiles(id),
  to_user uuid not null references profiles(id),
  created_at timestamptz not null default now()
);
alter table message_pings enable row level security;
create policy message_pings_select on message_pings for select to authenticated
  using (auth.uid() in (from_user, to_user));

create function public.message_ping() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into message_pings (from_user, to_user) values (new.from_user, new.to_user);
  return new;
end $$;
revoke all on function public.message_ping() from public, anon, authenticated;
create trigger messages_ping after insert or update on messages
  for each row execute function public.message_ping();

-- ❤️ solo sobre mensajes de la pareja.
alter table reactions drop constraint reactions_emoji_check;
alter table reactions add constraint reactions_emoji_check check (emoji = '❤️');
alter table reactions drop constraint reactions_target_type_check;
alter table reactions add constraint reactions_target_type_check check (target_type = 'message');
-- `messages` has no select policy, so the check runs with definer rights.
create function public.is_message_from_partner(message_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from messages m where m.id = message_id and m.from_user = my_partner() and m.to_user = auth.uid())
$$;
revoke all on function public.is_message_from_partner(uuid) from public, anon;
grant execute on function public.is_message_from_partner(uuid) to authenticated;
create policy reactions_insert on reactions for insert to authenticated
  with check (user_id = auth.uid() and target_type = 'message' and public.is_message_from_partner(target_id));

-- ───────────── Invitaciones a un ratito ─────────────
create table invites (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references profiles(id) default auth.uid(),
  to_user uuid not null references profiles(id),
  -- null = ahora
  starts_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  responded_at timestamptz,
  start_notified_at timestamptz,
  created_at timestamptz not null default now()
);
create index invites_users on invites (to_user, created_at desc);
alter table invites enable row level security;
create policy invites_select on invites for select to authenticated using (auth.uid() in (from_user, to_user));
create policy invites_insert on invites for insert to authenticated
  with check (from_user = auth.uid() and to_user = my_partner() and status = 'pending');
create policy invites_update on invites for update to authenticated
  using (to_user = auth.uid()) with check (to_user = auth.uid());
create policy invites_delete on invites for delete to authenticated using (from_user = auth.uid());

-- ───────────── «Queremos leer juntos» ─────────────
create table together_items (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books(id) on delete cascade,
  added_by uuid not null references profiles(id) default auth.uid(),
  partner_id uuid not null references profiles(id),
  reason text check (length(reason) <= 300),
  partner_answer text check (partner_answer in ('yes', 'later')),
  start_on date,
  -- who chose the start (so the notification goes to the other one)
  started_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (book_id, added_by)
);
alter table together_items enable row level security;
create policy together_select on together_items for select to authenticated
  using (auth.uid() in (added_by, partner_id));
create policy together_insert on together_items for insert to authenticated
  with check (added_by = auth.uid() and partner_id = my_partner());
create policy together_update on together_items for update to authenticated
  using (auth.uid() in (added_by, partner_id)) with check (auth.uid() in (added_by, partner_id));
create policy together_delete on together_items for delete to authenticated using (added_by = auth.uid());

-- Empezar un libro de la lista: crea (o reactiva) la lectura de los dos. `today` es la fecha local del cliente.
create function public.start_together(item_id uuid, start_date date, today date) returns void
language plpgsql security definer set search_path = public as $$
declare
  item together_items;
  b books;
  person uuid;
  existing readings;
begin
  select * into item from together_items where id = item_id and auth.uid() in (added_by, partner_id);
  if not found then raise exception 'No existe' using errcode = '42501'; end if;
  if item.partner_answer is distinct from 'yes' then raise exception 'Falta que los dos queráis leerlo'; end if;
  select * into b from books where id = item.book_id;
  foreach person in array array[item.added_by, item.partner_id] loop
    select * into existing from readings
      where user_id = person and book_id = item.book_id and status in ('want', 'reading')
      order by updated_at desc limit 1;
    if found then
      if start_date <= today and existing.status = 'want' then
        update readings set status = 'reading', started_on = start_date where id = existing.id;
      end if;
    else
      insert into readings (user_id, book_id, format, unit, total_units, status, started_on)
      values (person, item.book_id, 'paper', 'pages', coalesce(b.page_count, 300),
              case when start_date <= today then 'reading' else 'want' end,
              case when start_date <= today then start_date end);
    end if;
  end loop;
  update together_items set start_on = start_date, started_by = auth.uid() where id = item_id;
end $$;
revoke all on function public.start_together(uuid, date, date) from public, anon;
grant execute on function public.start_together(uuid, date, date) to authenticated;

-- ───────────── Reto cooperativo del mes ─────────────
create table couple_goals (
  user_a uuid not null references profiles(id),
  user_b uuid not null references profiles(id),
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  kind text not null check (kind in ('ratitos', 'days')),
  target int not null check (target between 1 and 31),
  proposed_by uuid not null references profiles(id) default auth.uid(),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b, month),
  check (user_a < user_b)
);
alter table couple_goals enable row level security;
create policy couple_goals_select on couple_goals for select to authenticated using (auth.uid() in (user_a, user_b));
create policy couple_goals_insert on couple_goals for insert to authenticated
  with check (proposed_by = auth.uid() and auth.uid() in (user_a, user_b) and my_partner() in (user_a, user_b));
create policy couple_goals_update on couple_goals for update to authenticated
  using (auth.uid() in (user_a, user_b)) with check (auth.uid() in (user_a, user_b) and my_partner() in (user_a, user_b));
create policy couple_goals_delete on couple_goals for delete to authenticated using (auth.uid() in (user_a, user_b));

-- ───────────── Avisos (función de 0004/0006) ─────────────
create trigger messages_notify_partner after insert on messages
  for each row execute function public.notify_partner_webhook();
create trigger invites_notify_partner after insert or update of status on invites
  for each row execute function public.notify_partner_webhook();
create trigger together_notify_partner after insert or update of partner_answer, start_on on together_items
  for each row execute function public.notify_partner_webhook();
create trigger couple_goals_notify_partner after insert on couple_goals
  for each row execute function public.notify_partner_webhook();
-- Al avanzar: la función comprueba si se desbloquea algo que te dejó tu pareja.
create trigger readings_unlock_notify_partner after update of current_position on readings
  for each row when (new.current_position > old.current_position and new.status = old.status)
  execute function public.notify_partner_webhook();

-- ───────────── Realtime ─────────────
alter publication supabase_realtime add table message_pings, invites, together_items, couple_goals;

commit;
