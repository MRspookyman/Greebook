// Configura los avisos push en un proyecto de Supabase.
// Uso (tras `npx supabase login`): node scripts/configurar-avisos.mjs <project-ref>
// Lee los secretos de `secretos.local` (no versionado), los sube a Supabase, despliega
// las dos Edge Functions y genera «avisos-sql.local» (cron + avisos de pareja) para el SQL editor.
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

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
// --project-ref on each command avoids `supabase link` (which prompts for the DB password);
// --use-api bundles the functions on Supabase's side, so Docker isn't needed;
// --yes confirms the changes up front (running this script is the confirmation).
run(`npx -y supabase@latest secrets set --project-ref ${ref} --env-file secretos.local --yes`)
run(`npx -y supabase@latest functions deploy send-reminders --project-ref ${ref} --no-verify-jwt --use-api --yes`)
run(`npx -y supabase@latest functions deploy notify-partner --project-ref ${ref} --no-verify-jwt --use-api --yes`)

const fill = (file) =>
  readFileSync(file, 'utf8')
    .replaceAll('<project-ref>', ref)
    .replaceAll('<CRON_SECRET>', secrets.CRON_SECRET)
    .replaceAll('<WEBHOOK_SECRET>', secrets.WEBHOOK_SECRET)

// Contains secrets: written to a git-ignored file (*.local), never committed.
const out = 'avisos-sql.local'
writeFileSync(
  out,
  `${fill('supabase/migrations/0002_cron.sql')}\n\n${fill('supabase/migrations/0004_partner_notifications.sql')}\n`,
)

console.log(`
Listo. Último paso: abre «${out}», copia todo, pégalo en Supabase → SQL Editor y pulsa Run.
(Programa el recordatorio cada 15 min y activa los avisos de pareja.)
`)
