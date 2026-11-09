-- Greenbook · Avisos ligados a la cuenta y privacidad de Leer juntos.
-- Ejecutar completo en el SQL editor DESPUÉS de 0010_historico_ebook.sql.
-- Volver a desplegar la función: npx supabase functions deploy notify-partner --no-verify-jwt
-- (con el proyecto enlazado; conservar WEBHOOK_SECRET y los secretos VAPID existentes).

begin;

-- Un endpoint del navegador pertenece únicamente a la última cuenta que lo reclama.
create or replace function public.claim_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void language plpgsql security definer set search_path = public as $$
declare
  owner_id uuid := auth.uid();
begin
  if owner_id is null then raise exception 'Debes iniciar sesión' using errcode = '42501'; end if;
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id <> owner_id;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (owner_id, p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth;
end $$;
revoke all on function public.claim_push_subscription(text, text, text) from public, anon;
grant execute on function public.claim_push_subscription(text, text, text) to authenticated;

-- La tabla quotes solo permite SELECT propio: esta comprobación necesita derechos del propietario.
-- El autor siempre puede leer las respuestas; la pareja solo si la cita está compartida y abierta.
create or replace function public.quote_replies_visible(quote_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.quotes q where q.id = quote_id
      and (q.user_id = auth.uid() or (q.shared and q.user_id = public.my_partner()))
      and not public.quote_locked(q)
  )
$$;
revoke all on function public.quote_replies_visible(uuid) from public, anon;
grant execute on function public.quote_replies_visible(uuid) to authenticated;
drop policy if exists quote_replies_select on public.quote_replies;
create policy quote_replies_select on public.quote_replies for select to authenticated
  using (public.quote_replies_visible(quote_id));

-- La propuesta no puede llevar ya la respuesta del otro.
drop policy if exists together_insert on public.together_items;
create policy together_insert on public.together_items for insert to authenticated
  with check (added_by = auth.uid() and partner_id = public.my_partner()
    and added_by <> partner_id and partner_answer is null);

create or replace function public.protect_together_item() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.added_by is distinct from old.added_by
    or new.partner_id is distinct from old.partner_id
    or new.book_id is distinct from old.book_id then
    raise exception 'Los participantes y el libro no se pueden cambiar' using errcode = '42501';
  end if;
  if new.partner_answer is distinct from old.partner_answer
    and auth.uid() is distinct from old.partner_id then
    raise exception 'Solo la pareja puede responder a la propuesta' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists together_items_protect on public.together_items;
create trigger together_items_protect before update on public.together_items
  for each row execute function public.protect_together_item();

-- La RPC escribe lecturas de los dos con derechos del propietario: comprobar la pareja actual completa.
create or replace function public.start_together(item_id uuid, start_date date, today date) returns void
language plpgsql security definer set search_path = public as $$
declare
  item together_items;
  b books;
  person uuid;
  existing readings;
begin
  select * into item from together_items where id = item_id
    and auth.uid() in (added_by, partner_id)
    and added_by in (auth.uid(), public.my_partner())
    and partner_id in (auth.uid(), public.my_partner())
    and partner_id <> added_by;
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

create or replace function public.protect_read_together() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.user_a is distinct from old.user_a or new.user_b is distinct from old.user_b then
    raise exception 'Los participantes no se pueden cambiar' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists read_together_protect on public.read_together;
create trigger read_together_protect before update on public.read_together
  for each row execute function public.protect_read_together();

-- La app responde cambiando status/responded_at; el cron solo fija start_notified_at.
create or replace function public.protect_invite() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.from_user is distinct from old.from_user or new.to_user is distinct from old.to_user
    or new.starts_at is distinct from old.starts_at then
    raise exception 'Los participantes y la hora de la invitación no se pueden cambiar' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists invites_protect on public.invites;
create trigger invites_protect before update on public.invites
  for each row execute function public.protect_invite();

-- No se puede aceptar la propia propuesta, tampoco haciéndola pasar por propuesta del otro.
drop policy if exists couple_goals_insert on public.couple_goals;
create policy couple_goals_insert on public.couple_goals for insert to authenticated
  with check (proposed_by = auth.uid() and auth.uid() in (user_a, user_b)
    and public.my_partner() in (user_a, user_b) and accepted_at is null);
create or replace function public.protect_couple_goal() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.user_a is distinct from old.user_a or new.user_b is distinct from old.user_b
    or new.proposed_by is distinct from old.proposed_by then
    raise exception 'Los participantes y quien propone el reto no se pueden cambiar' using errcode = '42501';
  end if;
  if new.accepted_at is distinct from old.accepted_at
    and (auth.uid() is null or auth.uid() = old.proposed_by
      or auth.uid() not in (old.user_a, old.user_b)) then
    raise exception 'Solo la pareja que recibe el reto puede aceptarlo' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists couple_goals_protect on public.couple_goals;
create trigger couple_goals_protect before update on public.couple_goals
  for each row execute function public.protect_couple_goal();

-- Broadcast privado: leer y enviar únicamente en la lectura a la vez de la que formas parte.
-- Comparar como texto evita convertir a uuid temas arbitrarios enviados por un cliente.
drop policy if exists juntos_broadcast_select on realtime.messages;
create policy juntos_broadcast_select on realtime.messages for select to authenticated
  using (extension = 'broadcast' and exists (
    select 1 from public.read_together t
    where (select realtime.topic()) = 'juntos:' || t.id::text
      and auth.uid() in (t.user_a, t.user_b)
  ));
drop policy if exists juntos_broadcast_insert on realtime.messages;
create policy juntos_broadcast_insert on realtime.messages for insert to authenticated
  with check (extension = 'broadcast' and exists (
    select 1 from public.read_together t
    where (select realtime.topic()) = 'juntos:' || t.id::text
      and auth.uid() in (t.user_a, t.user_b)
  ));

commit;
