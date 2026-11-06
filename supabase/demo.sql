-- Greenbook: datos de ejemplo para ver la app llena (Gordita y Gordito).
-- Ejecutar completo en Supabase → SQL Editor.
-- ⚠️ BORRA antes todos los libros, lecturas, sesiones, notas, reacciones y sorpresas vistas.
--    Las cuentas y los perfiles se conservan. Para vaciar después: supabase/reset.sql

begin;

delete from reactions;
delete from notes;
delete from sessions;
delete from readings;
delete from books;
delete from surprises_seen;

-- Perfiles (solo si aún no existen).
insert into profiles (id, display_name, accent, partner_id, is_gift_recipient, onboarded_at)
values
  ('0ef9b6d1-cfba-4921-8850-e98390566181', 'Gordita', 'blue', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', true, now()),
  ('834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', 'Gordito', 'green', '0ef9b6d1-cfba-4921-8850-e98390566181', false, now())
on conflict (id) do nothing;

insert into books (id, google_id, isbn13, title, authors, cover_url, page_count, published_year, description, created_by) values ('d66f22c0-2ee5-4df9-b281-3927fa4c3e0e', 'kh5fAAAAMAAJ', null, 'La sombra del viento', array['Carlos Ruiz Zafón']::text[], 'https://books.google.com/books/content?id=kh5fAAAAMAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api', 590, 2001, 'Un amanecer de 1945, un muchacho es conducido por su padre a un misterioso lugar oculto en el corazón de la ciudad vieja: El Cementerio de los Libros Olvidados. Allí, Daniel Sempere encuentra un libro maldito que cambia el rumbo de su vida y le arrastra a un laberinto de intrigas y secretos enterrados en el alma oscura de la ciudad.', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e');
insert into books (id, google_id, isbn13, title, authors, cover_url, page_count, published_year, description, created_by) values ('2fa65266-bc9a-4e1a-9e03-ff6d188a4a40', 'TunBEQAAQBAJ', '9788410466494', 'Proyecto Hail Mary', array['Andy Weir']::text[], 'https://books.google.com/books/content?id=TunBEQAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api', 646, 2021, 'Nueva edición de la obra maestra de Andy Weir, con las 2 ilustra ciones de Marc Simonetti incluidas en la versión de Subterranean Press. MÁS DE 5 MILLONES DE LECTORES EN TODO EL MUNDO. UNA GRAN PELÍCULA PROTAGONIZADA POR RYAN GOSLING. «La mejor obra de Andy Weir hasta la fecha». BRANDON SANDERSON «Este libro tiene todo lo que les gusta alos aficionados de la ciencia ficción clásica (como yo)». GEORGE R. R. MARTIN «Uno de los viajes más originales, emocionantes y divertidos que he hecho.» ERNEST CLINE UN ÚNICO ASTRONAUTA. UNA MISIÓN IMPOSIBLE. Y UN ALIADO QUE JAMÁS HABRÍA IMAGINADO. Ryland Grac', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e');
insert into books (id, google_id, isbn13, title, authors, cover_url, page_count, published_year, description, created_by) values ('460fcc00-14ee-4ae9-9b49-354c7584f774', 'li0GEQAAQBAJ', '9788410214392', 'El infinito en un junco', array['Irene Vallejo']::text[], 'https://books.google.com/books/content?id=li0GEQAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api', 452, 2019, 'LA ADAPTACIÓN GRÁFICA DEL ENSAYO REVELACIÓN DE NUESTRO TIEMPO EN UNA NUEVA VERSIÓN REVISADA Y AUMENTADA. PREMIO NACIONAL DE ENSAYO · PREMIO DE LA ASOCIACIÓN DE LAS LIBRERÍAS DE MADRID · PREMIO EL OJO CRÍTICO DE NARRATIVA · PREMIO LAS LIBRERÍAS RECOMIENDAN · PREMIO JOSÉ ANTONIO LABORDETA · PREMIO BÚHO AL MEJOR LIBRO · PREMIO ANTONIO SANCHA DE LOS EDITORES · PREMIO ARAGÓN 2021 · PREMIO WENJIN 2023 DE LA BIBLIOTECA NACIONAL DE CHINA · PREMIO HENRÍQUEZ UREÑA DE LA ACADEMIA MEXICANA DE LA LENGUA · FINALISTA DEL PRIX DU LIVRE EUROPÉEN 2020 · PRIX LIVRE DE POCHE DES LECTEURS 2023 · FINALISTA DEL BRIT', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e');
insert into books (id, google_id, isbn13, title, authors, cover_url, page_count, published_year, description, created_by) values ('b1e57cf9-7406-422e-9f10-322f7fd874bc', 'qxccEAAAQBAJ', '9788433942630', 'Klara y el Sol', array['Kazuo Ishiguro']::text[], 'https://books.google.com/books/content?id=qxccEAAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api', 226, 2021, 'La esperada novela de Kazuo Ishiguro tras el Premio Nobel. Una historia de ciencia ficción que indaga en lo que nos hace humanos. Klara es una AA, una Amiga Artificial, especializada en el cuidado de niños. Pasa sus días en una tienda, esperando a que alguien la adquiera y se la lleve a una casa, un hogar. Mientras espera, contempla el exterior desde el escaparate. Observa a los transeúntes, sus actitudes, sus gestos, su modo de caminar, y es testigo de algunos episodios que no acaba de entender, como una extraña pelea entre dos taxistas. Klara es una AA singular, es más observadora y más dada', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e');
insert into books (id, google_id, isbn13, title, authors, cover_url, page_count, published_year, description, created_by) values ('d635684c-420a-474f-9efd-c8f0c07a72ef', 'kmAQCwAAQBAJ', '9788439731764', 'Cien años de soledad', array['Gabriel García Márquez']::text[], 'https://books.google.com/books/content?id=kmAQCwAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api', 311, 1967, 'Edición limitada en tapa dura, con acabados de lujo, de la gran novela de Gabriel García Márquez, con el motivo del décimo aniversario de su fallecimiento. «Muchos años después, frente al pelotón de fusilamiento, el coronel Aureliano Buendía había de recordar aquella tarde remota en que su padre lo llevó a conocer el hielo. Macondo era entonces una aldea de veinte casas de barro y cañabrava construidas a la orilla de un río de aguas diáfanas que se precipitaban por un lecho de piedras pulidas, blancas y enormes como huevos prehistóricos. El mundo era tan reciente, que muchas cosas carecían de ', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e');
insert into books (id, google_id, isbn13, title, authors, cover_url, page_count, published_year, description, created_by) values ('d48f1216-e50f-42d8-8636-b751729b8b29', 'R1mpDAAAQBAJ', '9788490663271', 'Patria', array['Fernando Aramburu']::text[], 'https://books.google.com/books/content?id=R1mpDAAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api', 721, 2016, 'Una novela conmovedora, difícil de olvidar, sobre los últimos treinta años de la vida en Euskadi. El día en que ETA anuncia el abandono de las armas, Bittori se dirige al cementerio para contarle a la tumba de su marido el Txato, asesinado por los terroristas, que ha decidido volver a la casa donde vivieron. ¿Podrá convivir con quienes la acosaron antes y después del atentado que trastocó su vida y la de su familia? ¿Podrá saber quién fue el encapuchado que un día lluvioso mató a su marido, cuando volvía de su empresa de transportes? Por más que llegue a escondidas, la presencia de Bittori alt', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e');
insert into books (id, google_id, isbn13, title, authors, cover_url, page_count, published_year, description, created_by) values ('620252ab-b7fd-4705-8d32-9ba84959692e', 'jWBACQAAQBAJ', '9788408143086', 'La chica del tren', array['Paula Hawkins']::text[], 'https://books.google.com/books/content?id=jWBACQAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api', 341, 2015, '¿Estabas en el tren de las 8.04? ¿Viste algo sospechoso? Rachel, sí Rachel toma siempre el tren de las 8.04 h. Cada mañana lo mismo: el mismo paisaje, las mismas casas... y la misma parada en la señal roja. Son solo unos segundos, pero le permiten observar a una pareja desayunando tranquilamente en su terraza. Siente que los conoce y se inventa unos nombres para ellos: Jess y Jason. Su vida es perfecta, no como la suya. Pero un día ve algo. Sucede muy deprisa, pero es suficiente. ¿Y si Jess y Jason no son tan felices como ella cree? ¿Y si nada es lo que parece? Tú no la conoces. Ella a ti, sí.', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e');
insert into books (id, google_id, isbn13, title, authors, cover_url, page_count, published_year, description, created_by) values ('3d08954e-7d11-497d-b2a2-73e44a577f3d', 'QeYF9kTMypgC', '9788401352799', 'El nombre del viento', array['Patrick Rothfuss']::text[], 'https://books.google.com/books/content?id=QeYF9kTMypgC&printsec=frontcover&img=1&zoom=1&source=gbs_api', 805, 2007, 'Atípica, profunda y sincera, El nombre del viento es una novela de aventuras, de historias dentro de otras historias, de misterio, de amistad, de amor, de magia y de superación. La novela que ha consagrado a Patrick Rothfuss como fenómeno editorial de los últimos años. En una posada en tierra de nadie, un hombre se dispone a relatar, por primera vez, la auténtica historia de su vida. Una historia que únicamente él conoce y que ha quedado diluida tras los rumores, las conjeturas y los cuentos de taberna que le han convertido en un personaje legendario a quien todos daban ya por muerto: Kvothe..', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e');
insert into books (id, google_id, isbn13, title, authors, cover_url, page_count, published_year, description, created_by) values ('c9d0a345-5400-434b-9e16-c6a26696c568', 'dT3OVymWkKkC', '9788483836712', 'Tokio blues', array['Haruki Murakami']::text[], 'https://books.google.com/books/content?id=dT3OVymWkKkC&printsec=frontcover&img=1&zoom=1&source=gbs_api', 428, 1987, 'La obra más exitosa de Haruki Murakami. Un conmovedora historia sobre la juventud, los primeros amores y el dolor que implica el paso a la madurez. Mientras aterriza en un aeropuerto europeo, Toru Watanabe, un ejecutivo de 37 años, escucha una vieja canción de los Beatles que le hace retroceder a su juventud, al turbulento Tokio de los años sesenta. Con una mezcla de melancolía y desasosiego, Toru recuerda entonces a la inestable y misteriosa Naoko, la novia de su mejor y único amigo de la adolescencia, Kizuki. El suicidio de éste distanció a Toru y a Naoko durante un año, hasta que se reencon', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e');
insert into books (id, google_id, isbn13, title, authors, cover_url, page_count, published_year, description, created_by) values ('0535bacf-209d-4654-9769-16dec92b7326', 'ib_UDAAAQBAJ', '9788490695289', 'El problema de los tres cuerpos', array['Cixin Liu']::text[], 'https://books.google.com/books/content?id=ib_UDAAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api', 432, 2008, 'El primer libro de la Trilogía de los Tres Cuerpos, el fenómeno editorial chino que ha conquistado al mundo. Premio Hugo 2015 a la mejor novela. MÁS DE 32 MILLONES DE EJEMPLARES VENDIDOS EN TODO EL MUNDO. «Las novelas de Cixin Liu son maravillosas. Las recomiendo muchísimo». José Manuel Nieves, Cuarto Milenio «Un descubrimiento científico y filosófico único». George R. R. Martin «Increíblemente imaginativa». span style="font-weight: bold;"Barack Obama El problema de los tres cuerpos es la primera novela no escrita originariamente en inglés galardonada con el premio Hugo, el Nobel del género de', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e');
insert into books (id, google_id, isbn13, title, authors, cover_url, page_count, published_year, description, created_by) values ('20d191bb-41f4-4fc7-b135-6bbb15681c00', 'KWy4EAAAQBAJ', '9786558941330', 'Mujercitas', array['Louisa May Alcott']::text[], 'https://books.google.com/books/content?id=KWy4EAAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api', 718, 1868, 'Mujercitas, una evocación atemporal de la vida familiar idealizada, fue un éxito instantáneo y se convirtió en una de las novelas clásicas más queridas de los Estados Unidos. Mujercitas narra la vida de las cuatro hermanas March, que crecieron en Nueva Inglaterra con la Guerra Civil como telón de fondo. La historia detalla sus luchas con la pobreza y las dificultades, sus fallas morales y sus desencantos. Desde que se publicó por primera vez en 1889, Mujercitas, una novela autobiográfica de la propia infancia de Louisa May Alcott, se ha convertido en un clásico por su descripción cálida y conm', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e');
insert into readings (id, user_id, book_id, format, unit, total_units, current_position, status, started_on, finished_on, rating, moods) values ('2a5dd163-3372-48b2-87c1-d338cc167d1c', '0ef9b6d1-cfba-4921-8850-e98390566181', 'd66f22c0-2ee5-4df9-b281-3927fa4c3e0e', 'paper', 'pages', 590, 360, 'reading', current_date - 20, null, null, array[]::text[]);
insert into sessions (id, reading_id, user_id, read_on, start_pos, end_pos, minutes) values
  ('42bb218c-a813-4d05-bebe-ac47d0a0f5c1', '2a5dd163-3372-48b2-87c1-d338cc167d1c', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 20, 0, 18, 35),
  ('389ea007-2037-4572-aaba-accb8e97934e', '2a5dd163-3372-48b2-87c1-d338cc167d1c', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 18, 18, 43, 43),
  ('d39e6876-3179-4652-8a21-3df5d5197dee', '2a5dd163-3372-48b2-87c1-d338cc167d1c', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 17, 43, 66, 42),
  ('83e87e3a-0e88-4ca9-b4b5-8c4e8d750063', '2a5dd163-3372-48b2-87c1-d338cc167d1c', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 16, 66, 78, 23),
  ('880265da-7efe-4c2a-889d-8f3d7afdc32b', '2a5dd163-3372-48b2-87c1-d338cc167d1c', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 15, 78, 96, 26),
  ('296bfb26-a4da-41fa-8308-26da819dda94', '2a5dd163-3372-48b2-87c1-d338cc167d1c', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 14, 96, 121, 39),
  ('5a12b05b-ffdc-4e3e-80d4-63c0fc5e6aa0', '2a5dd163-3372-48b2-87c1-d338cc167d1c', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 13, 121, 142, 36),
  ('1cc47236-9f75-4788-8587-70821d688dae', '2a5dd163-3372-48b2-87c1-d338cc167d1c', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 12, 142, 162, 34),
  ('a6f39846-e35a-4d39-baa0-ae00b917db6e', '2a5dd163-3372-48b2-87c1-d338cc167d1c', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 11, 162, 181, 31),
  ('e1dff258-c10d-440d-9631-57cfe660a33e', '2a5dd163-3372-48b2-87c1-d338cc167d1c', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 10, 181, 206, 38),
  ('1388d00e-9d13-4533-853d-fcb230a7de5c', '2a5dd163-3372-48b2-87c1-d338cc167d1c', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 9, 206, 231, 49),
  ('dfaa0451-0075-4503-a2d0-c2ee28045c3e', '2a5dd163-3372-48b2-87c1-d338cc167d1c', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 8, 231, 247, 23),
  ('30eb52d8-ce98-4be1-8a24-082427038733', '2a5dd163-3372-48b2-87c1-d338cc167d1c', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 7, 247, 262, 24),
  ('5b776e2a-e5cc-4753-bd09-9182a44a95e9', '2a5dd163-3372-48b2-87c1-d338cc167d1c', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 6, 262, 286, 39),
  ('cc6d2a0c-faaa-4bc6-877a-db86eca68c3f', '2a5dd163-3372-48b2-87c1-d338cc167d1c', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 5, 286, 301, 27),
  ('f19fe539-9681-47c1-84a5-52d947b14791', '2a5dd163-3372-48b2-87c1-d338cc167d1c', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 4, 301, 313, 23),
  ('5e2cbc87-9bce-4de5-a3fc-4f61a18f469c', '2a5dd163-3372-48b2-87c1-d338cc167d1c', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 3, 313, 328, 26),
  ('dd383126-f3db-453e-9ef4-a43b0caba7cb', '2a5dd163-3372-48b2-87c1-d338cc167d1c', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 1, 328, 345, 25),
  ('dc5c913b-5378-43ea-a8af-7977a8131223', '2a5dd163-3372-48b2-87c1-d338cc167d1c', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date, 345, 360, 25);
insert into readings (id, user_id, book_id, format, unit, total_units, current_position, status, started_on, finished_on, rating, moods) values ('db512234-3a10-44f9-b099-7b789ea1b7c2', '0ef9b6d1-cfba-4921-8850-e98390566181', 'b1e57cf9-7406-422e-9f10-322f7fd874bc', 'paper', 'pages', 226, 226, 'finished', current_date - 40, current_date - 21, 5, array['conmovedor','reflexivo']::text[]);
insert into sessions (id, reading_id, user_id, read_on, start_pos, end_pos, minutes) values
  ('c0c23fdb-9883-4163-a8d4-63214b78fea8', 'db512234-3a10-44f9-b099-7b789ea1b7c2', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 40, 0, 10, 18),
  ('19b18cb5-8f85-41e5-8bd5-8f3af03908cf', 'db512234-3a10-44f9-b099-7b789ea1b7c2', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 38, 10, 25, 22),
  ('a0e848cd-b002-44c6-af85-2b84a2797da1', 'db512234-3a10-44f9-b099-7b789ea1b7c2', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 37, 25, 37, 23),
  ('83952353-f3c1-4ef1-8357-847d51ddaac0', 'db512234-3a10-44f9-b099-7b789ea1b7c2', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 36, 37, 48, 21),
  ('b130cd6e-664e-4061-853d-21bb50c0f03e', 'db512234-3a10-44f9-b099-7b789ea1b7c2', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 35, 48, 60, 23),
  ('e05a35ae-62ac-497d-94a9-5c72742be610', 'db512234-3a10-44f9-b099-7b789ea1b7c2', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 34, 60, 77, 33),
  ('d351cb65-981e-41d0-a8af-e071b0e54f2d', 'db512234-3a10-44f9-b099-7b789ea1b7c2', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 32, 77, 95, 35),
  ('816be491-141d-44a0-86a0-1325e9ea6400', 'db512234-3a10-44f9-b099-7b789ea1b7c2', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 31, 95, 104, 17),
  ('b614deb3-b42d-4c7b-917e-2b45be656210', 'db512234-3a10-44f9-b099-7b789ea1b7c2', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 30, 104, 121, 27),
  ('21508f85-bc6f-405c-850a-6f9752da45df', 'db512234-3a10-44f9-b099-7b789ea1b7c2', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 29, 121, 129, 11),
  ('82c805f5-f414-43b7-a842-6de2769c9c4c', 'db512234-3a10-44f9-b099-7b789ea1b7c2', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 28, 129, 141, 19),
  ('52eac5f9-3f91-4bc3-a89a-f07b4a676ae2', 'db512234-3a10-44f9-b099-7b789ea1b7c2', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 27, 141, 150, 13),
  ('ad1cb57c-3da9-4bcd-9534-bdbce1f0188e', 'db512234-3a10-44f9-b099-7b789ea1b7c2', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 26, 150, 158, 11),
  ('b5306616-777b-42e7-8a38-ec87418f5c1f', 'db512234-3a10-44f9-b099-7b789ea1b7c2', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 25, 158, 178, 35),
  ('8b278dbb-0e13-4464-9603-c39633da460d', 'db512234-3a10-44f9-b099-7b789ea1b7c2', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 24, 178, 188, 15),
  ('2bb2b97f-eb42-495c-add8-48f106bcde5b', 'db512234-3a10-44f9-b099-7b789ea1b7c2', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 23, 188, 203, 28),
  ('75b37e21-b7f2-43eb-b78b-31bda80b2875', 'db512234-3a10-44f9-b099-7b789ea1b7c2', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 22, 203, 212, 15),
  ('85e74162-c53e-4697-ac5a-b8776d254db1', 'db512234-3a10-44f9-b099-7b789ea1b7c2', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 21, 212, 226, 25);
insert into readings (id, user_id, book_id, format, unit, total_units, current_position, status, started_on, finished_on, rating, moods) values ('2be6989c-8156-4a27-8833-81cad8b80824', '0ef9b6d1-cfba-4921-8850-e98390566181', '460fcc00-14ee-4ae9-9b49-354c7584f774', 'paper', 'pages', 452, 452, 'finished', current_date - 95, current_date - 65, 4.5, array['inspirador','reflexivo']::text[]);
insert into sessions (id, reading_id, user_id, read_on, start_pos, end_pos, minutes) values
  ('84791af3-faab-40e2-9d1e-c7b1065f1fb1', '2be6989c-8156-4a27-8833-81cad8b80824', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 95, 0, 15, 27),
  ('36f3488b-c4b8-4cb1-a4b3-0ba5e151fb16', '2be6989c-8156-4a27-8833-81cad8b80824', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 93, 15, 41, 48),
  ('d43e4c87-bf78-40de-b01f-214a49c5589e', '2be6989c-8156-4a27-8833-81cad8b80824', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 91, 41, 71, 48),
  ('a27b2c8f-e778-4558-aa3b-ac1678632f2d', '2be6989c-8156-4a27-8833-81cad8b80824', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 90, 71, 84, 24),
  ('0ab51a24-ed9d-4905-96f3-745bae66882e', '2be6989c-8156-4a27-8833-81cad8b80824', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 88, 84, 114, 50),
  ('09e85b14-2498-4d6d-86d1-1a081c6a3466', '2be6989c-8156-4a27-8833-81cad8b80824', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 86, 114, 143, 44),
  ('5780db35-1aed-4d87-8669-0a1a0c70dfb6', '2be6989c-8156-4a27-8833-81cad8b80824', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 85, 143, 175, 51),
  ('98a56cf5-3939-40ad-b87d-e4a06669e10f', '2be6989c-8156-4a27-8833-81cad8b80824', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 84, 175, 206, 62),
  ('6e1be092-34de-43c4-a336-99c5653eab57', '2be6989c-8156-4a27-8833-81cad8b80824', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 82, 206, 233, 54),
  ('ea5c3a6e-4177-4c5f-9b76-5fa9b2fd4179', '2be6989c-8156-4a27-8833-81cad8b80824', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 80, 233, 253, 36),
  ('3ec373e9-52d1-435e-bed9-7134bffc352f', '2be6989c-8156-4a27-8833-81cad8b80824', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 79, 253, 270, 33),
  ('d937c826-ac04-4622-acfe-e5189e5ef5d1', '2be6989c-8156-4a27-8833-81cad8b80824', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 78, 270, 296, 51),
  ('f0f2b409-7944-45ed-8711-6a3a7da563bc', '2be6989c-8156-4a27-8833-81cad8b80824', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 74, 296, 325, 44),
  ('8f4cdd57-9964-4bba-b408-30c11bcd0eda', '2be6989c-8156-4a27-8833-81cad8b80824', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 72, 325, 345, 36),
  ('79f0d0a9-5faa-4c1d-bb47-97425f847ccc', '2be6989c-8156-4a27-8833-81cad8b80824', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 71, 345, 362, 25),
  ('1512cb13-1ba3-4684-b929-6f91f9803db1', '2be6989c-8156-4a27-8833-81cad8b80824', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 70, 362, 382, 34),
  ('42b5d47f-731a-47d0-bb73-5022c59924c0', '2be6989c-8156-4a27-8833-81cad8b80824', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 69, 382, 412, 52),
  ('05959d4b-58ed-432d-b7b9-6b46abcb7846', '2be6989c-8156-4a27-8833-81cad8b80824', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 66, 412, 435, 43),
  ('eb06a1a2-dac7-4cb5-a207-e3c3896aeef1', '2be6989c-8156-4a27-8833-81cad8b80824', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 65, 435, 452, 33);
insert into readings (id, user_id, book_id, format, unit, total_units, current_position, status, started_on, finished_on, rating, moods) values ('c5fb6620-a91f-4bd6-917d-c4d3d87e59b9', '0ef9b6d1-cfba-4921-8850-e98390566181', 'c9d0a345-5400-434b-9e16-c6a26696c568', 'paper', 'pages', 428, 428, 'finished', current_date - 150, current_date - 125, 3.5, array['triste','romántico']::text[]);
insert into sessions (id, reading_id, user_id, read_on, start_pos, end_pos, minutes) values
  ('d5cbc728-ecab-4d9b-86b4-fb4c29ad981c', 'c5fb6620-a91f-4bd6-917d-c4d3d87e59b9', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 150, 0, 35, 53),
  ('f26db748-bd44-41e6-b5af-12ca5359c610', 'c5fb6620-a91f-4bd6-917d-c4d3d87e59b9', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 149, 35, 64, 52),
  ('ffe62a00-52bb-41c9-a29d-9e1d62776d56', 'c5fb6620-a91f-4bd6-917d-c4d3d87e59b9', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 147, 64, 100, 56),
  ('df9a87ff-b2b6-4b34-9afe-157f91fab101', 'c5fb6620-a91f-4bd6-917d-c4d3d87e59b9', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 145, 100, 114, 23),
  ('1f0282e9-81e6-4248-8d6b-dcaa267f129a', 'c5fb6620-a91f-4bd6-917d-c4d3d87e59b9', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 144, 114, 145, 62),
  ('a266dae8-0c30-4431-8e76-b6c9870153bc', 'c5fb6620-a91f-4bd6-917d-c4d3d87e59b9', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 143, 145, 173, 46),
  ('3154ad6b-ab1c-4b4f-9626-f505e86b63e5', 'c5fb6620-a91f-4bd6-917d-c4d3d87e59b9', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 142, 173, 203, 54),
  ('6a30244e-94ce-4c44-b449-9ee908440ce1', 'c5fb6620-a91f-4bd6-917d-c4d3d87e59b9', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 141, 203, 237, 63),
  ('16df1f1e-8398-4070-9d02-e5ea768c6b26', 'c5fb6620-a91f-4bd6-917d-c4d3d87e59b9', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 140, 237, 252, 25),
  ('6584ea3c-7609-4541-ad67-aaa27105f16c', 'c5fb6620-a91f-4bd6-917d-c4d3d87e59b9', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 139, 252, 269, 28),
  ('5ee537f1-165f-4dc2-a253-dfa74f58d43f', 'c5fb6620-a91f-4bd6-917d-c4d3d87e59b9', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 136, 269, 285, 23),
  ('ebc58b30-360f-4f33-bc2b-a58f18c57392', 'c5fb6620-a91f-4bd6-917d-c4d3d87e59b9', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 134, 285, 301, 25),
  ('da29668e-bb62-471b-a5a7-805c18308550', 'c5fb6620-a91f-4bd6-917d-c4d3d87e59b9', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 131, 301, 317, 30),
  ('a77500fd-6bb4-4bbf-8377-56b66d8dafd8', 'c5fb6620-a91f-4bd6-917d-c4d3d87e59b9', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 130, 317, 331, 28),
  ('b96637f8-5edb-429a-ac4f-46f98c5e8469', 'c5fb6620-a91f-4bd6-917d-c4d3d87e59b9', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 128, 331, 359, 42),
  ('4db6238a-29be-4206-bab5-3ec2d6c8c563', 'c5fb6620-a91f-4bd6-917d-c4d3d87e59b9', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 127, 359, 394, 68),
  ('d15795bc-f6c9-4037-9524-9c13c4055101', 'c5fb6620-a91f-4bd6-917d-c4d3d87e59b9', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 126, 394, 412, 31),
  ('cf849841-0349-4f3e-bfea-dd491f8b67c7', 'c5fb6620-a91f-4bd6-917d-c4d3d87e59b9', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 125, 412, 428, 24);
insert into readings (id, user_id, book_id, format, unit, total_units, current_position, status, started_on, finished_on, rating, moods) values ('71c5cbc1-7934-4c31-b2d0-ab6c84f85d36', '0ef9b6d1-cfba-4921-8850-e98390566181', '20d191bb-41f4-4fc7-b135-6bbb15681c00', 'paper', 'pages', 718, 718, 'finished', current_date - 230, current_date - 190, 4, array['conmovedor','relajante']::text[]);
insert into sessions (id, reading_id, user_id, read_on, start_pos, end_pos, minutes) values
  ('007f37c2-712e-4aab-983c-8570f2f6067b', '71c5cbc1-7934-4c31-b2d0-ab6c84f85d36', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 230, 0, 21, 40),
  ('f80ad34e-f521-466c-b1e2-6e9abc04ae18', '71c5cbc1-7934-4c31-b2d0-ab6c84f85d36', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 228, 21, 51, 48),
  ('0b414bf3-7643-4844-9eb8-cff42057046b', '71c5cbc1-7934-4c31-b2d0-ab6c84f85d36', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 224, 51, 81, 54),
  ('026b451f-556f-452a-b456-d241f04d484f', '71c5cbc1-7934-4c31-b2d0-ab6c84f85d36', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 223, 81, 99, 35),
  ('919d8755-7ce3-4aa1-bf59-efe58fcbe03f', '71c5cbc1-7934-4c31-b2d0-ab6c84f85d36', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 222, 99, 112, 19),
  ('296d77c8-effb-4639-98d7-f1daa921982f', '71c5cbc1-7934-4c31-b2d0-ab6c84f85d36', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 221, 112, 130, 29),
  ('0988c931-42e2-4dfb-b9d9-c08f6aca8514', '71c5cbc1-7934-4c31-b2d0-ab6c84f85d36', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 219, 130, 158, 55),
  ('89dbd046-8502-4d7e-bf77-d338bbd88d96', '71c5cbc1-7934-4c31-b2d0-ab6c84f85d36', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 218, 158, 183, 35),
  ('c25a7250-beb9-44e4-8863-66da9e55409d', '71c5cbc1-7934-4c31-b2d0-ab6c84f85d36', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 215, 183, 208, 37),
  ('e12745ba-6038-4798-8ef5-114e0d24da2b', '71c5cbc1-7934-4c31-b2d0-ab6c84f85d36', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 212, 208, 237, 48),
  ('4d9b0e34-b6ff-42aa-a199-696b44d25cb3', '71c5cbc1-7934-4c31-b2d0-ab6c84f85d36', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 211, 237, 263, 37),
  ('7da3cba1-bb50-45c3-8f93-54c09f0d82a8', '71c5cbc1-7934-4c31-b2d0-ab6c84f85d36', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 210, 263, 278, 27),
  ('3b30bdeb-f907-417a-810b-275b1831ff26', '71c5cbc1-7934-4c31-b2d0-ab6c84f85d36', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 209, 278, 294, 31),
  ('935b8d61-ea67-479f-9e20-6f9751a7557d', '71c5cbc1-7934-4c31-b2d0-ab6c84f85d36', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 208, 294, 321, 41),
  ('1b6f3e46-9aac-47d6-937a-c8104ab2fbb2', '71c5cbc1-7934-4c31-b2d0-ab6c84f85d36', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 207, 321, 334, 20),
  ('7e0c1cf0-1d02-4b0e-943e-e3be7bbc9965', '71c5cbc1-7934-4c31-b2d0-ab6c84f85d36', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 206, 334, 363, 57),
  ('23fa7e6d-5259-4335-af32-4c0cfbcada77', '71c5cbc1-7934-4c31-b2d0-ab6c84f85d36', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 205, 363, 390, 49),
  ('a8f88629-b20e-4224-a32e-bb4a6638211f', '71c5cbc1-7934-4c31-b2d0-ab6c84f85d36', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 204, 390, 413, 35),
  ('a4d96782-fd04-4d5f-b1cc-f0ca1de02e75', '71c5cbc1-7934-4c31-b2d0-ab6c84f85d36', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 203, 413, 438, 37),
  ('8d537dc5-334e-48e6-8ac5-aee03a124ea0', '71c5cbc1-7934-4c31-b2d0-ab6c84f85d36', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 202, 438, 460, 39),
  ('46b48e6a-3ab8-47d8-a480-7a594e82022b', '71c5cbc1-7934-4c31-b2d0-ab6c84f85d36', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 201, 460, 480, 28),
  ('58bb3d21-a32c-4036-a92a-0889a03126a7', '71c5cbc1-7934-4c31-b2d0-ab6c84f85d36', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 200, 480, 508, 53),
  ('05ad2f20-6886-41f7-b886-03262c8b430c', '71c5cbc1-7934-4c31-b2d0-ab6c84f85d36', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 199, 508, 530, 39),
  ('3afde72b-920f-4daf-875d-eac28d3a346a', '71c5cbc1-7934-4c31-b2d0-ab6c84f85d36', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 198, 530, 558, 52),
  ('56d18eac-3741-4cac-bef6-9fda1f85f41e', '71c5cbc1-7934-4c31-b2d0-ab6c84f85d36', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 197, 558, 575, 25),
  ('4d0e7dba-c2b7-4862-b601-f39ab8f6615e', '71c5cbc1-7934-4c31-b2d0-ab6c84f85d36', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 196, 575, 599, 38),
  ('be18c00e-16d7-4606-8517-16797a9203f3', '71c5cbc1-7934-4c31-b2d0-ab6c84f85d36', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 195, 599, 619, 37),
  ('eca8a86a-b72f-4433-bd6f-315cd9e61506', '71c5cbc1-7934-4c31-b2d0-ab6c84f85d36', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 194, 619, 638, 37),
  ('e3f01a25-cd37-40cb-8382-da9f31bfab4b', '71c5cbc1-7934-4c31-b2d0-ab6c84f85d36', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 193, 638, 653, 26),
  ('50ebe33d-214e-4e5c-bef3-08de7d799562', '71c5cbc1-7934-4c31-b2d0-ab6c84f85d36', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 192, 653, 676, 40),
  ('f063f85d-c132-463f-bd3c-8c0f97d148b9', '71c5cbc1-7934-4c31-b2d0-ab6c84f85d36', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 191, 676, 692, 30),
  ('de0b4342-3cdf-4fd8-aff7-e92eb17da2e3', '71c5cbc1-7934-4c31-b2d0-ab6c84f85d36', '0ef9b6d1-cfba-4921-8850-e98390566181', current_date - 190, 692, 718, 47);
insert into readings (id, user_id, book_id, format, unit, total_units, current_position, status, started_on, finished_on, rating, moods) values ('a1909cc5-3cb7-457d-807b-3b2eaad240fa', '0ef9b6d1-cfba-4921-8850-e98390566181', 'd48f1216-e50f-42d8-8636-b751729b8b29', 'paper', 'pages', 721, 0, 'want', null, null, null, array[]::text[]);
insert into readings (id, user_id, book_id, format, unit, total_units, current_position, status, started_on, finished_on, rating, moods) values ('f94ae4a0-a8bb-429c-be64-91e28df0e7ec', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', 'd66f22c0-2ee5-4df9-b281-3927fa4c3e0e', 'paper', 'pages', 590, 300, 'reading', current_date - 18, null, null, array[]::text[]);
insert into sessions (id, reading_id, user_id, read_on, start_pos, end_pos, minutes) values
  ('c669f947-c9f2-4802-86d3-560d3e2f2839', 'f94ae4a0-a8bb-429c-be64-91e28df0e7ec', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 18, 0, 20, 39),
  ('7d6aadcd-482f-4fb1-9ac8-363f6015aac6', 'f94ae4a0-a8bb-429c-be64-91e28df0e7ec', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 17, 20, 48, 54),
  ('1fbcb96a-d3e6-4e59-92ac-cf756c79666c', 'f94ae4a0-a8bb-429c-be64-91e28df0e7ec', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 16, 48, 73, 38),
  ('d04c26e1-cfc0-4fda-8f06-c7106fb91f79', 'f94ae4a0-a8bb-429c-be64-91e28df0e7ec', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 13, 73, 101, 51),
  ('d0e23007-b935-47a2-be31-face4583bc32', 'f94ae4a0-a8bb-429c-be64-91e28df0e7ec', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 11, 101, 115, 21),
  ('f6a8669f-8506-4cc6-93f0-c6a71d499f73', 'f94ae4a0-a8bb-429c-be64-91e28df0e7ec', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 10, 115, 145, 44),
  ('377b8fbe-0864-4862-bc2f-7f6809c282ac', 'f94ae4a0-a8bb-429c-be64-91e28df0e7ec', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 8, 145, 167, 43),
  ('d0119de0-af08-499b-98a6-eff00701e71e', 'f94ae4a0-a8bb-429c-be64-91e28df0e7ec', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 7, 167, 195, 55),
  ('333da181-73ea-401f-bc1d-f42128058b89', 'f94ae4a0-a8bb-429c-be64-91e28df0e7ec', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 6, 195, 215, 29),
  ('78f6d0db-2625-4c0b-9732-693359e376a6', 'f94ae4a0-a8bb-429c-be64-91e28df0e7ec', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 4, 215, 244, 42),
  ('e4f967fd-3db4-4233-a765-699aec116f38', 'f94ae4a0-a8bb-429c-be64-91e28df0e7ec', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 2, 244, 272, 44),
  ('cbf722a1-f606-4e4e-a54b-b6cd7f783d96', 'f94ae4a0-a8bb-429c-be64-91e28df0e7ec', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 1, 272, 300, 55);
insert into readings (id, user_id, book_id, format, unit, total_units, current_position, status, started_on, finished_on, rating, moods) values ('2219fb16-4c74-41ff-bb32-0232a404f411', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', '2fa65266-bc9a-4e1a-9e03-ff6d188a4a40', 'audio', 'minutes', 975, 520, 'reading', current_date - 12, null, null, array[]::text[]);
insert into sessions (id, reading_id, user_id, read_on, start_pos, end_pos, minutes) values
  ('ca6059bb-8ce8-4e88-a8bd-28bacd57ab38', '2219fb16-4c74-41ff-bb32-0232a404f411', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 12, 0, 55, 55),
  ('e17c8a25-aaef-484d-9822-7241f07c1ad6', '2219fb16-4c74-41ff-bb32-0232a404f411', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 11, 55, 98, 43),
  ('2c1e5dd8-25dc-435f-887e-739a20c15c59', '2219fb16-4c74-41ff-bb32-0232a404f411', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 10, 98, 141, 43),
  ('d48850af-409c-4ba3-98b6-e60b34374fd7', '2219fb16-4c74-41ff-bb32-0232a404f411', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 6, 141, 187, 46),
  ('8fc9867a-f18f-4941-ade2-a729bcd0c8d3', '2219fb16-4c74-41ff-bb32-0232a404f411', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 5, 187, 268, 81),
  ('4ef2bdfd-e549-41f2-a33e-f9346449950b', '2219fb16-4c74-41ff-bb32-0232a404f411', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 3, 268, 339, 71),
  ('84e5f492-7c81-4f16-af3b-564e2c2ec988', '2219fb16-4c74-41ff-bb32-0232a404f411', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 2, 339, 432, 93),
  ('cbcb958e-1702-48d6-a262-a77d4094d36b', '2219fb16-4c74-41ff-bb32-0232a404f411', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 1, 432, 520, 88);
insert into readings (id, user_id, book_id, format, unit, total_units, current_position, status, started_on, finished_on, rating, moods) values ('a232f40c-1886-4cea-8814-e2d631532ab4', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', '3d08954e-7d11-497d-b2a2-73e44a577f3d', 'paper', 'pages', 805, 805, 'finished', current_date - 95, current_date - 45, 4, array['emocionante','inspirador']::text[]);
insert into sessions (id, reading_id, user_id, read_on, start_pos, end_pos, minutes) values
  ('e51283db-045b-4764-ab42-811c2470e142', 'a232f40c-1886-4cea-8814-e2d631532ab4', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 95, 0, 22, 42),
  ('72d24dd5-383b-4bb9-b650-af3df60194d4', 'a232f40c-1886-4cea-8814-e2d631532ab4', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 94, 22, 40, 27),
  ('4254d97b-93d5-4b39-86f3-a3772eee6787', 'a232f40c-1886-4cea-8814-e2d631532ab4', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 93, 40, 57, 30),
  ('1233bf73-01cf-440a-9390-d2fcb2305f28', 'a232f40c-1886-4cea-8814-e2d631532ab4', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 92, 57, 87, 50),
  ('9dd4c514-c2ea-4130-aee4-b0f4a7c4f2fe', 'a232f40c-1886-4cea-8814-e2d631532ab4', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 91, 87, 117, 49),
  ('5c4dcf95-d2cf-4b26-81bf-42d1e8e73c8e', 'a232f40c-1886-4cea-8814-e2d631532ab4', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 90, 117, 143, 45),
  ('c53ae143-00e2-4ba3-9585-ae478cd3ea5e', 'a232f40c-1886-4cea-8814-e2d631532ab4', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 89, 143, 165, 41),
  ('ab748220-2b89-4518-8ecb-13c9c090f788', 'a232f40c-1886-4cea-8814-e2d631532ab4', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 88, 165, 195, 51),
  ('b002dc4a-ac12-40dd-972c-76e274482a2f', 'a232f40c-1886-4cea-8814-e2d631532ab4', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 87, 195, 224, 47),
  ('c88837f4-930e-4765-a772-47290ea7157e', 'a232f40c-1886-4cea-8814-e2d631532ab4', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 86, 224, 253, 49),
  ('272e07d4-667b-4e8a-97b9-c05349cc4ff7', 'a232f40c-1886-4cea-8814-e2d631532ab4', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 85, 253, 281, 43),
  ('49da38da-1fe7-4126-9982-a08c25d94f1c', 'a232f40c-1886-4cea-8814-e2d631532ab4', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 82, 281, 313, 58),
  ('fdef0da7-052f-4ae4-a98a-8d6efd5f0c20', 'a232f40c-1886-4cea-8814-e2d631532ab4', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 81, 313, 339, 48),
  ('1eb4963d-a333-4f05-9f24-2ae43059b3c6', 'a232f40c-1886-4cea-8814-e2d631532ab4', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 80, 339, 357, 28),
  ('c38b5faa-c35c-48f0-9f44-51165c13d99c', 'a232f40c-1886-4cea-8814-e2d631532ab4', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 79, 357, 384, 42),
  ('1c7a696d-0911-4ef4-a0b2-19a5c83721d7', 'a232f40c-1886-4cea-8814-e2d631532ab4', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 78, 384, 403, 34),
  ('ab737af8-0d22-4151-af5e-b46b8e35c817', 'a232f40c-1886-4cea-8814-e2d631532ab4', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 77, 403, 433, 52),
  ('45d5368f-8877-4264-919a-ad00359db016', 'a232f40c-1886-4cea-8814-e2d631532ab4', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 73, 433, 448, 29),
  ('6fc3b0e2-b458-45f9-b00d-88aca63000d2', 'a232f40c-1886-4cea-8814-e2d631532ab4', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 70, 448, 477, 50),
  ('5415adef-55ad-49f0-8138-b7059e1cc126', 'a232f40c-1886-4cea-8814-e2d631532ab4', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 66, 477, 503, 41),
  ('5109e56e-8511-416c-be86-a51689496bd7', 'a232f40c-1886-4cea-8814-e2d631532ab4', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 65, 503, 532, 51),
  ('32e72f95-db3b-4c2e-ae8a-e18ca5c88f02', 'a232f40c-1886-4cea-8814-e2d631532ab4', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 63, 532, 554, 38),
  ('d850fdc0-23aa-4131-ad4d-b8e142b65e25', 'a232f40c-1886-4cea-8814-e2d631532ab4', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 61, 554, 582, 50),
  ('b2f5d52b-d479-49fe-8e3b-666bba3ac5e5', 'a232f40c-1886-4cea-8814-e2d631532ab4', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 60, 582, 611, 51),
  ('0e37ffef-d9c9-4044-9f18-1376529fc919', 'a232f40c-1886-4cea-8814-e2d631532ab4', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 59, 611, 624, 19),
  ('559a3f56-a60d-4ef6-b147-0d7999135958', 'a232f40c-1886-4cea-8814-e2d631532ab4', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 57, 624, 641, 26),
  ('e25c4279-d988-4bbe-9e4d-0d6d02bb88c6', 'a232f40c-1886-4cea-8814-e2d631532ab4', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 55, 641, 657, 24),
  ('1ece74c5-a8b2-477a-9549-03b1d3980952', 'a232f40c-1886-4cea-8814-e2d631532ab4', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 54, 657, 670, 21),
  ('a9c37b87-5d62-4fbb-b4b6-75fa598d37ba', 'a232f40c-1886-4cea-8814-e2d631532ab4', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 51, 670, 694, 43),
  ('b89d2692-d709-4435-a2df-bc186a7f27ff', 'a232f40c-1886-4cea-8814-e2d631532ab4', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 50, 694, 723, 56),
  ('611a7c51-d4c3-4f40-aee4-0dd7eb7bd467', 'a232f40c-1886-4cea-8814-e2d631532ab4', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 48, 723, 748, 45),
  ('e306d383-1ede-430c-bfa5-860eb8d7f28a', 'a232f40c-1886-4cea-8814-e2d631532ab4', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 47, 748, 778, 49),
  ('c1c78e2d-20a6-4a6a-9cd7-b9d83927a661', 'a232f40c-1886-4cea-8814-e2d631532ab4', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 45, 778, 805, 43);
insert into readings (id, user_id, book_id, format, unit, total_units, current_position, status, started_on, finished_on, rating, moods) values ('08597b28-66cf-470c-8da7-84765d83f748', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', 'd635684c-420a-474f-9efd-c8f0c07a72ef', 'paper', 'pages', 311, 311, 'finished', current_date - 150, current_date - 128, 4.5, array['reflexivo','conmovedor']::text[]);
insert into sessions (id, reading_id, user_id, read_on, start_pos, end_pos, minutes) values
  ('4c5abf9a-cf2d-4c2c-8376-9c021458266f', '08597b28-66cf-470c-8da7-84765d83f748', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 150, 0, 26, 41),
  ('7ed6c6e0-0c93-42c3-a65d-3cc4db3e5518', '08597b28-66cf-470c-8da7-84765d83f748', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 149, 26, 46, 38),
  ('38763e11-4fa7-4ed3-b55f-4dc0842e03f4', '08597b28-66cf-470c-8da7-84765d83f748', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 145, 46, 74, 54),
  ('68d30894-e0be-422c-a409-25f28ac0d492', '08597b28-66cf-470c-8da7-84765d83f748', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 144, 74, 98, 44),
  ('51dc40e8-b9bf-449b-ba86-9e48b5c87bf5', '08597b28-66cf-470c-8da7-84765d83f748', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 142, 98, 112, 24),
  ('451fa6c3-2e53-4859-a8dc-9fafeb04f04f', '08597b28-66cf-470c-8da7-84765d83f748', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 141, 112, 135, 36),
  ('5eb21de7-27ff-4a16-a71f-7c4a80d7f461', '08597b28-66cf-470c-8da7-84765d83f748', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 140, 135, 160, 43),
  ('2200353f-fc48-4281-a1d9-08d622d76819', '08597b28-66cf-470c-8da7-84765d83f748', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 138, 160, 188, 52),
  ('b2c8b5af-edaa-4adb-b8bd-8835b19ddc97', '08597b28-66cf-470c-8da7-84765d83f748', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 136, 188, 210, 33),
  ('908ed5bc-4100-4b56-8859-f2eaeddba617', '08597b28-66cf-470c-8da7-84765d83f748', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 133, 210, 239, 55),
  ('a1c10993-9c34-4758-83bd-1a94396f189e', '08597b28-66cf-470c-8da7-84765d83f748', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 131, 239, 256, 31),
  ('fa204d24-5d5b-48c1-9672-34339315afc2', '08597b28-66cf-470c-8da7-84765d83f748', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 130, 256, 286, 52),
  ('62d5473c-7044-4c59-9b33-ab3466680e44', '08597b28-66cf-470c-8da7-84765d83f748', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 129, 286, 298, 24),
  ('c171814e-881b-44c4-8c26-caa3cc3163f1', '08597b28-66cf-470c-8da7-84765d83f748', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 128, 298, 311, 21);
insert into readings (id, user_id, book_id, format, unit, total_units, current_position, status, started_on, finished_on, rating, moods) values ('5c9faad8-b49a-4dd3-a7bd-9d41f4069277', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', '620252ab-b7fd-4705-8d32-9ba84959692e', 'paper', 'pages', 341, 118, 'abandoned', current_date - 70, null, null, array[]::text[]);
insert into sessions (id, reading_id, user_id, read_on, start_pos, end_pos, minutes) values
  ('2e19fdee-0a2f-4afe-8b79-befae15c5b34', '5c9faad8-b49a-4dd3-a7bd-9d41f4069277', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 70, 0, 9, 16),
  ('ed731692-bd65-42dd-98d6-42db45b19bfc', '5c9faad8-b49a-4dd3-a7bd-9d41f4069277', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 68, 9, 28, 33),
  ('bd4ab28f-d529-4c7d-8888-79fc6134279c', '5c9faad8-b49a-4dd3-a7bd-9d41f4069277', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 67, 28, 51, 38),
  ('468ab099-5864-49a1-8b16-c75b2e569e27', '5c9faad8-b49a-4dd3-a7bd-9d41f4069277', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 66, 51, 72, 30),
  ('881f571e-9e8f-403c-9e77-ce538d7e4bcb', '5c9faad8-b49a-4dd3-a7bd-9d41f4069277', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 65, 72, 90, 35),
  ('4885032a-f97b-4c77-9e28-8261ac874ad7', '5c9faad8-b49a-4dd3-a7bd-9d41f4069277', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 64, 90, 107, 30),
  ('43a6c93c-6bd6-441c-bf8d-9b63166dfdaa', '5c9faad8-b49a-4dd3-a7bd-9d41f4069277', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', current_date - 63, 107, 118, 22);
insert into readings (id, user_id, book_id, format, unit, total_units, current_position, status, started_on, finished_on, rating, moods) values ('ba82e745-b0fd-4ea0-86e2-b5e378316eda', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', '0535bacf-209d-4654-9769-16dec92b7326', 'paper', 'pages', 432, 0, 'want', null, null, null, array[]::text[]);
insert into notes (reading_id, user_id, kind, body, page, shared) values ('2a5dd163-3372-48b2-87c1-d338cc167d1c', '0ef9b6d1-cfba-4921-8850-e98390566181', 'quote', 'Los libros son espejos: sólo se ve en ellos lo que uno ya lleva dentro.', 120, true);
insert into notes (reading_id, user_id, kind, body, page, shared) values ('2a5dd163-3372-48b2-87c1-d338cc167d1c', '0ef9b6d1-cfba-4921-8850-e98390566181', 'quote', 'Cada libro tiene alma, el alma de quien lo escribió y el alma de quienes lo leyeron y vivieron y soñaron con él.', 330, true);
insert into notes (reading_id, user_id, kind, body, page, shared) values ('2a5dd163-3372-48b2-87c1-d338cc167d1c', '0ef9b6d1-cfba-4921-8850-e98390566181', 'note', 'Me apetece muchísimo pasear por el Barrio Gótico después de esto.', null, false);
insert into notes (reading_id, user_id, kind, body, page, shared) values ('f94ae4a0-a8bb-429c-be64-91e28df0e7ec', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', 'note', '¡No me esperaba lo del Cementerio de los Libros Olvidados!', 40, true);
insert into notes (reading_id, user_id, kind, body, page, shared) values ('db512234-3a10-44f9-b099-7b789ea1b7c2', '0ef9b6d1-cfba-4921-8850-e98390566181', 'note', 'Me ha dejado tocada. Tienes que leerlo.', null, true);
insert into notes (reading_id, user_id, kind, body, page, shared) values ('a232f40c-1886-4cea-8814-e2d631532ab4', '834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', 'quote', 'Es la pregunta, no la respuesta, lo que nos hace crecer.', 512, true);
insert into reactions (user_id, target_type, target_id, emoji) values ('834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', 'reading', 'db512234-3a10-44f9-b099-7b789ea1b7c2', '❤️');
insert into reactions (user_id, target_type, target_id, emoji) values ('834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', 'reading', '2be6989c-8156-4a27-8833-81cad8b80824', '❤️');
insert into reactions (user_id, target_type, target_id, emoji) values ('834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', 'session', '5e2cbc87-9bce-4de5-a3fc-4f61a18f469c', '❤️');
insert into reactions (user_id, target_type, target_id, emoji) values ('834328eb-f2f7-42bc-8e9c-c2f1ca5edb7e', 'session', 'dd383126-f3db-453e-9ef4-a43b0caba7cb', '❤️');
insert into reactions (user_id, target_type, target_id, emoji) values ('0ef9b6d1-cfba-4921-8850-e98390566181', 'reading', 'a232f40c-1886-4cea-8814-e2d631532ab4', '❤️');
insert into reactions (user_id, target_type, target_id, emoji) values ('0ef9b6d1-cfba-4921-8850-e98390566181', 'session', 'e4f967fd-3db4-4233-a765-699aec116f38', '❤️');
insert into reactions (user_id, target_type, target_id, emoji) values ('0ef9b6d1-cfba-4921-8850-e98390566181', 'session', 'cbf722a1-f606-4e4e-a54b-b6cd7f783d96', '❤️');

commit;
