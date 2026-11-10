-- Greenbook · el esquema entero, de una vez.
--
-- Ejecutar COMPLETO en Supabase → SQL Editor. Se puede volver a ejecutar sin miedo a romper nada,
-- pero OJO: BORRA TODOS LOS DATOS de Greenbook (libros, veladas, papeles). Conserva las cuentas, los
-- nombres, los colores y quién es pareja de quién.
--
-- Proyecto nuevo: después de este archivo, ejecuta supabase/seed.sql para emparejar las dos cuentas.

begin;

-- ───────────────────── 0. Lo que se conserva: quién sois ─────────────────────

create temp table _carry (id uuid, name text, color text, partner_id uuid, timezone text) on commit drop;

do $$
declare
  has_old boolean := exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'display_name');
  has_new boolean := exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'color');
begin
  if has_old then
    -- El Greenbook anterior: «accent» azul/verde pasa a ser un color de cera.
    execute $q$insert into _carry
      select id, display_name, case accent when 'blue' then 'cielo' else 'salvia' end, partner_id, timezone
      from public.profiles$q$;
  elsif has_new then
    execute 'insert into _carry select id, name, color, partner_id, timezone from public.profiles';
  end if;
end $$;

-- ───────────────────── 1. Fuera el mundo anterior ─────────────────────

drop view if exists public.quotes_visible, public.messages_visible cascade;

drop table if exists
  public.reactions, public.quote_replies, public.quotes, public.messages, public.message_pings,
  public.invites, public.together_items, public.couple_goals, public.notes, public.read_together,
  public.book_tags, public.recommendations, public.book_opinions, public.nudges, public.challenges,
  public.surprises_seen, public.push_subscriptions, public.slips, public.sessions, public.readings,
  public.books, public.profiles
  cascade;

-- Funciones propias de cualquier versión, tengan la firma que tengan.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as signature
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = any (array[
      'set_updated_at', 'prevent_profile_privileged_update', 'my_partner', 'notify_partner_webhook',
      'check_session_together', 'close_together', 'is_message_from_partner', 'is_quote_from_partner',
      'join_reading', 'mark_messages_read', 'mark_quotes_seen', 'message_locked', 'message_ping',
      'open_message_early', 'open_quote_early', 'open_together', 'quote_locked', 'quote_ping',
      'quote_visible', 'start_together', 'can_view_quote_photo', 'can_write_book_cover',
      'claim_push_subscription', 'cleanup_reading_reactions', 'cleanup_session_reactions',
      'edit_reading_units', 'guard_recommendation_update', 'is_session_from_partner',
      'partner_opinion_books', 'protect_couple_goal', 'protect_invite', 'protect_read_together',
      'protect_together_item', 'quote_replies_visible', 'touch_book_opinion', 'wrote_opinion',
      'touch', 'guard_profile', 'guard_slip', 'couple_topic', 'slip_locked', 'slip_locked_for',
      'slips_for_me', 'open_slip'])
  loop
    execute format('drop function if exists %s cascade', f.signature);
  end loop;
end $$;

-- Políticas que el Greenbook anterior dejó fuera de «public».
do $$
declare p text;
begin
  foreach p in array array['juntos_broadcast_select', 'juntos_broadcast_insert',
                           'pareja_broadcast_select', 'pareja_broadcast_insert'] loop
    execute format('drop policy if exists %I on realtime.messages', p);
  end loop;
  if to_regclass('storage.objects') is not null then
    foreach p in array array['book_covers_select', 'book_covers_insert', 'book_covers_update',
      'book_covers_delete', 'quote_photos_select', 'quote_photos_insert', 'quote_photos_update',
      'quote_photos_delete'] loop
      execute format('drop policy if exists %I on storage.objects', p);
    end loop;
  end if;
end $$;

-- El recordatorio diario ya no existe.
do $$ begin
  perform cron.unschedule('greenbook-send-reminders');
exception when others then null;
end $$;

