-- Greenbook: vaciar todos los datos antes del regalo.
-- Conserva las cuentas y los perfiles (nombres, colores, emparejamiento) y deja la bienvenida
-- sin ver para que ella vea la dedicatoria al entrar. Ejecutar completo en Supabase → SQL Editor.

begin;

delete from reactions;
delete from nudges;
delete from recommendations;
delete from challenges;
update profiles set reading_now_id = null, reading_now_since = null;
delete from notes;
delete from sessions;
delete from readings;
delete from books;
delete from surprises_seen;
delete from push_subscriptions;

update profiles set onboarded_at = null, last_reminded_on = null, last_seen_us_at = null, last_live_notified_on = null, yearly_goal = 12, theme = 'system';

commit;
