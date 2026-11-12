-- Pruebas del esquema contra un Postgres de verdad: quién ve qué y qué queda doblado.
-- Las ejecuta scripts/probar-sql.sh después de stubs.sql y de la migración (dos veces).
\set ON_ERROR_STOP on
\set laura   '00000000-0000-0000-0000-00000000000a'
\set javier  '00000000-0000-0000-0000-00000000000b'
\set intruso '00000000-0000-0000-0000-00000000000c'
\set libro   '10000000-0000-0000-0000-000000000001'
\o /dev/null

create function pg_temp.fails(sql text) returns boolean language plpgsql as $$
begin
  execute sql;
  return false;
exception when others then
  return true;
end $$;

-- ── La migración conservó quiénes sois y tiró lo demás ──
do $$ begin
  assert (select name || '/' || color from profiles where id = '00000000-0000-0000-0000-00000000000a') = 'Laura/cielo',
    'Laura conserva nombre y color';
  assert (select partner_id from profiles where id = '00000000-0000-0000-0000-00000000000b')
    = '00000000-0000-0000-0000-00000000000a', 'Javier sigue emparejado con Laura';
  assert to_regclass('public.quotes') is null, 'las tablas antiguas ya no están';
end $$;

-- Una tercera cuenta, sin pareja.
insert into profiles (id, name) values (:'intruso', 'Intruso');

-- ── Laura añade un libro y abre su marcapáginas ──
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'laura', true);
insert into books (id, title, author, pages) values (:'libro', 'Rayuela', 'Julio Cortázar', 200);
insert into readings (id, book_id, total, position, status)
  values ('20000000-0000-0000-0000-00000000000a', :'libro', 200, 150, 'leyendo');
insert into sessions (id, reading_id, day, minutes, from_pos, to_pos)
  values ('30000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', '2026-11-10', 30, 100, 150);
insert into slips (id, book_id, kind, page, at, body, seen_at, loved, hidden)
  values ('40000000-0000-0000-0000-000000000001', :'libro', 'nota', 100, 0.5, 'Aquí lloré', now(), true, true);
insert into slips (id, book_id, kind, page, at, body)
  values ('40000000-0000-0000-0000-000000000009', :'libro', 'nota', 180, 0.9, 'A la vista');
do $$ begin
  assert (select seen_at is null and not loved from slips where id = '40000000-0000-0000-0000-000000000001'),
    'quien escribe no puede marcar su papel como abierto';
  assert pg_temp.fails($q$update profiles set partner_id = null where id = auth.uid()$q$),
    'el emparejamiento no se cambia desde la app';
  assert pg_temp.fails($q$insert into sessions (id, reading_id, user_id, day, from_pos, to_pos)
    values (gen_random_uuid(), '20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', '2026-11-10', 0, 1)$q$),
    'no se escriben veladas a nombre del otro';
end $$;
commit;

-- ── Javier lo ve todo menos el texto de la nota oculta que aún no ha alcanzado ──
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'javier', true);
insert into readings (id, book_id, total, position, status)
  values ('20000000-0000-0000-0000-00000000000b', :'libro', 400, 100, 'leyendo');
do $$ begin
  assert (select count(*) from books) = 1, 'Javier ve el libro de Laura';
  assert (select count(*) from readings) = 2, 'Javier ve los dos marcapáginas';
  assert (select count(*) from sessions) = 1, 'Javier ve la velada de Laura';
  assert (select count(*) from profiles) = 2, 'Javier ve dos perfiles, no tres';
  assert (select count(*) from slips) = 0, 'la tabla de papeles solo enseña los propios';
  assert (select locked and hidden and body is null and page = 100 from slips_for_me() where id = '40000000-0000-0000-0000-000000000001'),
    'la nota oculta de la mitad está sin texto en el 25 % del libro';
  assert (select not locked and body = 'A la vista' from slips_for_me() where id = '40000000-0000-0000-0000-000000000009'),
    'la nota a la vista se lee aunque esté más adelante';
  assert pg_temp.fails($q$select open_slip('40000000-0000-0000-0000-000000000001')$q$),
    'una nota oculta no se puede abrir';
  assert pg_temp.fails($q$select slip_locked(s, auth.uid()) from slips s$q$), 'la regla de doblado no se llama a mano';
  assert pg_temp.fails($q$update readings set position = 0 where user_id <> auth.uid() returning id$q$) = false
    and (select position from readings where id = '20000000-0000-0000-0000-00000000000a') = 150,
    'Javier no mueve el marcapáginas de Laura';
