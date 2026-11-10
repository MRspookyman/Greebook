-- Greenbook · emparejar las dos cuentas (solo en un proyecto nuevo).
--
-- 1. Crea los dos usuarios en Authentication → Users → Add user (marca «Auto Confirm User»).
-- 2. Ejecuta antes supabase/migrations/0001_greenbook.sql.
-- 3. Comprueba abajo los dos emails y los dos nombres, y ejecuta esto en el SQL Editor.
--
-- Si venís del Greenbook anterior no hace falta: la migración conserva vuestros perfiles.

do $$
declare
  a_email text := 'lauritaguardia.jimenez@gmail.com';
  a_name  text := 'Laura';
  b_email text := 'javiermartinezmegiass@gmail.com';
  b_name  text := 'Javier';             -- ✏️
  a uuid;
  b uuid;
begin
  select id into a from auth.users where lower(email) = lower(a_email);
  select id into b from auth.users where lower(email) = lower(b_email);
  if a is null or b is null then
    raise exception 'No encuentro esas dos cuentas en Authentication → Users';
  end if;
  insert into public.profiles (id, name, color) values (a, a_name, 'miel'), (b, b_name, 'salvia')
    on conflict (id) do update set name = excluded.name;
  update public.profiles set partner_id = b where id = a;
  update public.profiles set partner_id = a where id = b;
end $$;
