-- Greenbook 0019: opinión a ciegas.
-- Cuando los dos habéis terminado el mismo libro, cada uno escribe una frase sobre él. La de tu pareja no se puede
-- leer (tampoco desde la API) hasta que hayas escrito la tuya: entonces se destapan las dos.
-- Aplicar después de 0018. Después vuelve a desplegar `notify-partner` (avisa al escribirla).

begin;

create table if not exists public.book_opinions (
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  body text not null check (length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id)
);
alter table public.book_opinions enable row level security;

-- Whether you already wrote yours (security definer: a policy on the same table can't query it without recursion).
create or replace function public.wrote_opinion(p_book uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.book_opinions o where o.user_id = auth.uid() and o.book_id = p_book)
$$;
revoke all on function public.wrote_opinion(uuid) from public, anon;
grant execute on function public.wrote_opinion(uuid) to authenticated;

-- Books your partner has an opinion of, without its text: enough to say «ya ha escrito la suya».
create or replace function public.partner_opinion_books() returns setof uuid
language sql stable security definer set search_path = public as $$
  select o.book_id from public.book_opinions o where o.user_id = public.my_partner()
$$;
revoke all on function public.partner_opinion_books() from public, anon;
grant execute on function public.partner_opinion_books() to authenticated;

drop policy if exists book_opinions_select on public.book_opinions;
create policy book_opinions_select on public.book_opinions for select to authenticated
  using (user_id = auth.uid() or (user_id = public.my_partner() and public.wrote_opinion(book_id)));
drop policy if exists book_opinions_insert on public.book_opinions;
create policy book_opinions_insert on public.book_opinions for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.readings r
      where r.user_id = auth.uid() and r.book_id = book_opinions.book_id and r.status = 'finished'
    )
  );
drop policy if exists book_opinions_update on public.book_opinions;
create policy book_opinions_update on public.book_opinions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists book_opinions_delete on public.book_opinions;
create policy book_opinions_delete on public.book_opinions for delete to authenticated
  using (user_id = auth.uid());
grant select, insert, update, delete on public.book_opinions to authenticated;

create or replace function public.touch_book_opinion() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists book_opinions_touch on public.book_opinions;
create trigger book_opinions_touch before update on public.book_opinions
  for each row execute function public.touch_book_opinion();

-- «Gordita ha escrito su opinión» / «Ya podéis leer las dos».
drop trigger if exists book_opinions_notify_partner on public.book_opinions;
create trigger book_opinions_notify_partner after insert on public.book_opinions
  for each row execute function public.notify_partner_webhook();

do $$ begin
  alter publication supabase_realtime add table public.book_opinions;
exception when duplicate_object then null;
end $$;

commit;
