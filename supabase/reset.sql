-- Greenbook: vaciar todos los datos antes del regalo.
-- Conserva las cuentas y los perfiles (nombres, colores, emparejamiento) y deja la bienvenida
-- sin ver para que ella vea la dedicatoria al entrar. Ejecutar completo en Supabase → SQL Editor.

begin;

delete from reactions;
delete from messages;
delete from message_pings;
delete from invites;
delete from together_items;
delete from couple_goals;
update profiles set reading_now_id = null, reading_now_since = null;
delete from notes;
delete from sessions;
delete from readings;
delete from books;
delete from surprises_seen;
delete from push_subscriptions;

update profiles set onboarded_at = null, last_reminded_on = null, yearly_goal = 12, theme = 'system';

commit;
