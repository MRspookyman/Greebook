-- Avisos: conservar libros, lectura en vivo, citas y «leer juntos».
-- Idempotente; no elimina tablas ni datos. Aplicar después de 0011.
begin;

drop trigger if exists messages_notify_partner on public.messages;
drop trigger if exists invites_notify_partner on public.invites;
drop trigger if exists couple_goals_notify_partner on public.couple_goals;
drop trigger if exists reactions_notify_partner on public.reactions;
drop trigger if exists notes_notify_partner on public.notes;

-- Estas tablas ya desaparecieron en 0007; retirar los avisos si aún existen.
do $$
begin
  if to_regclass('public.nudges') is not null then
    execute 'drop trigger if exists nudges_notify_partner on public.nudges';
  end if;
  if to_regclass('public.recommendations') is not null then
    execute 'drop trigger if exists recommendations_notify_partner on public.recommendations';
  end if;
end;
$$;

-- El recuento de ráfagas de citas filtra por autor, libro y los últimos 30 minutos.
create index if not exists quotes_shared_burst
  on public.quotes (user_id, book_id, created_at desc) where shared;

commit;