-- ───────────────────── 2. Tablas ─────────────────────
-- Todos los id nacen en el móvil (upserts idempotentes sin conexión). `updated_at` lo pone siempre el
-- servidor: es el cursor de la sincronización. `deleted_at` es un borrado suave que también se sincroniza.

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null check (length(trim(name)) between 1 and 40),
  color text not null default 'salvia'
    check (color in ('salvia', 'miel', 'ciruela', 'cielo', 'coral', 'lavanda')),
  partner_id uuid references public.profiles (id),
  timezone text not null default 'Europe/Madrid',
  welcomed_at timestamptz,
  -- La vela: encendida desde cuándo y con qué lectura. Es la presencia.
  candle_lit_at timestamptz,
  candle_reading_id uuid,
  -- Último aviso «ha encendido su vela» (solo lo escribe la función de avisos).
  candle_told_at timestamptz,
  updated_at timestamptz not null default now(),
  check (partner_id is null or partner_id <> id)
);

create table public.books (
  id uuid primary key,
  title text not null check (length(trim(title)) between 1 and 300),
  author text not null default '' check (length(author) <= 300),
  cover_url text check (cover_url is null or cover_url ~ '^https://'),
  pages int check (pages between 1 and 20000),
  year int check (year between 1 and 9999),
  isbn text check (length(isbn) <= 20),
  added_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Tu marcapáginas en un libro. Que los dos tengáis uno del mismo libro es «leerlo juntos».
create table public.readings (
  id uuid primary key,
  user_id uuid not null default auth.uid() references public.profiles (id),
  book_id uuid not null references public.books (id),
  unit text not null default 'paginas' check (unit in ('paginas', 'porcentaje')),
  total int not null check (total between 1 and 20000),
  position int not null default 0 check (position >= 0),
  status text not null default 'pendiente'
    check (status in ('pendiente', 'leyendo', 'terminado', 'dejado')),
  started_on date,
  finished_on date,
  rating int check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (position <= total)
);

-- Una velada: de encender la vela a apagarla.
create table public.sessions (
  id uuid primary key,
  reading_id uuid not null references public.readings (id),
  user_id uuid not null default auth.uid() references public.profiles (id),
  -- La «noche» a la que pertenece (el día cambia a las 4 de la madrugada, lo calcula el móvil).
  day date not null,
  started_at timestamptz,
  minutes int check (minutes between 1 and 1440),
  from_pos int not null check (from_pos >= 0),
  to_pos int not null,
  place text check (length(place) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (to_pos >= from_pos)
);

-- Un papel entre páginas (cita, nota) o dentro del sobre (predicción, carta).
create table public.slips (
  id uuid primary key,
  user_id uuid not null default auth.uid() references public.profiles (id),
  book_id uuid not null references public.books (id),
  kind text not null check (kind in ('cita', 'nota', 'prediccion', 'carta')),
  page int check (page >= 0),
  -- Dónde está en el libro, de 0 a 1 (página / total de quien lo escribe). null = no destripa nada.
  at numeric(6, 5) check (at between 0 and 1),
  body text not null check (length(trim(body)) between 1 and 4000),
  -- Cuándo lo abrió el otro y si le llegó. Solo se tocan con open_slip().
  seen_at timestamptz,
  loved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index books_cursor on public.books (updated_at);
create index readings_cursor on public.readings (updated_at);
create index readings_user_book on public.readings (user_id, book_id);
create index sessions_cursor on public.sessions (updated_at);
create index slips_book on public.slips (book_id);

-- ───────────────────── 3. Triggers ─────────────────────

create function public.touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before insert or update on public.profiles
  for each row execute function public.touch();
create trigger books_touch before insert or update on public.books
  for each row execute function public.touch();
create trigger readings_touch before insert or update on public.readings
  for each row execute function public.touch();
create trigger sessions_touch before insert or update on public.sessions
  for each row execute function public.touch();
create trigger slips_touch before insert or update on public.slips
  for each row execute function public.touch();

-- Desde la app nadie cambia con quién está emparejado ni el registro de avisos.
-- El SQL Editor (postgres) y la función de avisos (service_role) sí.
create function public.guard_profile() returns trigger
language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') and (
    new.id is distinct from old.id
    or new.partner_id is distinct from old.partner_id
    or new.candle_told_at is distinct from old.candle_told_at
  ) then
    raise exception 'El emparejamiento no se cambia desde la app' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile();

-- Quien escribe un papel no puede marcarlo como abierto ni querido: eso es de quien lo recibe (open_slip).
create function public.guard_slip() returns trigger
language plpgsql as $$
begin
  if coalesce(current_setting('greenbook.opening', true), '') <> '1' then
    if tg_op = 'INSERT' then
      new.seen_at := null;
      new.loved := false;
    else
      new.seen_at := old.seen_at;
      new.loved := old.loved;
    end if;
  end if;
  return new;
end $$;
create trigger slips_guard before insert or update on public.slips
  for each row execute function public.guard_slip();

-- ───────────────────── 4. Quién es mi pareja ─────────────────────

-- Solo cuenta si es mutuo: A apunta a B y B apunta a A.
create function public.my_partner() returns uuid
language sql stable security definer set search_path = public as $$
  select me.partner_id
  from profiles me join profiles other on other.id = me.partner_id
  where me.id = auth.uid() and other.partner_id = me.id
$$;

-- El canal de tiempo real de los dos: «pareja:<uuid menor>:<uuid mayor>».
create function public.couple_topic() returns text
language sql stable security definer set search_path = public as $$
  select 'pareja:' || least(auth.uid(), my_partner())::text || ':' || greatest(auth.uid(), my_partner())::text
$$;

-- ───────────────────── 5. Papeles doblados ─────────────────────

-- ¿Está este papel doblado para quien mira? La misma regla vive en src/lib/lock.ts.
--   cita / nota:  mientras tenga el libro pendiente o abierto y no haya llegado a su punto.
--   carta:        mientras lo tenga pendiente o abierto, o lo haya terminado sin escribir aún la suya.
--   predicción:   hasta que los dos lo hayan cerrado (terminado o dejado).
create function public.slip_locked(s public.slips, viewer uuid) returns boolean
language sql stable security definer set search_path = public as $$
  with mine as (
    select r.status, r.position, r.total from readings r
    where r.user_id = viewer and r.book_id = s.book_id and r.deleted_at is null
    order by r.updated_at desc limit 1
  ), theirs as (
    select r.status from readings r
    where r.user_id = s.user_id and r.book_id = s.book_id and r.deleted_at is null
    order by r.updated_at desc limit 1
  )
  select case
    when s.user_id = viewer then false
    when s.kind = 'carta' then
      coalesce((select m.status in ('pendiente', 'leyendo')
        or (m.status = 'terminado' and not exists (
          select 1 from slips c
          where c.user_id = viewer and c.book_id = s.book_id and c.kind = 'carta' and c.deleted_at is null))
        from mine m), false)
    when s.kind = 'prediccion' then
      coalesce((select m.status in ('pendiente', 'leyendo') from mine m), false)
      or coalesce((select t.status in ('pendiente', 'leyendo') from theirs t), true)
    else
      s.at is not null
      and coalesce((select m.status in ('pendiente', 'leyendo')
        and round(m.position::numeric / m.total, 5) < s.at from mine m), false)
  end
$$;

-- Todos los papeles que puedo ver: los míos y los de mi pareja, estos sin texto mientras estén doblados.
create function public.slips_for_me() returns table (
  id uuid, user_id uuid, book_id uuid, kind text, page int, at numeric, body text,
  seen_at timestamptz, loved boolean, created_at timestamptz, updated_at timestamptz,
  deleted_at timestamptz, locked boolean
)
language sql stable security definer set search_path = public as $$
  select s.id, s.user_id, s.book_id, s.kind, s.page, s.at,
         case when l.locked then null else s.body end,
         s.seen_at, s.loved, s.created_at, s.updated_at, s.deleted_at, l.locked
  from slips s cross join lateral (select slip_locked(s, auth.uid()) as locked) l
  where s.deleted_at is null and s.user_id in (auth.uid(), my_partner())
$$;

-- Abrir un papel de mi pareja (y, si quiero, decirle que me ha llegado).
create function public.open_slip(p_id uuid, p_loved boolean default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  s slips;
begin
  select * into s from slips where id = p_id and user_id = my_partner() and deleted_at is null;
  if not found then raise exception 'Ese papel no existe' using errcode = '42501'; end if;
  if slip_locked(s, auth.uid()) then raise exception 'Todavía está doblado' using errcode = '42501'; end if;
  perform set_config('greenbook.opening', '1', true);
  update slips set seen_at = coalesce(seen_at, now()), loved = coalesce(p_loved, loved) where id = p_id;
  perform set_config('greenbook.opening', '', true);
end $$;

-- Para la función de avisos: ¿puede decirle ya a esta persona lo que pone el papel?
create function public.slip_locked_for(p_slip uuid, p_viewer uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select slip_locked(s, p_viewer) from slips s where s.id = p_slip
$$;

-- Un móvil pertenece a la última cuenta que activó en él los avisos.
create function public.claim_push_subscription(p_endpoint text, p_p256dh text, p_auth text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión' using errcode = '42501'; end if;
  delete from push_subscriptions where endpoint = p_endpoint and user_id <> auth.uid();
  insert into push_subscriptions (user_id, endpoint, p256dh, auth)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth;
end $$;

revoke all on function public.my_partner() from public, anon;
revoke all on function public.couple_topic() from public, anon;
revoke all on function public.slip_locked(public.slips, uuid) from public, anon, authenticated;
revoke all on function public.slip_locked_for(uuid, uuid) from public, anon, authenticated;
revoke all on function public.slips_for_me() from public, anon;
revoke all on function public.open_slip(uuid, boolean) from public, anon;
revoke all on function public.claim_push_subscription(text, text, text) from public, anon;
grant execute on function public.my_partner() to authenticated;
grant execute on function public.couple_topic() to authenticated;
grant execute on function public.slips_for_me() to authenticated;
grant execute on function public.open_slip(uuid, boolean) to authenticated;
grant execute on function public.claim_push_subscription(text, text, text) to authenticated;
grant execute on function public.slip_locked_for(uuid, uuid) to service_role;

-- ───────────────────── 6. RLS: solo vosotros dos ─────────────────────

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.readings enable row level security;
alter table public.sessions enable row level security;
alter table public.slips enable row level security;
alter table public.push_subscriptions enable row level security;

-- Perfiles: veo el mío y el de mi pareja; edito el mío. Se crean y se emparejan desde el SQL Editor.
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or id = public.my_partner());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Libros: la estantería es de los dos; cualquiera añade o corrige.
create policy books_select on public.books for select to authenticated
  using (added_by in (auth.uid(), public.my_partner()));
create policy books_insert on public.books for insert to authenticated
  with check (added_by in (auth.uid(), public.my_partner()));
create policy books_update on public.books for update to authenticated
  using (added_by in (auth.uid(), public.my_partner()))
  with check (added_by in (auth.uid(), public.my_partner()));

-- Marcapáginas y veladas: los ve la pareja, los escribe su dueño.
create policy readings_select on public.readings for select to authenticated
  using (user_id in (auth.uid(), public.my_partner()));
create policy readings_insert on public.readings for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.books b where b.id = book_id));
create policy readings_update on public.readings for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.books b where b.id = book_id));

