-- Greenbook 0020: dónde se leyó cada sesión y corazones a las sesiones de la pareja.
-- Aplicar después de 0019 y antes de desplegar el cliente que las usa. Con el cliente anterior no cambia nada:
-- las sesiones sin lugar se guardan igual que antes.

begin;

-- Lugar opcional de una sesión («cama», «sofá», «tren»…), texto corto escrito o elegido por quien lee.
alter table public.sessions add column if not exists place text null;
alter table public.sessions drop constraint if exists sessions_place_check;
alter table public.sessions add constraint sessions_place_check
  check (place is null or char_length(place) between 1 and 40);
comment on column public.sessions.place is 'Dónde se leyó (opcional). Lo ven los dos, como el resto de la sesión.';

-- Un corazón a una sesión de tu pareja: «he visto que has leído». Sin aviso push.
alter table public.reactions drop constraint if exists reactions_target_type_check;
alter table public.reactions add constraint reactions_target_type_check
  check (target_type in ('message', 'quote', 'session'));

create or replace function public.is_session_from_partner(session_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from sessions s where s.id = session_id and s.user_id = my_partner())
$$;
revoke all on function public.is_session_from_partner(uuid) from public, anon;
grant execute on function public.is_session_from_partner(uuid) to authenticated;

drop policy if exists reactions_insert on public.reactions;
create policy reactions_insert on public.reactions for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      (target_type = 'message' and public.is_message_from_partner(target_id))
      or (target_type = 'quote' and public.is_quote_from_partner(target_id))
      or (target_type = 'session' and public.is_session_from_partner(target_id))
    )
  );
-- Al borrar una sesión, su corazón se borra con ella (trigger sessions_cleanup_reactions de la 0010).

commit;
