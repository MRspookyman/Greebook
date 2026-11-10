-- ¡PELIGRO! NUNCA en producción después de entregar el regalo.
-- BORRA todos los libros, marcapáginas, veladas y papeles, y los sustituye por datos de prueba.
-- Conserva las cuentas, los nombres, los colores y el emparejamiento.
--
-- Greenbook · datos de prueba para recorrer todas las pantallas y casos.
-- Requiere 0001_greenbook.sql, 0002_siguiente.sql y las dos cuentas emparejadas (seed.sql).
-- Ejecuta el archivo COMPLETO en Supabase → SQL Editor (los emails de abajo son los de Laura y Javier).
-- Las fechas son relativas a hoy: se puede volver a ejecutar cualquier día.
-- Después, en cada móvil: avatar → Salir y volver a entrar (borra la copia local y lo descarga todo).
--
-- Qué hay para probar («L» = Laura, «J» = Javier):
--   Rayuela ............ los dos leyendo (mesilla «los dos»). Vela de J encendida hace 25 min.
--                        Papeles de J doblados para L (p. 150 y 198: avanza a L hasta la 150 para desdoblar),
--                        sin destripes y sin abrir (p. 60 y sin página), uno borrado (no debe verse).
--                        Papeles de L: abierto y querido (p. 93), abierto (p. 120), sin abrir (p. 180),
--                        doblado para J (p. 400). Predicciones de los dos, cerradas hasta que ambos terminen.
--                        Noches seguidas leyendo los dos hasta anoche (Inicio). Una velada borrada.
--   Proyecto Hail Mary . L en Kindle (porcentaje, 37 %); J lo terminó en papel. Su cita (p. 404 de 646)
--                        y su carta siguen dobladas para L: misma posición en otra edición.
--   Patria ............. solo J leyendo (mesilla «de J»).
--   Canto yo y la montaña baila · terminado por los dos hoy hace un año: «Hoy hace un año terminabais».
--                        Sobre abierto: cartas y predicciones de los dos, leídas.
--   Klara y el Sol ..... los dos terminado; J aún sin carta: la de L sigue doblada hasta que J escriba la suya.
--                        Predicciones abiertas (los dos lo cerraron); la de L, sin abrir por J.
--   El infinito en un junco · L terminado con carta y cita; J lo tiene pendiente y es su «siguiente».
--   Los detectives salvajes · pendiente de L y su «siguiente».
--   Pedro Páramo ....... pendiente de los dos, sin «siguiente».
--   Ulises / La chica del tren · dejados (L y J): «a medias».
--   Nada ............... «ya lo leí» de L, sin veladas (estantería del año pasado, sin recuerdo).
--   Tokio blues / La sombra del viento · terminados hace dos años (tercera balda).
--   Un libro borrado (no debe aparecer). Portadas reales en unos libros; el resto sin portada.

begin;

-- ───────────── Quiénes sois ✏️ ─────────────
create temp table _demo on commit drop as
select
  (select id from auth.users where lower(email) = lower('lauritaguardia.jimenez@gmail.com')) as l, -- Laura
  (select id from auth.users where lower(email) = lower('javiermartinezmegiass@gmail.com')) as j,  -- Javier
  'Europe/Madrid'::text as tz;

do $$
declare
  d _demo;
begin
  select * into d from _demo;
  if d.l is null or d.j is null then
    raise exception 'No encuentro esas dos cuentas en Authentication → Users: cambia los emails de arriba';
  end if;
  if not exists (select 1 from profiles where id = d.l and partner_id = d.j)
     or not exists (select 1 from profiles where id = d.j and partner_id = d.l) then
    raise exception 'Esas dos cuentas no están emparejadas: ejecuta antes supabase/seed.sql';
  end if;
end $$;

-- ───────────── Fuera lo anterior ─────────────
update profiles set candle_lit_at = null, candle_reading_id = null;
delete from slips;
delete from sessions;
delete from readings;
delete from books;

-- ───────────── Ayudantes (solo viven en esta conexión) ─────────────

-- Un instante a una hora local de un día.
create function pg_temp.a_las(p_day date, p_time time) returns timestamptz
language sql stable as $$ select (p_day + p_time) at time zone (select tz from _demo) $$;

create function pg_temp.libro(
  p_title text, p_author text, p_pages int, p_year int, p_isbn text, p_google text, p_by uuid, p_added date
) returns uuid
language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into books (id, title, author, pages, year, isbn, cover_url, added_by, created_at)
  values (v_id, p_title, p_author, p_pages, p_year, p_isbn,
    case when p_google is null then null else
      'https://books.google.com/books/content?id=' || p_google || '&printsec=frontcover&img=1&zoom=1&source=gbs_api' end,
    p_by, pg_temp.a_las(p_added, '19:30'));
  return v_id;
