-- ¡PELIGRO! NUNCA en producción después de entregar el regalo.
-- Borra datos reales y suscripciones push, y reinicia la bienvenida.
-- Solo para preparar el regalo o un entorno de pruebas.
--
-- Greenbook: vaciar todos los datos antes del regalo.
-- Conserva las cuentas y los perfiles (nombres, colores, emparejamiento) y reinicia la
-- configuración de bienvenida. Ejecutar completo en Supabase → SQL Editor.

begin;

delete from reactions;
delete from quote_replies;
delete from quotes;
delete from messages;
delete from message_pings;
delete from invites;
delete from together_items;
delete from couple_goals;
update profiles set reading_now_id = null, reading_now_since = null;
delete from notes;
delete from sessions;
delete from read_together;
delete from readings;
delete from books;
delete from push_subscriptions;

update profiles set onboarded_at = null, last_reminded_on = null, live_notified_on = null, yearly_goal = 12, theme = 'system';

commit;
