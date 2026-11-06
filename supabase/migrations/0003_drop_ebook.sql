-- Greenbook v2: fuera el ebook. Formato = papel | audio; unidad = páginas | minutos.
-- Ejecutar completo en el SQL editor.

begin;

-- Lecturas en % → páginas. Con número de páginas en el libro se convierte la posición;
-- sin él se toma 100 páginas (1 % = 1 página) para conservar el progreso, editable en la ficha.
with conv as (
  select r.id, coalesce(b.page_count, 100) as pages
  from readings r join books b on b.id = r.book_id
  where r.unit = 'percent'
)
update sessions s
set start_pos = round(s.start_pos * conv.pages / 100.0),
    end_pos = greatest(round(s.end_pos * conv.pages / 100.0), round(s.start_pos * conv.pages / 100.0) + 1)
from conv
where s.reading_id = conv.id;

with conv as (
  select r.id, coalesce(b.page_count, 100) as pages
  from readings r join books b on b.id = r.book_id
  where r.unit = 'percent'
)
update readings r
set unit = 'pages',
    total_units = conv.pages,
    current_position = round(r.current_position * conv.pages / 100.0)
from conv
where r.id = conv.id;

update readings set format = 'paper' where format = 'ebook';

alter table readings drop constraint readings_format_check;
alter table readings add constraint readings_format_check check (format in ('paper','audio'));
alter table readings drop constraint readings_unit_check;
alter table readings add constraint readings_unit_check check (unit in ('pages','minutes'));

commit;
