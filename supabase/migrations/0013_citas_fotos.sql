-- Greenbook · Fotos privadas en Citas y edición de respuestas propias.
-- Ejecutar completo después de 0012. Idempotente; no elimina citas ni respuestas.
-- Desplegar también notify-partner para reconocer las citas que solo contienen una foto.
begin;

alter table public.quotes add column if not exists photo_path text;
alter table public.quotes alter column body drop not null;
alter table public.quotes drop constraint if exists quotes_body_check;
alter table public.quotes add constraint quotes_body_check
  check (body is null or length(body) between 1 and 2000);
alter table public.quotes drop constraint if exists quotes_content_check;
alter table public.quotes add constraint quotes_content_check
  check (body is not null or photo_path is not null);
alter table public.quotes drop constraint if exists quotes_photo_path_check;
alter table public.quotes add constraint quotes_photo_path_check
  check (photo_path is null or photo_path in (
    user_id::text || '/' || id::text || '.jpg',
    user_id::text || '/' || id::text || '.webp'
  ));

-- Añadir al final conserva los nombres, tipos y orden de las columnas de 0008.
-- La vista sigue siendo del propietario: RLS directo solo permite leer citas propias.
create or replace view public.quotes_visible as
select
  q.id, q.user_id, q.book_id, q.page, q.kind, q.shared, q.safe, q.opened_early, q.seen_at, q.created_at,
  l.locked,
  case when l.locked then null else q.body end as body,
  case when l.locked then null else q.comment end as comment,
  case when l.locked then null else q.photo_path end as photo_path
from public.quotes q
cross join lateral (select public.quote_locked(q) as locked) l
where q.user_id = auth.uid() or (q.shared and q.user_id = public.my_partner());
revoke all on public.quotes_visible from public, anon;
grant select on public.quotes_visible to authenticated;

-- 0011 sigue controlando la lectura de respuestas con quote_replies_visible.
-- Editar/borrar no permite apropiarse de una respuesta ni moverla a una cita cerrada.
drop policy if exists quote_replies_update on public.quote_replies;
create policy quote_replies_update on public.quote_replies for update to authenticated
  using (user_id = auth.uid() and public.quote_replies_visible(quote_id))
  with check (user_id = auth.uid() and public.quote_replies_visible(quote_id));
drop policy if exists quote_replies_delete on public.quote_replies;
create policy quote_replies_delete on public.quote_replies for delete to authenticated
  using (user_id = auth.uid());

-- Subir primero a <user UUID>/<quote UUID>.jpg (o .webp), luego guardar photo_path.
-- El autor puede previsualizar y limpiar una subida incluso antes de crear la cita.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('quote-photos', 'quote-photos', false, 2097152, array['image/jpeg', 'image/webp'])
on conflict (id) do update set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- No convertir segmentos arbitrarios a UUID: los nombres inválidos devuelven false.
-- SECURITY DEFINER evita que RLS (solo SELECT propio) oculte la cita de la pareja.
create or replace function public.can_view_quote_photo(object_name text) returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null or object_name is null or object_name !~
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|webp)$' then
    return false;
  end if;
  if split_part(object_name, '/', 1) = auth.uid()::text then
    return true;
  end if;
  return exists (
    select 1 from public.quotes q
    where q.photo_path = object_name
      and q.id::text = split_part(split_part(object_name, '/', 2), '.', 1)
      and q.user_id::text = split_part(object_name, '/', 1)
      and q.user_id = public.my_partner()
      and q.shared
      and not public.quote_locked(q)
  );
end $$;
revoke all on function public.can_view_quote_photo(text) from public, anon;
grant execute on function public.can_view_quote_photo(text) to authenticated;

drop policy if exists quote_photos_select on storage.objects;
create policy quote_photos_select on storage.objects for select to authenticated
  using (bucket_id = 'quote-photos' and public.can_view_quote_photo(name));
drop policy if exists quote_photos_insert on storage.objects;
create policy quote_photos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'quote-photos'
    and split_part(name, '/', 1) = auth.uid()::text
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|webp)$'
  );
drop policy if exists quote_photos_update on storage.objects;
create policy quote_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'quote-photos' and split_part(name, '/', 1) = auth.uid()::text)
  with check (
    bucket_id = 'quote-photos'
    and split_part(name, '/', 1) = auth.uid()::text
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|webp)$'
  );
drop policy if exists quote_photos_delete on storage.objects;
create policy quote_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'quote-photos' and split_part(name, '/', 1) = auth.uid()::text);

-- quotes_notify_partner y quotes_ping no operan sobre body; to_jsonb(new) admite null.
-- Se conservan sin cambios, junto con las reglas de bloqueo y respuestas de 0008/0011.
commit;
