-- Avisos de pareja: en lugar de crear «Database Webhooks» a mano, dos triggers llaman a la
-- Edge Function notify-partner con el mismo formato ({type, table, schema, record, old_record}).
-- Sustituye <project-ref> y <WEBHOOK_SECRET> (o usa `node scripts/configurar-avisos.mjs`, que lo imprime relleno).
-- Ejecutar una vez en el SQL editor (como propietario del proyecto).

create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

select vault.create_secret(
  '<WEBHOOK_SECRET>',
  'greenbook_webhook_secret',
  'Cabecera x-webhook-secret de la Edge Function notify-partner'
);

create or replace function public.notify_partner_webhook() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
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
  return new;
end $$;

revoke all on function public.notify_partner_webhook() from public, anon, authenticated;

-- Solo cuando una lectura pasa a «terminada»; la función vuelve a comprobarlo.
create trigger readings_notify_partner
  after update of status on readings
  for each row when (old.status is distinct from new.status and new.status = 'finished')
  execute function public.notify_partner_webhook();

create trigger reactions_notify_partner
  after insert on reactions
  for each row execute function public.notify_partner_webhook();
