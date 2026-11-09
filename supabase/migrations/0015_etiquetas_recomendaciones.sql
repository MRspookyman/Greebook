-- Etiquetas compartidas por pareja y recomendaciones de libros.
begin;

create table if not exists public.book_tags (
  book_id uuid not null references public.books(id) on delete cascade,
  tag text not null check (length(tag) between 1 and 30 and tag = btrim(tag)),
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (book_id, tag)
);
alter table public.book_tags enable row level security;
drop policy if exists book_tags_select on public.book_tags;
create policy book_tags_select on public.book_tags for select to authenticated
  using (created_by in (auth.uid(), public.my_partner()));
drop policy if exists book_tags_insert on public.book_tags;
create policy book_tags_insert on public.book_tags for insert to authenticated
  with check (created_by = auth.uid());
drop policy if exists book_tags_delete on public.book_tags;
create policy book_tags_delete on public.book_tags for delete to authenticated
  using (created_by in (auth.uid(), public.my_partner()));

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null default auth.uid() references public.profiles(id),
  to_user uuid not null references public.profiles(id),
  book_id uuid not null references public.books(id) on delete cascade,
  message text not null default '' check (length(message) <= 280),
  status text not null default 'new' check (status in ('new', 'added', 'dismissed')),
  created_at timestamptz not null default now(),
  check (from_user <> to_user)
);
create unique index if not exists recommendations_pending_book
  on public.recommendations (from_user, to_user, book_id) where status = 'new';
alter table public.recommendations enable row level security;
drop policy if exists recommendations_select on public.recommendations;
create policy recommendations_select on public.recommendations for select to authenticated
  using (auth.uid() in (from_user, to_user));
drop policy if exists recommendations_insert on public.recommendations;
create policy recommendations_insert on public.recommendations for insert to authenticated
  with check (from_user = auth.uid() and to_user = public.my_partner() and status = 'new');
drop policy if exists recommendations_update on public.recommendations;
create policy recommendations_update on public.recommendations for update to authenticated
  using (to_user = auth.uid()) with check (to_user = auth.uid());
drop policy if exists recommendations_delete on public.recommendations;
create policy recommendations_delete on public.recommendations for delete to authenticated
  using (from_user = auth.uid());

create or replace function public.guard_recommendation_update() returns trigger
language plpgsql set search_path = public as $$
begin
  if (to_jsonb(new) - 'status') is distinct from (to_jsonb(old) - 'status') then
    raise exception 'Solo se puede cambiar el estado de la recomendación' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists recommendations_guard_update on public.recommendations;
create trigger recommendations_guard_update before update on public.recommendations
  for each row execute function public.guard_recommendation_update();
drop trigger if exists recommendations_notify_partner on public.recommendations;
create trigger recommendations_notify_partner after insert on public.recommendations
  for each row execute function public.notify_partner_webhook();

grant select, insert, delete on public.book_tags to authenticated;
grant select, insert, update, delete on public.recommendations to authenticated;
commit;
