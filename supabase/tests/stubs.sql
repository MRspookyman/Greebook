-- Lo mínimo de Supabase que el esquema necesita para poder probarse en un Postgres pelado:
-- los roles, auth.users, auth.uid() y el esquema realtime.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create schema realtime;
create table realtime.messages (id bigserial primary key, topic text, extension text);
alter table realtime.messages enable row level security;
create function realtime.topic() returns text language sql stable as $$
  select nullif(current_setting('realtime.topic', true), '')
$$;

grant usage on schema public, auth, realtime to anon, authenticated, service_role;
grant all on realtime.messages to authenticated;
grant usage on sequence realtime.messages_id_seq to authenticated;
-- Supabase da por defecto todos los permisos sobre «public»; por eso el esquema revoca lo que no toca.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

-- Un Greenbook anterior, para comprobar que la migración conserva nombres y pareja.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'laura@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'javier@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'intruso@example.com');

create table public.profiles (
  id uuid primary key, display_name text, accent text, partner_id uuid, timezone text
);
insert into public.profiles values
  ('00000000-0000-0000-0000-00000000000a', 'Laura', 'blue', '00000000-0000-0000-0000-00000000000b', 'Europe/Madrid'),
  ('00000000-0000-0000-0000-00000000000b', 'Javier', 'green', '00000000-0000-0000-0000-00000000000a', 'Europe/Madrid');
create table public.quotes (id uuid primary key, body text);
create function public.quote_locked(q public.quotes) returns boolean language sql as $$ select true $$;
