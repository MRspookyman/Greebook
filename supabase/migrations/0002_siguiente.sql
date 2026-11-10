-- «El siguiente»: el libro de la pila que cada uno piensa leer después. Se guarda en su marcapáginas
-- para que viaje entre móviles y lo vea la pareja. Se puede ejecutar más de una vez.
alter table public.readings add column if not exists next_at timestamptz;
