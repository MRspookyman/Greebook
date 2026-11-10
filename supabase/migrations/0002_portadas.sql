-- Greenbook · portadas subidas desde el móvil.
--
-- No borra nada. Se puede ejecutar las veces que haga falta.
-- Vuelve a dar permiso para guardar fotos de portada en el bucket «book-covers»: cada uno sube a su
-- propia carpeta (<su id>/…) y las imágenes se sirven por su dirección pública, como cualquier portada.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('book-covers', 'book-covers', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists book_covers_select on storage.objects;
drop policy if exists book_covers_insert on storage.objects;
drop policy if exists book_covers_delete on storage.objects;

-- Ver la lista de portadas: solo la pareja (la imagen en sí es pública por su dirección).
create policy book_covers_select on storage.objects for select to authenticated
  using (bucket_id = 'book-covers'
    and (storage.foldername(name))[1] in (auth.uid()::text, public.my_partner()::text));

-- Subir: solo quien tiene perfil, y solo a su carpeta.
create policy book_covers_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'book-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.profiles p where p.id = auth.uid()));

create policy book_covers_delete on storage.objects for delete to authenticated
  using (bucket_id = 'book-covers' and (storage.foldername(name))[1] = auth.uid()::text);
