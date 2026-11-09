-- Greenbook · Citas compartidas (rediseño «Leer juntos», fase 2).
-- Una sola idea sustituye a notas privadas, huellas y mensajes de sala: algo que guardas en una página.
-- Se comparte por defecto; si la pareja va por detrás en ese libro, le llega cerrado hasta su página.
-- Ejecutar completo en el SQL editor, después de 0007 (reutiliza notify_partner_webhook() y message_pings).
-- No borra notes ni messages: copia su contenido y deja de usarlos.

begin;

-- ───────────── Citas y notas ─────────────
create table quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) default auth.uid(),
  book_id uuid not null references books(id) on delete cascade,
  page int check (page >= 0),
  -- cita = frase del libro · nota = algo escrito por ti
  kind text not null default 'cita' check (kind in ('cita', 'nota')),
  body text not null check (length(body) between 1 and 2000),
  comment text check (length(comment) <= 500),
  shared boolean not null default true,
  -- marcada «sin spoilers»: se ve aunque la pareja no haya llegado
  safe boolean not null default false,
  opened_early boolean not null default false,
  seen_at timestamptz,
  unlock_notified_at timestamptz,
  created_at timestamptz not null default now()
);
create index quotes_user on quotes (user_id, created_at desc);
create index quotes_book on quotes (book_id);

create table quote_replies (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  user_id uuid not null references profiles(id) default auth.uid(),
  body text not null check (length(body) between 1 and 1000),
  seen_at timestamptz,
  created_at timestamptz not null default now()
);
create index quote_replies_quote on quote_replies (quote_id);

alter table quotes enable row level security;
alter table quote_replies enable row level security;

-- Las citas de la pareja se leen por quotes_visible (oculta el texto si sería spoiler); las propias, directamente.
create policy quotes_select_own on quotes for select to authenticated using (user_id = auth.uid());
create policy quotes_insert on quotes for insert to authenticated with check (user_id = auth.uid());
create policy quotes_update on quotes for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy quotes_delete on quotes for delete to authenticated using (user_id = auth.uid());

-- ¿Puedo ver esta cita? La mía, o una compartida de mi pareja.
create function public.quote_visible(quote_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from quotes q
    where q.id = quote_id and (q.user_id = auth.uid() or (q.shared and q.user_id = my_partner()))
  )
$$;
revoke all on function public.quote_visible(uuid) from public, anon;
grant execute on function public.quote_visible(uuid) to authenticated;

create policy quote_replies_select on quote_replies for select to authenticated using (public.quote_visible(quote_id));
create policy quote_replies_insert on quote_replies for insert to authenticated
  with check (user_id = auth.uid() and public.quote_visible(quote_id));
create policy quote_replies_delete on quote_replies for delete to authenticated using (user_id = auth.uid());

-- Cerrada para quien la mira: es de la pareja, no está marcada sin spoilers ni abierta antes, y quien mira tiene
-- ese libro pendiente o en curso sin haber llegado a esa página (misma regla que message_locked).
create function public.quote_locked(q quotes) returns boolean
language sql stable security definer set search_path = public as $$
  select q.user_id <> auth.uid()
    and not q.safe
    and not q.opened_early
    and q.page is not null
    and exists (
      select 1
      from readings r join books b on b.id = r.book_id
      where r.user_id = auth.uid()
        and r.book_id = q.book_id
        and r.status in ('want', 'reading')
        and case
          when r.unit = 'pages' then r.current_position < q.page
          when coalesce(b.page_count, 0) > 0 then r.current_position::numeric / r.total_units < q.page::numeric / b.page_count
          else true
        end
    )
$$;

create view public.quotes_visible as
select
  q.id, q.user_id, q.book_id, q.page, q.kind, q.shared, q.safe, q.opened_early, q.seen_at, q.created_at,
  l.locked,
  case when l.locked then null else q.body end as body,
  case when l.locked then null else q.comment end as comment
from quotes q
cross join lateral (select public.quote_locked(q) as locked) l
where q.user_id = auth.uid() or (q.shared and q.user_id = my_partner());

revoke all on public.quotes_visible from anon;
grant select on public.quotes_visible to authenticated;

-- Quien recibe marca como vistas las de su pareja (solo las que ya puede leer) y puede abrir una antes de tiempo.
create function public.mark_quotes_seen(ids uuid[]) returns void
language sql security definer set search_path = public as $$
  update quotes set seen_at = now()
  where id = any(ids) and user_id = my_partner() and shared and seen_at is null and not public.quote_locked(quotes);
  update quote_replies set seen_at = now()
  where quote_id = any(ids) and user_id = my_partner() and seen_at is null;
