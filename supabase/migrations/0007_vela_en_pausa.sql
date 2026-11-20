-- Greenbook · la vela en pausa.
--
-- Una velada se puede pausar y retomar. Mientras está en pausa la vela sigue «encendida» (la velada no se ha
-- cerrado), pero la llama no arde y el tiempo no corre. Al retomar, la app adelanta `candle_lit_at` lo que
-- duró la pausa, así que el tiempo leído sigue saliendo de restar dos fechas.
-- Se puede ejecutar más de una vez, y la app anterior la ignora.

alter table public.profiles add column if not exists candle_paused_at timestamptz;
