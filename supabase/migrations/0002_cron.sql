-- Deployment: replace BOTH <project-ref> and <CRON_SECRET> before running.
-- <CRON_SECRET> must match the send-reminders Edge Function secret.
-- Generate a long random secret; never commit its real value to the repository.
-- Deploy send-reminders with --no-verify-jwt; it checks this Bearer secret itself.
-- Run this migration once in the Supabase SQL editor (as the project owner).
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

-- Vault encrypts the secret at rest. Only the privileged cron job reads it.
select vault.create_secret(
  '<CRON_SECRET>',
  'greenbook_cron_secret',
  'Bearer secret for the Greenbook send-reminders Edge Function'
);

select cron.schedule(
  'greenbook-send-reminders',
  '*/15 * * * *',
  $job$
    select net.http_post(
      url := 'https://<project-ref>.supabase.co/functions/v1/send-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'greenbook_cron_secret'
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 10000
    );
  $job$
);
