-- La portada de un libro puede ser también una foto hecha con el móvil: se guarda reducida dentro de la
-- propia fila (una imagen pequeña en base64), para que funcione sin conexión y sin almacenamiento aparte.
-- Se puede ejecutar más de una vez.
alter table public.books drop constraint if exists books_cover_url_check;
alter table public.books add constraint books_cover_url_check check (
  cover_url is null
  or cover_url ~ '^https://'
  or (cover_url ~ '^data:image/(jpeg|webp|png);base64,' and length(cover_url) <= 200000)
);