$$;
create function public.open_quote_early(quote_id uuid) returns void
language sql security definer set search_path = public as $$
  update quotes set opened_early = true where id = quote_id and user_id = my_partner() and shared
$$;
revoke all on function public.mark_quotes_seen(uuid[]) from public, anon;
revoke all on function public.open_quote_early(uuid) from public, anon;
grant execute on function public.mark_quotes_seen(uuid[]) to authenticated;
grant execute on function public.open_quote_early(uuid) to authenticated;

-- ───────────── Corazones sobre citas ─────────────
alter table reactions drop constraint reactions_target_type_check;
alter table reactions add constraint reactions_target_type_check check (target_type in ('message', 'quote'));
create function public.is_quote_from_partner(quote_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from quotes q where q.id = quote_id and q.user_id = my_partner() and q.shared)
$$;
revoke all on function public.is_quote_from_partner(uuid) from public, anon;
grant execute on function public.is_quote_from_partner(uuid) to authenticated;
drop policy reactions_insert on reactions;
create policy reactions_insert on reactions for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      (target_type = 'message' and public.is_message_from_partner(target_id))
      or (target_type = 'quote' and public.is_quote_from_partner(target_id))
    )
  );

-- ───────────── Lo que ya había ─────────────
-- Notas y citas del diario: siguen siendo privadas.
insert into quotes (user_id, book_id, page, kind, body, shared, created_at)
select n.user_id, r.book_id, n.page, case when n.kind = 'quote' then 'cita' else 'nota' end, n.body, false, n.created_at
from notes n join readings r on r.id = n.reading_id;

-- Huellas y mensajes de sala: notas compartidas en su página (mismo id para conservar respuestas y corazones).
insert into quotes (id, user_id, book_id, page, kind, body, shared, opened_early, seen_at, unlock_notified_at, created_at)
select m.id, m.from_user, m.book_id, m.page, 'nota',
  coalesce(m.body, case m.emotion
    when 'love' then '😍 Me encanta' when 'twist' then '😮 Menudo giro' when 'laugh' then '😂 Me he reído'
    when 'moved' then '😢 Me ha tocado' else '🤔 Pienso en ti' end),
  true, m.opened_early, m.read_at, m.unlock_notified_at, m.created_at
from messages m
where m.kind in ('trace', 'room') and m.book_id is not null;

-- Respuestas: cuelgan de la huella original (subiendo por la cadena si responden a otra respuesta).
insert into quote_replies (quote_id, user_id, body, seen_at, created_at)
select root.id, m.from_user, coalesce(m.body, '❤️'), m.read_at, m.created_at
from messages m
cross join lateral (
  with recursive up as (
    select p.id, p.kind, p.reply_to from messages p where p.id = m.reply_to
    union all
    select p.id, p.kind, p.reply_to from messages p join up on p.id = up.reply_to where up.kind = 'reply'
  )
  select up.id from up where up.kind <> 'reply' limit 1
) root
where m.kind = 'reply' and exists (select 1 from quotes q where q.id = root.id);

update reactions set target_type = 'quote'
where target_type = 'message' and exists (select 1 from quotes q where q.id = reactions.target_id);

-- ───────────── Avisos y tiempo real ─────────────
drop trigger if exists messages_notify_partner on messages;
create trigger quotes_notify_partner after insert on quotes
  for each row when (new.shared) execute function public.notify_partner_webhook();
create trigger quote_replies_notify_partner after insert on quote_replies
  for each row execute function public.notify_partner_webhook();

-- quotes no es legible para la pareja: se avisa con el mismo «ping» sin contenido que los mensajes.
create function public.quote_ping() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  author uuid := coalesce(new.user_id, old.user_id);
  partner uuid;
begin
  select partner_id into partner from profiles where id = author;
  if partner is not null then
    insert into message_pings (from_user, to_user) values (author, partner);
  end if;
  return coalesce(new, old);
end $$;
revoke all on function public.quote_ping() from public, anon, authenticated;
create trigger quotes_ping after insert or update or delete on quotes
  for each row execute function public.quote_ping();
create trigger quote_replies_ping after insert or update or delete on quote_replies
  for each row execute function public.quote_ping();

alter publication supabase_realtime add table quote_replies;

commit;
