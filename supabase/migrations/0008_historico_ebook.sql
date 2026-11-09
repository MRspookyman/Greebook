-- Greenbook: histórico de libros y Kindle. Aplicar manualmente en el SQL editor después de 0007_rincon.sql.
begin;

alter table public.readings add column if not exists finished_precision text;
alter table public.readings drop constraint if exists readings_finished_precision_check;
alter table public.readings add constraint readings_finished_precision_check
  check (finished_precision in ('year', 'month', 'day'));
update public.readings set finished_precision = 'day'
where finished_on is not null and finished_precision is null;
alter table public.readings add column if not exists backfilled boolean not null default false;

-- La política propia ya existe desde 0001; recrearla permite reaplicar este archivo.
drop policy if exists readings_delete on public.readings;
create policy readings_delete on public.readings for delete to authenticated
  using (user_id = auth.uid());

-- Los destinos polimórficos no tienen FK. Definer permite limpiar también reacciones de la pareja.
-- Desde 0007 solo se crean reacciones a mensajes; esto también cubre datos anteriores.
create or replace function public.cleanup_reading_reactions() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.reactions where target_type = 'reading' and target_id = old.id;
  return old;
end;
$$;
revoke all on function public.cleanup_reading_reactions() from public, anon, authenticated;
drop trigger if exists readings_cleanup_reactions on public.readings;
create trigger readings_cleanup_reactions after delete on public.readings
  for each row execute function public.cleanup_reading_reactions();

create or replace function public.cleanup_session_reactions() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.reactions where target_type = 'session' and target_id = old.id;
  return old;
end;
$$;
revoke all on function public.cleanup_session_reactions() from public, anon, authenticated;
drop trigger if exists sessions_cleanup_reactions on public.sessions;
create trigger sessions_cleanup_reactions after delete on public.sessions
  for each row execute function public.cleanup_session_reactions();

-- sessions y notes ya tienen ON DELETE CASCADE; profiles.reading_now_id tiene SET NULL.
-- messages/huellas, together_items y couple_goals no referencian lecturas ni sesiones:
-- los mensajes y la lista compartida se vinculan al libro y se conservan.
alter table public.readings drop constraint if exists readings_format_check;
alter table public.readings drop constraint if exists readings_unit_check;

-- El redondeo puede colapsar sesiones cortas: borrarlas antes de actualizar para respetar end > start.
delete from public.sessions s using public.readings r
where s.reading_id = r.id and r.format = 'audio'
  and least(100, greatest(0, round(s.end_pos * 100.0 / r.total_units)))
      <= least(100, greatest(0, round(s.start_pos * 100.0 / r.total_units)));
update public.sessions s
set start_pos = least(100, greatest(0, round(s.start_pos * 100.0 / r.total_units))),
    end_pos = least(100, greatest(0, round(s.end_pos * 100.0 / r.total_units)))
from public.readings r
where s.reading_id = r.id and r.format = 'audio';

update public.readings
set format = 'ebook', unit = 'percent',
    current_position = least(100, greatest(0, round(current_position * 100.0 / total_units))),
    total_units = 100
where format = 'audio';
alter table public.readings add constraint readings_format_check check (format in ('paper', 'ebook'));
alter table public.readings add constraint readings_unit_check check (unit in ('pages', 'percent'));

commit;