end $$;
-- Javier puede corregir el libro, que es de los dos.
update books set pages = 210 where id = :'libro';
-- Llega a la mitad de SU edición (400 páginas): la nota oculta se abre.
update readings set position = 200 where id = '20000000-0000-0000-0000-00000000000b';
do $$ begin
  assert (select pages from books) = 210, 'cualquiera de los dos corrige un libro';
  assert (select not locked and body = 'Aquí lloré' from slips_for_me() where id = '40000000-0000-0000-0000-000000000001'),
    'al llegar a su punto, la nota se abre';
end $$;
select open_slip('40000000-0000-0000-0000-000000000001', true);
commit;

-- ── Laura ve que lo encontró, y no puede falsearlo ──
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'laura', true);
update slips set seen_at = null, loved = false, body = 'Aquí lloré mucho' where id = '40000000-0000-0000-0000-000000000001';
do $$ begin
  assert (select seen_at is not null and loved and body = 'Aquí lloré mucho' from slips where id = '40000000-0000-0000-0000-000000000001'),
    'el «la leyó» es de quien la recibe';
end $$;

-- De antes: Laura termina y tenía escritas una carta y una predicción.
update readings set position = 200, status = 'terminado', finished_on = '2026-11-10' where id = '20000000-0000-0000-0000-00000000000a';
insert into slips (id, book_id, kind, body) values
  ('40000000-0000-0000-0000-000000000002', :'libro', 'carta', 'Carta de Laura'),
  ('40000000-0000-0000-0000-000000000003', :'libro', 'prediccion', 'Acaban juntos');
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'javier', true);
do $$ begin
  assert (select bool_and(not locked and body is not null) from slips_for_me() where kind in ('carta', 'prediccion')),
    'las cartas y predicciones de antes se leen como cualquier nota';
end $$;
update readings set position = 400, status = 'terminado' where id = '20000000-0000-0000-0000-00000000000b';
do $$ begin
  assert (select not locked and body = 'Acaban juntos' from slips_for_me() where kind = 'prediccion'),
    'y se siguen leyendo al terminar';
end $$;
insert into slips (id, book_id, kind, body) values ('40000000-0000-0000-0000-000000000004', :'libro', 'carta', 'Carta de Javier');
do $$ begin
  assert (select not locked and body = 'Carta de Laura' from slips_for_me() where kind = 'carta' and user_id <> auth.uid()),
    'la de Laura se lee';
end $$;
-- El canal de la pareja.
select set_config('realtime.topic', 'pareja:' || :'laura' || ':' || :'javier', true);
insert into realtime.messages (topic, extension) values ('x', 'broadcast');
commit;