end $$;

create function pg_temp.marca(
  p_user uuid, p_book uuid, p_unit text, p_total int, p_position int, p_status text,
  p_started date, p_finished date, p_rating int, p_next_at timestamptz default null
) returns uuid
language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into readings (id, user_id, book_id, unit, total, position, status, started_on, finished_on, rating, next_at,
                        created_at)
  values (v_id, p_user, p_book, p_unit, p_total, p_position, p_status, p_started, p_finished, p_rating, p_next_at,
    pg_temp.a_las(coalesce(p_started, current_date - 30), '19:45'));
  return v_id;
end $$;

-- Veladas repartidas en esos días, avanzando de p_from a p_to. Lugar y minutos varían; una sin hora.
create function pg_temp.veladas(p_reading uuid, p_days date[], p_from int, p_to int) returns void
language plpgsql as $$
declare
  v_user uuid := (select user_id from readings where id = p_reading);
  v_days date[] := (select array_agg(x order by x) from unnest(p_days) x);
  v_n int := array_length(v_days, 1);
  v_places text[] := array['en la cama', 'en el sofá', 'en el tren', null, 'en la terraza'];
  i int;
begin
  for i in 1..v_n loop
    insert into sessions (id, reading_id, user_id, day, started_at, minutes, from_pos, to_pos, place, created_at)
    values (gen_random_uuid(), p_reading, v_user, v_days[i],
      case when i = 2 then null else pg_temp.a_las(v_days[i], time '21:40' + make_interval(mins => (i * 17) % 90)) end,
      15 + (i * 13) % 45,
      p_from + round((p_to - p_from) * (i - 1)::numeric / v_n)::int,
      p_from + round((p_to - p_from) * i::numeric / v_n)::int,
      v_places[1 + (i % 5)],
      pg_temp.a_las(v_days[i], '23:30'));
  end loop;
end $$;

-- Un papel. `at` se calcula con el total de quien lo escribe (como hace la app).
create function pg_temp.papel(
  p_user uuid, p_book uuid, p_kind text, p_page int, p_body text, p_written timestamptz,
  p_seen timestamptz default null, p_loved boolean default false, p_deleted boolean default false
) returns void
language plpgsql as $$
declare
  v_total int := (select total from readings where user_id = p_user and book_id = p_book order by updated_at desc limit 1);
begin
  insert into slips (id, user_id, book_id, kind, page, at, body, seen_at, loved, created_at, deleted_at)
  values (gen_random_uuid(), p_user, p_book, p_kind, p_page,
    case when p_page is null or v_total is null then null else round(least(1, p_page::numeric / v_total), 5) end,
    p_body, p_seen, p_loved, p_written, case when p_deleted then now() - interval '1 day' end);
end $$;

-- ───────────── La historia ─────────────
-- guard_slip solo deja fijar «abierto» y «querido» dentro de open_slip(); aquí se simula.
select set_config('greenbook.opening', '1', true);

do $$
declare
  d _demo;
  hoy date;
  noche date;
  hace_un_ano date;
  b uuid;
  rl uuid;
  rj uuid;
