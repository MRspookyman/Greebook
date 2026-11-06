-- Greenbook: esquema, RLS y realtime.
-- Ejecutar completo en el SQL editor del proyecto (dev y prod).

-- ───────────────────────── Tablas ─────────────────────────

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  accent text not null check (accent in ('blue','green')),
  partner_id uuid references profiles(id),
  is_gift_recipient boolean not null default false,
  yearly_goal int not null default 12 check (yearly_goal between 1 and 365),
  timezone text not null default 'Europe/Madrid',
  reminder_time time not null default '21:30',
  notify_reminder boolean not null default true,
  notify_partner boolean not null default true,
  last_reminded_on date,
  theme text not null default 'system' check (theme in ('system','light','dark')),
  onboarded_at timestamptz
);

create table books (
  id uuid primary key default gen_random_uuid(),
  google_id text unique,
  isbn13 text unique,
  openlibrary_key text unique,
  title text not null,
  authors text[] not null default '{}',
  cover_url text,
  page_count int,
  published_year int,
  description text,
  created_by uuid not null references profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) default auth.uid(),
  book_id uuid not null references books(id),
  format text not null check (format in ('paper','ebook','audio')),
  unit text not null check (unit in ('pages','percent','minutes')),
  total_units int not null check (total_units > 0),
  current_position int not null default 0,
  status text not null check (status in ('want','reading','finished','abandoned')),
  started_on date,
  finished_on date,
  rating numeric(2,1) check (rating between 0.5 and 5 and rating * 2 = floor(rating * 2)),
  moods text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table sessions (
  id uuid primary key,               -- generado en cliente (crypto.randomUUID) → upsert idempotente offline
  reading_id uuid not null references readings(id) on delete cascade,
  user_id uuid not null references profiles(id) default auth.uid(),
  read_on date not null,             -- fecha local del usuario
  start_pos int not null,
  end_pos int not null check (end_pos > start_pos),
  minutes int check (minutes > 0),
  created_at timestamptz not null default now()
);

create table notes (
  id uuid primary key default gen_random_uuid(),
  reading_id uuid not null references readings(id) on delete cascade,
  user_id uuid not null references profiles(id) default auth.uid(),
  kind text not null check (kind in ('note','quote')),
  body text not null check (length(body) between 1 and 5000),
  page int,
  shared boolean not null default false,
  created_at timestamptz not null default now()
);

create table reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) default auth.uid(),
  target_type text not null check (target_type in ('session','reading')),
  target_id uuid not null,
  emoji text not null check (emoji in ('❤️','🔥','📚')),
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id, emoji)
);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) default auth.uid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table surprises_seen (
  user_id uuid not null references profiles(id) default auth.uid(),
  surprise_key text not null,
  seen_at timestamptz not null default now(),
  primary key (user_id, surprise_key)
);

-- ───────────────────────── Índices ─────────────────────────

create index sessions_user_read_on on sessions (user_id, read_on);
create index readings_user_status on readings (user_id, status);
create index readings_book on readings (book_id);
create index notes_reading on notes (reading_id);
create index reactions_target on reactions (target_id);

-- ───────────────────────── Triggers ─────────────────────────

create function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger readings_set_updated_at
  before update on readings
  for each row execute function set_updated_at();

-- Los usuarios (rol authenticated/anon) no pueden cambiar el emparejamiento ni el
-- destinatario del regalo; el SQL editor (postgres) y service_role sí.
create function prevent_profile_privileged_update() returns trigger
language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') and (
    new.id is distinct from old.id
    or new.partner_id is distinct from old.partner_id
    or new.is_gift_recipient is distinct from old.is_gift_recipient
  ) then
    raise exception 'No se puede cambiar el emparejamiento' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger profiles_prevent_privileged_update
  before update on profiles
  for each row execute function prevent_profile_privileged_update();

-- ───────────────────────── Helpers ─────────────────────────

create function public.my_partner() returns uuid
language sql stable security definer set search_path = public as $$
  select partner_id from profiles where id = auth.uid()
$$;

revoke all on function public.my_partner() from public;
grant execute on function public.my_partner() to authenticated;

-- ───────────────────────── RLS ─────────────────────────

alter table profiles enable row level security;
alter table books enable row level security;
alter table readings enable row level security;
alter table sessions enable row level security;
alter table notes enable row level security;
alter table reactions enable row level security;
alter table push_subscriptions enable row level security;
alter table surprises_seen enable row level security;

-- profiles: ver el propio y el de la pareja; editar solo el propio. Sin insert/delete.
create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or id = my_partner());
create policy profiles_update on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- books: catálogo compartido.
create policy books_select on books for select to authenticated using (true);
create policy books_insert on books for insert to authenticated
  with check (created_by = auth.uid());
create policy books_update on books for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());

-- readings
create policy readings_select on readings for select to authenticated
  using (user_id in (auth.uid(), my_partner()));
create policy readings_insert on readings for insert to authenticated
  with check (user_id = auth.uid());
create policy readings_update on readings for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy readings_delete on readings for delete to authenticated
  using (user_id = auth.uid());

-- sessions: solo sobre lecturas propias.
create policy sessions_select on sessions for select to authenticated
  using (user_id in (auth.uid(), my_partner()));
create policy sessions_insert on sessions for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from readings r where r.id = reading_id and r.user_id = auth.uid())
  );
create policy sessions_update on sessions for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from readings r where r.id = reading_id and r.user_id = auth.uid())
  );
create policy sessions_delete on sessions for delete to authenticated
  using (user_id = auth.uid());

-- notes: privadas salvo `shared`.
create policy notes_select on notes for select to authenticated
  using (user_id = auth.uid() or (shared and user_id = my_partner()));
create policy notes_insert on notes for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from readings r where r.id = reading_id and r.user_id = auth.uid())
  );
create policy notes_update on notes for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from readings r where r.id = reading_id and r.user_id = auth.uid())
  );
create policy notes_delete on notes for delete to authenticated
  using (user_id = auth.uid());

-- reactions: solo a cosas de la pareja.
create policy reactions_select on reactions for select to authenticated
  using (user_id in (auth.uid(), my_partner()));
create policy reactions_insert on reactions for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      (target_type = 'session' and exists (select 1 from sessions s where s.id = target_id and s.user_id = my_partner()))
      or (target_type = 'reading' and exists (select 1 from readings r where r.id = target_id and r.user_id = my_partner()))
    )
  );
create policy reactions_delete on reactions for delete to authenticated
  using (user_id = auth.uid());

-- push_subscriptions / surprises_seen: todo solo propio.
create policy push_subscriptions_own on push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy surprises_seen_own on surprises_seen for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ───────────────────────── Realtime ─────────────────────────

alter publication supabase_realtime add table sessions, readings, reactions;
