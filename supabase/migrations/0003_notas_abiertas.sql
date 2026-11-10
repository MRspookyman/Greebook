-- Dentro de un libro solo queda una cosa: la nota entre páginas, y la ven siempre los dos.
-- Ya no hay papeles doblados: la regla contesta «no» para cualquier nota, también para las cartas y
-- predicciones que se escribieron antes (se siguen viendo, como notas). Se puede ejecutar más de una vez.
create or replace function public.slip_locked(s public.slips, viewer uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select false
$$;