create policy sessions_select on public.sessions for select to authenticated
  using (user_id in (auth.uid(), public.my_partner()));
create policy sessions_insert on public.sessions for insert to authenticated
  with check (user_id = auth.uid()
    and exists (select 1 from public.readings r where r.id = reading_id and r.user_id = auth.uid()));
create policy sessions_update on public.sessions for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid()
    and exists (select 1 from public.readings r where r.id = reading_id and r.user_id = auth.uid()));

-- Papeles: la tabla solo deja leer los propios. Los de la pareja llegan por slips_for_me(), que los dobla.
create policy slips_select on public.slips for select to authenticated
  using (user_id = auth.uid());
create policy slips_insert on public.slips for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.books b where b.id = book_id));
create policy slips_update on public.slips for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.books b where b.id = book_id));

create policy push_subscriptions_own on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- No hay políticas de DELETE: nada se borra de verdad desde la app (deleted_at).

-- Tiempo real: un único canal privado por pareja («cambio» y «guiño»). Nada se publica desde las tablas.
create policy pareja_broadcast_select on realtime.messages for select to authenticated
  using (extension = 'broadcast' and (select realtime.topic()) = public.couple_topic());
create policy pareja_broadcast_insert on realtime.messages for insert to authenticated
  with check (extension = 'broadcast' and (select realtime.topic()) = public.couple_topic());

-- ───────────────────── 7. Volvéis a ser vosotros ─────────────────────

insert into public.profiles (id, name, color, timezone)
select c.id, c.name, c.color, coalesce(c.timezone, 'Europe/Madrid')
from _carry c where exists (select 1 from auth.users u where u.id = c.id);

update public.profiles p set partner_id = c.partner_id
from _carry c
where c.id = p.id and exists (select 1 from public.profiles other where other.id = c.partner_id);

commit;
