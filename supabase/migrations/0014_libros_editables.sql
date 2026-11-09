-- Greenbook · Metadatos y portadas del catálogo compartido de la pareja.
-- Ejecutar después de 0013 antes de desplegar BookMetadataEditor.
-- No cambia readings.total_units: corregir la ficha no cambia el progreso de nadie.
begin;

drop policy if exists books_update on public.books;
create policy books_update on public.books for update to authenticated
  using (created_by in (auth.uid(), public.my_partner()))
  with check (created_by in (auth.uid(), public.my_partner()));

-- Las portadas no son privadas. El cliente comprime a JPEG de hasta 1000 px.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('book-covers', 'book-covers', true, 2097152, array['image/jpeg'])
on conflict (id) do update set
  name = excluded.name,
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Validar el nombre sin convertir segmentos no fiables a UUID.
-- Cada objeto vive en <book UUID>/<timestamp>.jpg y pertenece al catálogo de la pareja.
create or replace function public.can_write_book_cover(object_name text) returns boolean
language sql stable set search_path = public as $$
  select auth.uid() is not null
    and object_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9]+\.jpg$'
    and exists (
      select 1 from public.books b
      where b.id::text = split_part(object_name, '/', 1)
        and b.created_by in (auth.uid(), public.my_partner())
    );
$$;
revoke all on function public.can_write_book_cover(text) from public, anon;
grant execute on function public.can_write_book_cover(text) to authenticated;

drop policy if exists book_covers_select on storage.objects;
create policy book_covers_select on storage.objects for select to anon, authenticated
  using (bucket_id = 'book-covers');
drop policy if exists book_covers_insert on storage.objects;
create policy book_covers_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'book-covers' and public.can_write_book_cover(name));
drop policy if exists book_covers_update on storage.objects;
create policy book_covers_update on storage.objects for update to authenticated
  using (bucket_id = 'book-covers' and public.can_write_book_cover(name))
  with check (bucket_id = 'book-covers' and public.can_write_book_cover(name));
drop policy if exists book_covers_delete on storage.objects;
create policy book_covers_delete on storage.objects for delete to authenticated
  using (bucket_id = 'book-covers' and public.can_write_book_cover(name));

commit;
