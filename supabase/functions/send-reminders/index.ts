/* Deploy:
 * 1. Set VAPID secrets as documented in ../_shared/push.ts.
 * 2. Generate a random CRON_SECRET, then `supabase secrets set CRON_SECRET=...`.
 * 3. `supabase functions deploy send-reminders --no-verify-jwt`
 *    Gateway JWT verification must be off: this endpoint checks its own Bearer secret.
 * 4. Replace the two placeholders in migrations/0002_cron.sql and apply it once.
 *    It stores the secret in Vault and schedules this endpoint every 15 minutes.
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendToUser } from '../_shared/push.ts'

// UTC arithmetic is only over local ISO dates, never over timezone-offset instants.
function currentStreak(dates: Set<string>, today: string): number {
  const day = new Date(`${today}T00:00:00Z`)
  if (!dates.has(today)) day.setUTCDate(day.getUTCDate() - 1)
  let count = 0
  while (dates.has(day.toISOString().slice(0, 10))) {
    count++
    day.setUTCDate(day.getUTCDate() - 1)
  }
  return count
}

Deno.serve(async (request: Request) => {
  const secret = Deno.env.get('CRON_SECRET')
  if (!secret || request.headers.get('Authorization') !== `Bearer ${secret}`)
    return new Response('Unauthorized', { status: 401 })
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: profiles, error } = await admin
      .from('profiles')
      .select('id, timezone, reminder_time, last_reminded_on')
      .eq('notify_reminder', true)
    if (error) throw error
    const now = new Date()
    let sent = 0
    const failures: unknown[] = []
    for (const profile of profiles ?? []) {
      try {
        const parts = new Intl.DateTimeFormat('en-GB', {
          timeZone: profile.timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hourCycle: 'h23',
        }).formatToParts(now)
        const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
        const today = `${values.year}-${values.month}-${values.day}`
        const time = `${values.hour}:${values.minute}:${values.second}`
        if (profile.last_reminded_on === today || time < profile.reminder_time) continue
        const dates = new Set<string>()
        for (let from = 0; ; from += 1000) {
          const { data: sessions, error: sessionsError } = await admin
            .from('sessions')
            .select('read_on')
            .eq('user_id', profile.id)
            .lte('read_on', today)
            .order('read_on', { ascending: false })
            .order('id')
            .range(from, from + 999)
          if (sessionsError) throw sessionsError
          for (const session of sessions ?? []) dates.add(session.read_on)
          if (!sessions || sessions.length < 1000 || dates.has(today)) break
        }
        if (dates.has(today)) continue
        const streak = currentStreak(dates, today)
        const devices = await sendToUser(admin, profile.id, {
          title: '📖 ¿Un ratito de lectura hoy?',
          body: streak ? `Tu racha es de ${streak} ${streak === 1 ? 'día' : 'días'}` : 'Empieza una racha nueva',
          url: '/',
        })
        // No device subscribed yet: keep today's reminder pending for when one is.
        if (devices === 0) continue
        const { error: updateError } = await admin
          .from('profiles')
          .update({ last_reminded_on: today })
          .eq('id', profile.id)
        if (updateError) throw updateError
        sent++
      } catch (error) {
        failures.push(error)
        console.error('Reminder failed', profile.id, error)
      }
    }
    return Response.json({ sent, failed: failures.length }, { status: failures.length ? 500 : 200 })
  } catch (error) {
    console.error('send-reminders failed', error)
    return Response.json({ error: 'No se pudieron enviar los recordatorios' }, { status: 500 })
  }
})