-- ── La tercera cuenta no ve nada ──
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'intruso', true);
select set_config('realtime.topic', 'pareja:' || :'laura' || ':' || :'javier', true);
do $$ begin
  assert (select count(*) from profiles) = 1, 'solo su propio perfil';
  assert (select count(*) from books) = 0, 'ningún libro';
  assert (select count(*) from readings) = 0, 'ningún marcapáginas';
  assert (select count(*) from sessions) = 0, 'ninguna velada';
  assert (select count(*) from slips) = 0, 'ningún papel';
  assert (select count(*) from slips_for_me()) = 0, 'ningún papel tampoco por la función';
  assert (select count(*) from realtime.messages) = 0, 'no escucha el canal de la pareja';
  assert pg_temp.fails($q$select open_slip('40000000-0000-0000-0000-000000000001')$q$), 'no abre papeles ajenos';
  assert pg_temp.fails($q$insert into realtime.messages (topic, extension) values ('x', 'broadcast')$q$),
    'no habla por el canal de la pareja';
  assert pg_temp.fails($q$insert into readings (id, book_id, total) values (gen_random_uuid(), '10000000-0000-0000-0000-000000000001', 10)$q$),
    'no pone marcapáginas en libros ajenos';
  assert pg_temp.fails($q$insert into slips (id, book_id, kind, body) values (gen_random_uuid(), '10000000-0000-0000-0000-000000000001', 'nota', 'hola')$q$),
    'no deja papeles en libros ajenos';
  assert pg_temp.fails($q$update profiles set partner_id = '00000000-0000-0000-0000-00000000000a' where id = auth.uid()$q$),
    'no se empareja a sí misma';
end $$;
commit;

-- ── Sin sesión, nada ──
begin;
set local role anon;
do $$ begin
  assert pg_temp.fails('select * from slips_for_me()'), 'anon no llama a slips_for_me';
  assert pg_temp.fails('select public.my_partner()'), 'anon no pregunta por parejas';
  assert (select count(*) from books) = 0, 'anon no ve libros';
end $$;
commit;

-- ── La función de avisos sí puede preguntar si un papel está doblado ──
begin;
set local role service_role;
do $$ begin
  assert (select slip_locked_for('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b')) = false,
    'el servicio sabe que Javier ya lo puede leer';
end $$;
commit;

-- ── Emparejarse desde la app ──
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000d', 'nuevo.lector@example.com'),
  ('00000000-0000-0000-0000-00000000000e', 'otra@example.com');
create temp table _invite (code text);
grant all on _invite to authenticated;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', true);
select ensure_profile();
select ensure_profile();
insert into _invite select invite();
do $$ begin
  assert (select name from profiles where id = auth.uid()) = 'Nuevo.Lector', 'quien entra por primera vez recibe su perfil';
  assert (select invite()) = (select code from _invite), 'la invitación vigente es siempre la misma';
  assert pg_temp.fails($q$select * from invitations$q$), 'la tabla de invitaciones no se lee desde la app';
  assert pg_temp.fails($q$select accept_invitation((select code from _invite))$q$), 'nadie acepta su propia invitación';
end $$;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'laura', true);
do $$ begin
  assert pg_temp.fails($q$select invite()$q$), 'quien ya tiene pareja no invita';
  assert pg_temp.fails($q$select accept_invitation((select code from _invite))$q$), 'quien ya tiene pareja no acepta';
end $$;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000e', true);
select ensure_profile();
do $$ begin
  assert pg_temp.fails($q$select accept_invitation('0000000000')$q$), 'un código inventado no vale';
end $$;
-- Tal como se teclea: en minúsculas y con un guion.
select accept_invitation(lower(substr(code, 1, 5)) || '-' || substr(code, 6)) from _invite;
do $$ begin
  assert (select public.my_partner()) = '00000000-0000-0000-0000-00000000000d', 'al aceptar quedan emparejadas';
  assert (select count(*) from profiles) = 2, 'y cada una ve a la otra';
  assert pg_temp.fails($q$select accept_invitation((select code from _invite))$q$), 'la invitación se gasta al usarla';
end $$;
commit;

begin;
set local role anon;
do $$ begin
  assert pg_temp.fails('select public.ensure_profile()'), 'anon no crea perfiles';
  assert pg_temp.fails($q$select public.accept_invitation('0000000000')$q$), 'anon no acepta invitaciones';
end $$;
commit;

\o
\echo 'OK · RLS y papeles doblados'
