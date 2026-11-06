// Configura los avisos push en un proyecto de Supabase.
// Uso (tras `npx supabase login`): node scripts/configurar-avisos.mjs <project-ref>
// Lee los secretos de `secretos.local` (no versionado), los sube a Supabase, despliega
// las dos Edge Functions e imprime el SQL del cron y los datos de los webhooks.
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const ref = process.argv[2]
if (!ref || !/^[a-z0-9]{20}$/.test(ref)) {
  console.error('Uso: node scripts/configurar-avisos.mjs <project-ref>  (Project Settings → General → Reference ID)')
  process.exit(1)
}

const secrets = Object.fromEntries(
  readFileSync('secretos.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
)

const run = (cmd) => execSync(cmd, { stdio: 'inherit' })
run(`npx -y supabase@latest link --project-ref ${ref}`)
run('npx -y supabase@latest secrets set --env-file secretos.local')
run('npx -y supabase@latest functions deploy send-reminders --no-verify-jwt')
run('npx -y supabase@latest functions deploy notify-partner --no-verify-jwt')

const cron = readFileSync('supabase/migrations/0002_cron.sql', 'utf8')
  .replaceAll('<project-ref>', ref)
  .replaceAll('<CRON_SECRET>', secrets.CRON_SECRET)

console.log(`
──────────── 1) Pega esto en el SQL Editor de Supabase y pulsa Run ────────────
${cron}
──────────── 2) Database → Webhooks → Create (crea DOS) ────────────
  URL:       https://${ref}.supabase.co/functions/v1/notify-partner   (POST)
  Cabecera:  x-webhook-secret: ${secrets.WEBHOOK_SECRET}
  Webhook A: tabla readings,  evento Update
  Webhook B: tabla reactions, evento Insert
──────────── 3) Cloudflare Pages → variable VITE_VAPID_PUBLIC_KEY ────────────
  ${secrets.VAPID_PUBLIC_KEY}
`)
