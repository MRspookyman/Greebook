-- Motivo opcional al dejar un libro y conversión atómica de unidades desde Editar lectura.
begin;

alter table public.readings add column if not exists abandon_reason text;
alter table public.readings drop constraint if exists readings_abandon_reason_check;
alter table public.readings add constraint readings_abandon_reason_check
  check (abandon_reason is null or char_length(abandon_reason) <= 60);

-- Invoker conserva RLS. Bloquear la lectura también serializa inserciones de sesiones por su FK.
-- Se convierten primero las sesiones y después la lectura, dentro de una sola transacción.
create or replace function public.edit_reading_units(
  p_reading_id uuid, p_expected_updated_at timestamptz,
  p_format text, p_unit text, p_total integer,
  p_started_on date, p_finished_on date, p_finished_precision text,
  p_drop_count integer
) returns void language plpgsql security invoker set search_path = public as $$
declare
  r public.readings%rowtype;
  dropped integer;
  greatest_position integer;
begin
  select * into r from public.readings where id = p_reading_id and user_id = auth.uid() for update;
  if not found then raise exception 'Lectura no disponible'; end if;
  if r.updated_at is distinct from p_expected_updated_at then
    raise exception 'La lectura ha cambiado. Vuelve a abrir el editor.';
  end if;
  if p_format not in ('paper', 'ebook') or p_unit not in ('pages', 'percent')
    or (p_format = 'paper' and p_unit <> 'pages') or p_total is null or p_total <= 0
    or (p_unit = 'percent' and p_total <> 100) then
    raise exception 'Formato o unidades no válidos';
  end if;
  perform 1 from public.sessions where reading_id = r.id for update;
  if p_unit <> r.unit then
    select count(*) into dropped from public.sessions
    where reading_id = r.id and round(end_pos::numeric * p_total / r.total_units)
      <= round(start_pos::numeric * p_total / r.total_units);
    if dropped is distinct from p_drop_count then
      raise exception 'Las sesiones han cambiado. Revisa la conversión de nuevo.';
    end if;
    delete from public.sessions where reading_id = r.id
      and round(end_pos::numeric * p_total / r.total_units) <= round(start_pos::numeric * p_total / r.total_units);
    update public.sessions set
      start_pos = round(start_pos::numeric * p_total / r.total_units),
      end_pos = round(end_pos::numeric * p_total / r.total_units)
    where reading_id = r.id;
  else
    select greatest(r.current_position, coalesce(max(end_pos), 0)) into greatest_position
      from public.sessions where reading_id = r.id;
    if p_total < greatest_position then raise exception 'El total no puede ser menor que el progreso registrado'; end if;
  end if;
  update public.readings set format = p_format, unit = p_unit, total_units = p_total,
    current_position = case when p_unit <> r.unit then round(r.current_position::numeric * p_total / r.total_units) else r.current_position end,
    started_on = p_started_on, finished_on = p_finished_on, finished_precision = p_finished_precision
  where id = r.id and user_id = auth.uid();
end;
$$;
revoke all on function public.edit_reading_units(uuid,timestamptz,text,text,integer,date,date,text,integer) from public, anon;
grant execute on function public.edit_reading_units(uuid,timestamptz,text,text,integer,date,date,text,integer) to authenticated;

commit;
