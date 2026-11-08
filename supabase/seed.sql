-- Ejecutar en el SQL editor DESPUÉS de crear los dos usuarios en
-- Authentication → Users → Add user (marca "Auto Confirm User").
-- Pega sus UUID abajo y ajusta los nombres.

with ids as (
  select
    '00000000-0000-0000-0000-00000000000a'::uuid as ella,  -- ✏️ UUID de ella
    '00000000-0000-0000-0000-00000000000b'::uuid as el     -- ✏️ UUID de él
)
insert into profiles (id, display_name, accent, partner_id, is_gift_recipient)
select ella, 'Laura', 'blue', el, true from ids        -- ✏️ nombre de ella
union all
select el, 'Javier', 'green', ella, false from ids;       -- ✏️ tu nombre
