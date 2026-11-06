-- Los avisos a la pareja nunca deben impedir guardar: si la llamada a la Edge Function no se
-- puede encolar (URL mal configurada, pg_net caído…), se registra un aviso y la escritura sigue.
-- Sustituye <project-ref> (o usa el SQL que genera `node scripts/configurar-avisos.mjs`).

create or replace function public.notify_partner_webhook() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  begin
    perform net.http_post(
      url := 'https://<project-ref>.supabase.co/functions/v1/notify-partner',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'greenbook_webhook_secret')
      ),
      body := jsonb_build_object(
        'type', tg_op,
        'table', tg_table_name,
        'schema', tg_table_schema,
        'record', to_jsonb(new),
        'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) end
      ),
      timeout_milliseconds := 5000
    );
  exception when others then
    raise warning 'notify_partner_webhook: %', sqlerrm;
  end;
  return new;
end $$;

revoke all on function public.notify_partner_webhook() from public, anon, authenticated;