begin
  select * into d from _demo;
  hoy := (now() at time zone d.tz)::date;
  noche := ((now() at time zone d.tz) - interval '4 hours')::date;
  hace_un_ano := (hoy - interval '1 year')::date;

  -- Rayuela: los dos leyendo, con papeles en todos los estados.
  b := pg_temp.libro('Rayuela', 'Julio Cortázar', 600, 1963, null, null, d.l, noche - 21);
  rl := pg_temp.marca(d.l, b, 'paginas', 600, 142, 'leyendo', noche - 20, null, null);
  rj := pg_temp.marca(d.j, b, 'paginas', 600, 210, 'leyendo', noche - 18, null, null);
  perform pg_temp.veladas(rl, array[noche - 20, noche - 17, noche - 14, noche - 11, noche - 8, noche - 5,
                                    noche - 3, noche - 2, noche - 1], 0, 142);
  perform pg_temp.veladas(rj, array[noche - 18, noche - 14, noche - 11, noche - 8, noche - 6, noche - 4,
                                    noche - 3, noche - 2, noche - 1], 0, 210);
  insert into sessions (id, reading_id, user_id, day, started_at, minutes, from_pos, to_pos, place, deleted_at)
  values (gen_random_uuid(), rl, d.l, noche - 4, pg_temp.a_las(noche - 4, '22:00'), 12, 100, 104, 'en la cama',
          now() - interval '3 days');
  perform pg_temp.papel(d.j, b, 'nota', 150, 'Cuando llegues aquí, mírame. Sé la cara que vas a poner.',
    pg_temp.a_las(noche - 3, '23:05'));
  perform pg_temp.papel(d.j, b, 'cita', 198,
    '«Andábamos sin buscarnos pero sabiendo que andábamos para encontrarnos.»', pg_temp.a_las(noche - 2, '23:20'));
  perform pg_temp.papel(d.j, b, 'cita', 60, '«Encontrar a la Maga era tan fácil.» Me acordé de cuando nos conocimos.',
    pg_temp.a_las(noche - 11, '22:50'));
  perform pg_temp.papel(d.j, b, 'nota', null, 'No destripa nada: solo quería decirte que me encanta leer a la vez.',
    pg_temp.a_las(noche - 1, '23:45'));
  perform pg_temp.papel(d.j, b, 'nota', 30, 'Este papel está borrado: no debería verse.',
    pg_temp.a_las(noche - 15, '22:00'), p_deleted => true);
  perform pg_temp.papel(d.l, b, 'cita', 93, '«Toco tu boca, con un dedo toco el borde de tu boca.»',
    pg_temp.a_las(noche - 14, '22:30'), pg_temp.a_las(noche - 8, '22:40'), true);
  perform pg_temp.papel(d.l, b, 'nota', 120, 'Aquí me he reído en voz alta y me has mirado raro.',
    pg_temp.a_las(noche - 5, '22:15'), pg_temp.a_las(noche - 4, '23:00'));
  perform pg_temp.papel(d.l, b, 'nota', 180, 'Lo he leído en el tren y casi me paso de parada.',
    pg_temp.a_las(noche - 2, '08:10'));
  perform pg_temp.papel(d.l, b, 'nota', 400, 'Si llegas antes que yo, no me cuentes nada de esto.',
    pg_temp.a_las(noche - 1, '22:30'));
  perform pg_temp.papel(d.l, b, 'prediccion', null, 'Yo creo que no se vuelven a ver. Y que da igual.',
    pg_temp.a_las(noche - 19, '22:00'));
  perform pg_temp.papel(d.j, b, 'prediccion', null, 'Acaba en un manicomio. Apuesto una cena.',
    pg_temp.a_las(noche - 17, '22:10'));
  update profiles set candle_lit_at = now() - interval '25 minutes', candle_reading_id = rj where id = d.j;

  -- Proyecto Hail Mary: L en Kindle (%), J en papel y ya terminado.
  b := pg_temp.libro('Proyecto Hail Mary', 'Andy Weir', 646, 2021, '9788410466494', 'TunBEQAAQBAJ', d.j, noche - 70);
  rj := pg_temp.marca(d.j, b, 'paginas', 646, 646, 'terminado', noche - 65, noche - 40, 5);
  perform pg_temp.veladas(rj, array[noche - 65, noche - 62, noche - 60, noche - 57, noche - 55, noche - 52,
                                    noche - 49, noche - 46, noche - 43, noche - 40], 0, 646);
  rl := pg_temp.marca(d.l, b, 'porcentaje', 100, 37, 'leyendo', noche - 12, null, null);
  perform pg_temp.veladas(rl, array[noche - 12, noche - 10, noche - 9, noche - 6, noche - 4], 0, 37);
  perform pg_temp.papel(d.j, b, 'cita', 404, '«Amaze! Amaze! Amaze!» Cuando llegues aquí vas a querer a Rocky.',
    pg_temp.a_las(noche - 50, '23:00'));
  perform pg_temp.papel(d.j, b, 'carta', null, 'Te lo pasé por algo. Cuando lo termines, hablamos de Rocky.',
    pg_temp.a_las(noche - 40, '23:30'));

  -- Patria: solo J.
  b := pg_temp.libro('Patria', 'Fernando Aramburu', 721, 2016, '9788490663271', 'R1mpDAAAQBAJ', d.j, noche - 10);
  rj := pg_temp.marca(d.j, b, 'paginas', 721, 95, 'leyendo', noche - 9, null, null);
  perform pg_temp.veladas(rj, array[noche - 9, noche - 7, noche - 5], 0, 95);

  -- Canto yo y la montaña baila: terminado por los dos hoy hace un año. Sobre abierto.
  b := pg_temp.libro('Canto yo y la montaña baila', 'Irene Solà', 192, 2019, null, null, d.l, hace_un_ano - 25);
  rl := pg_temp.marca(d.l, b, 'paginas', 192, 192, 'terminado', hace_un_ano - 20, hace_un_ano, 5);
  rj := pg_temp.marca(d.j, b, 'paginas', 192, 192, 'terminado', hace_un_ano - 19, hace_un_ano, 4);
  perform pg_temp.veladas(rl, array[hace_un_ano - 20, hace_un_ano - 16, hace_un_ano - 12, hace_un_ano - 8,
                                    hace_un_ano - 4, hace_un_ano], 0, 192);
  perform pg_temp.veladas(rj, array[hace_un_ano - 19, hace_un_ano - 16, hace_un_ano - 12, hace_un_ano - 6,
                                    hace_un_ano - 4, hace_un_ano], 0, 192);
  perform pg_temp.papel(d.l, b, 'cita', 70, '«La lluvia es la única que sabe lo que nos pasa.»',
    pg_temp.a_las(hace_un_ano - 12, '22:20'), pg_temp.a_las(hace_un_ano - 11, '22:00'), true);
  perform pg_temp.papel(d.j, b, 'nota', 140, 'Esta parte la he leído dos veces.',
    pg_temp.a_las(hace_un_ano - 6, '23:10'), pg_temp.a_las(hace_un_ano - 4, '22:30'));
  perform pg_temp.papel(d.l, b, 'prediccion', null, 'La montaña va a hablar al final, ya verás.',
    pg_temp.a_las(hace_un_ano - 19, '22:00'), pg_temp.a_las(hace_un_ano, '23:50'));
  perform pg_temp.papel(d.j, b, 'prediccion', null, 'Esto acaba en tragedia.',
    pg_temp.a_las(hace_un_ano - 18, '22:00'), pg_temp.a_las(hace_un_ano, '23:55'), true);
  perform pg_temp.papel(d.l, b, 'carta', null, 'Me alegro de haberlo leído contigo. Me quedo con el final.',
    pg_temp.a_las(hace_un_ano, '23:00'), pg_temp.a_las(hace_un_ano + 1, '09:00'), true);
  perform pg_temp.papel(d.j, b, 'carta', null, 'No era lo que esperaba y por eso me ha gustado tanto.',
    pg_temp.a_las(hace_un_ano, '23:30'), pg_temp.a_las(hace_un_ano + 1, '08:30'), true);

  -- Klara y el Sol: los dos lo terminaron; J aún no ha escrito su carta.
  b := pg_temp.libro('Klara y el Sol', 'Kazuo Ishiguro', 226, 2021, '9788433942630', 'qxccEAAAQBAJ', d.l, noche - 50);
  rl := pg_temp.marca(d.l, b, 'paginas', 226, 226, 'terminado', noche - 45, noche - 30, 4);
  rj := pg_temp.marca(d.j, b, 'paginas', 226, 226, 'terminado', noche - 44, noche - 27, 3);
  perform pg_temp.veladas(rl, array[noche - 45, noche - 41, noche - 38, noche - 34, noche - 30], 0, 226);
  perform pg_temp.veladas(rj, array[noche - 44, noche - 41, noche - 37, noche - 34, noche - 30, noche - 27], 0, 226);
  perform pg_temp.papel(d.l, b, 'carta', null, 'Klara me ha recordado a cómo me cuidas cuando estoy mala.',
    pg_temp.a_las(noche - 30, '23:40'));
  perform pg_temp.papel(d.l, b, 'prediccion', null, 'Josie se cura gracias a Klara.', pg_temp.a_las(noche - 44, '22:00'));
  perform pg_temp.papel(d.j, b, 'prediccion', null, 'Klara acaba sola en un desguace.',
    pg_temp.a_las(noche - 43, '22:00'), pg_temp.a_las(noche - 29, '22:00'), true);

  -- El infinito en un junco: L lo terminó; para J es pendiente y su «siguiente».
  b := pg_temp.libro('El infinito en un junco', 'Irene Vallejo', 452, 2019, '9788410214392', 'li0GEQAAQBAJ', d.l,
    noche - 120);
  rl := pg_temp.marca(d.l, b, 'paginas', 452, 452, 'terminado', noche - 115, noche - 85, 5);
  perform pg_temp.veladas(rl, array[noche - 115, noche - 110, noche - 106, noche - 101, noche - 97, noche - 93,
                                    noche - 89, noche - 85], 0, 452);
  perform pg_temp.papel(d.l, b, 'cita', 200, '«Los libros son una tecnología para viajar en el tiempo.»',
    pg_temp.a_las(noche - 100, '22:45'));
  perform pg_temp.papel(d.l, b, 'carta', null, 'Léelo despacio. Es el libro que más he subrayado nunca.',
    pg_temp.a_las(noche - 85, '23:15'));
  perform pg_temp.marca(d.j, b, 'paginas', 452, 0, 'pendiente', null, null, null, now() - interval '6 days');

  -- Pila: el «siguiente» de L y uno pendiente de los dos.
  b := pg_temp.libro('Los detectives salvajes', 'Roberto Bolaño', 624, 1998, null, null, d.j, noche - 60);
  perform pg_temp.marca(d.l, b, 'paginas', 624, 0, 'pendiente', null, null, null, now() - interval '2 days');
  b := pg_temp.libro('Pedro Páramo', 'Juan Rulfo', 128, 1955, null, null, d.l, noche - 35);
  perform pg_temp.marca(d.l, b, 'paginas', 128, 0, 'pendiente', null, null, null);
  perform pg_temp.marca(d.j, b, 'paginas', 128, 0, 'pendiente', null, null, null);

  -- A medias.
  b := pg_temp.libro('Ulises', 'James Joyce', 736, 1922, null, null, d.l, noche - 160);
  rl := pg_temp.marca(d.l, b, 'paginas', 736, 120, 'dejado', noche - 155, null, null);
  perform pg_temp.veladas(rl, array[noche - 155, noche - 150, noche - 146, noche - 140], 0, 120);
  b := pg_temp.libro('La chica del tren', 'Paula Hawkins', 341, 2015, '9788408143086', 'jWBACQAAQBAJ', d.j,
    noche - 75);
  rj := pg_temp.marca(d.j, b, 'paginas', 341, 118, 'dejado', noche - 72, null, null);
  perform pg_temp.veladas(rj, array[noche - 72, noche - 70, noche - 68, noche - 66], 0, 118);

  -- «Ya lo leí»: terminado sin veladas.
  b := pg_temp.libro('Nada', 'Carmen Laforet', 256, 1945, null, null, d.l, hace_un_ano - 100);
  perform pg_temp.marca(d.l, b, 'paginas', 256, 256, 'terminado', null, hace_un_ano - 90, 4);

  -- Hace dos años.
  b := pg_temp.libro('Tokio blues', 'Haruki Murakami', 428, 1987, '9788483836712', 'dT3OVymWkKkC', d.l,
    (hoy - interval '2 years')::date - 60);
  rl := pg_temp.marca(d.l, b, 'paginas', 428, 428, 'terminado', (hoy - interval '2 years')::date - 50,
    (hoy - interval '2 years')::date - 30, 3);
  rj := pg_temp.marca(d.j, b, 'paginas', 428, 428, 'terminado', (hoy - interval '2 years')::date - 48,
    (hoy - interval '2 years')::date - 25, null);
  perform pg_temp.veladas(rl, array[(hoy - interval '2 years')::date - 50, (hoy - interval '2 years')::date - 40,
                                    (hoy - interval '2 years')::date - 30], 0, 428);
  perform pg_temp.veladas(rj, array[(hoy - interval '2 years')::date - 48, (hoy - interval '2 years')::date - 40,
                                    (hoy - interval '2 years')::date - 25], 0, 428);
  b := pg_temp.libro('La sombra del viento', 'Carlos Ruiz Zafón', 590, 2001, null, 'kh5fAAAAMAAJ', d.j,
    (hoy - interval '2 years')::date - 120);
  rj := pg_temp.marca(d.j, b, 'paginas', 590, 590, 'terminado', (hoy - interval '2 years')::date - 110,
    (hoy - interval '2 years')::date - 80, 5);
  perform pg_temp.veladas(rj, array[(hoy - interval '2 years')::date - 110, (hoy - interval '2 years')::date - 95,
                                    (hoy - interval '2 years')::date - 80], 0, 590);

  -- Un libro borrado: no debe aparecer en ningún sitio.
  b := pg_temp.libro('Libro borrado', 'Nadie', 100, null, null, null, d.l, noche - 5);
  update books set deleted_at = now() - interval '1 day' where id = b;

  update profiles set welcomed_at = coalesce(welcomed_at, now() - interval '400 days') where id in (d.l, d.j);
end $$;

select set_config('greenbook.opening', '', true);

-- Resumen.
select
  (select count(*) from books where deleted_at is null) as libros,
  (select count(*) from readings) as marcapaginas,
  (select count(*) from sessions where deleted_at is null) as veladas,
  (select count(*) from slips where deleted_at is null) as papeles;

commit;
