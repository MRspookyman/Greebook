-- Greenbook · emparejarse desde la app.
--
-- Hasta ahora los perfiles se creaban y se emparejaban a mano en el SQL Editor (seed.sql). Desde aquí:
--   · quien entra por primera vez recibe su perfil (ensure_profile),
--   · uno de los dos pide una invitación (invite) y le pasa el código al otro,
--   · el otro la acepta (accept_invitation) y quedáis emparejados.
-- Desde la app sigue sin poder tocarse `partner_id` directamente: solo estas funciones lo escriben.
-- Se puede ejecutar más de una vez.

create table if not exists public.invitations (
  code text primary key check (code ~ '^[0-9A-F]{10}$'),
  from_id uuid not null unique references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);
-- Nadie lee ni escribe la tabla desde la app: solo las funciones de abajo.
alter table public.invitations enable row level security;
revoke all on public.invitations from public, anon, authenticated;

-- Tu sitio en la habitación, la primera vez que entras. El nombre se cambia luego en la bienvenida.
create or replace function public.ensure_profile() returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  suggested text;
begin
  if me is null then
    raise exception 'sin_sesion' using errcode = '42501';
  end if;
  select left(nullif(trim(initcap(split_part(u.email, '@', 1))), ''), 40) into suggested
    from auth.users u where u.id = me;
  insert into profiles (id, name) values (me, coalesce(suggested, 'Yo'))
    on conflict (id) do nothing;
end $$;

-- Mi invitación vigente; si no hay ninguna, una nueva. Solo quien aún no tiene pareja puede invitar.
create or replace function public.invite() returns text
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  mine text;
begin
  if me is null or not exists (select 1 from profiles where id = me) then
    raise exception 'sin_perfil' using errcode = '42501';
  end if;
  if (select partner_id from profiles where id = me) is not null then
    raise exception 'ya_emparejado' using errcode = 'P0001';
  end if;
  delete from invitations where expires_at <= now();
  select code into mine from invitations where from_id = me;
  if mine is null then
    -- Los doce primeros dígitos de un UUID v4 son aleatorios; bastan diez (40 bits) para una semana.
    mine := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    insert into invitations (code, from_id) values (mine, me);
  end if;
  return mine;
end $$;

-- Aceptar la invitación del otro: os deja emparejados a los dos, o no cambia nada.
create or replace function public.accept_invitation(p_code text) returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  other uuid;
begin
  if me is null or not exists (select 1 from profiles where id = me) then
    raise exception 'sin_perfil' using errcode = '42501';
  end if;
  select from_id into other from invitations
    where code = upper(regexp_replace(coalesce(p_code, ''), '[^0-9A-Za-z]', '', 'g')) and expires_at > now()
    for update;
  if other is null then
    raise exception 'invitacion_no_vale' using errcode = 'P0001';
  end if;
  if other = me then
    raise exception 'invitacion_propia' using errcode = 'P0001';
  end if;
  -- Los dos perfiles se bloquean siempre en el mismo orden: dos aceptaciones cruzadas no se pisan.
  perform 1 from profiles where id in (me, other) order by id for update;
  if exists (select 1 from profiles where id in (me, other) and partner_id is not null) then
    raise exception 'ya_emparejado' using errcode = 'P0001';
  end if;
  update profiles set partner_id = other where id = me;
  update profiles set partner_id = me where id = other;
  delete from invitations where from_id in (me, other);
end $$;

revoke all on function public.ensure_profile() from public, anon;
revoke all on function public.invite() from public, anon;
revoke all on function public.accept_invitation(text) from public, anon;
grant execute on function public.ensure_profile() to authenticated;
grant execute on function public.invite() to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
