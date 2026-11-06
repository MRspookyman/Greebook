-- Greenbook en pareja: presencia, club de dos, más reacciones, recomendaciones, toques y reto del mes.
-- Ejecutar completo en el SQL editor, después de 0004 (reutiliza su función notify_partner_webhook).

begin;

-- ───────────── Presencia y «visto» en Nosotros ─────────────
alter table profiles
  add column reading_now_id uuid references readings(id) on delete set null,
  add column reading_now_since timestamptz,
  add column last_seen_us_at timestamptz,
  add column last_live_notified_on date;

-- ───────────── Club de dos: mensajes y respuestas ─────────────
alter table notes drop constraint notes_kind_check;
alter table notes add constraint notes_kind_check check (kind in ('note', 'quote', 'message'));
alter table notes add column reply_to uuid references notes(id) on delete set null;
create index notes_reply_to on notes (reply_to);

-- ───────────── Reacciones: más emojis y también sobre notas ─────────────
alter table reactions drop constraint reactions_emoji_check;
alter table reactions add constraint reactions_emoji_check check (emoji in ('❤️', '🔥', '📚', '😂', '😮', '👏'));
alter table reactions drop constraint reactions_target_type_check;
alter table reactions add constraint reactions_target_type_check check (target_type in ('session', 'reading', 'note'));

drop policy reactions_insert on reactions;
create policy reactions_insert on reactions for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      (target_type = 'session' and exists (select 1 from sessions s where s.id = target_id and s.user_id = my_partner()))
      or (target_type = 'reading' and exists (select 1 from readings r where r.id = target_id and r.user_id = my_partner()))
      or (target_type = 'note' and exists (select 1 from notes n where n.id = target_id and n.user_id = my_partner() and n.shared))
    )
  );

-- ───────────── Recomendaciones ─────────────
create table recommendations (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books(id) on delete cascade,
  from_user uuid not null references profiles(id) default auth.uid(),
  to_user uuid not null references profiles(id),
  message text check (length(message) <= 500),
  together boolean not null default false,
  start_on date,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'dismissed')),
  created_at timestamptz not null default now()
);
create index recommendations_to on recommendations (to_user, status);
alter table recommendations enable row level security;
create policy recommendations_select on recommendations for select to authenticated
  using (auth.uid() in (from_user, to_user));
create policy recommendations_insert on recommendations for insert to authenticated
  with check (from_user = auth.uid() and to_user = my_partner());
create policy recommendations_update on recommendations for update to authenticated
  using (to_user = auth.uid()) with check (to_user = auth.uid());
create policy recommendations_delete on recommendations for delete to authenticated
  using (from_user = auth.uid());

-- ───────────── Toques (uno al día) ─────────────
create table nudges (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references profiles(id) default auth.uid(),
  to_user uuid not null references profiles(id),
  message text not null check (length(message) between 1 and 200),
  sent_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (from_user, sent_on)
);
alter table nudges enable row level security;
create policy nudges_select on nudges for select to authenticated
  using (auth.uid() in (from_user, to_user));
create policy nudges_insert on nudges for insert to authenticated
  with check (from_user = auth.uid() and to_user = my_partner());

-- ───────────── Reto del mes (uno por pareja y mes) ─────────────
create table challenges (
  user_a uuid not null references profiles(id),
  user_b uuid not null references profiles(id),
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  pages_goal int not null check (pages_goal between 1 and 100000),
  created_by uuid not null references profiles(id) default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key (user_a, user_b, month),
  check (user_a < user_b)
);
alter table challenges enable row level security;
create policy challenges_select on challenges for select to authenticated
  using (auth.uid() in (user_a, user_b));
create policy challenges_insert on challenges for insert to authenticated
  with check (auth.uid() in (user_a, user_b) and my_partner() in (user_a, user_b) and created_by = auth.uid());
create policy challenges_update on challenges for update to authenticated
  using (auth.uid() in (user_a, user_b))
  with check (auth.uid() in (user_a, user_b) and my_partner() in (user_a, user_b));

-- ───────────── Avisos a la pareja (función de 0004) ─────────────
create trigger nudges_notify_partner
  after insert on nudges
  for each row execute function public.notify_partner_webhook();

create trigger recommendations_notify_partner
  after insert on recommendations
  for each row execute function public.notify_partner_webhook();

create trigger notes_notify_partner
  after insert on notes
  for each row when (new.shared and (new.kind = 'message' or new.reply_to is not null))
  execute function public.notify_partner_webhook();

create trigger profiles_reading_now_notify_partner
  after update of reading_now_since on profiles
  for each row when (old.reading_now_since is null and new.reading_now_since is not null)
  execute function public.notify_partner_webhook();

create trigger readings_progress_notify_partner
  after update of current_position on readings
  -- Si en la misma actualización cambia el estado, ya avisa el trigger de 0004 (sin duplicar).
  for each row when (new.current_position > old.current_position and new.unit = 'pages' and new.status = old.status)
  execute function public.notify_partner_webhook();

-- ───────────── Realtime ─────────────
alter publication supabase_realtime add table notes, recommendations, nudges, challenges, profiles;

commit;
