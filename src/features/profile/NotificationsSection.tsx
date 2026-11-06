import { useEffect, useState } from 'react'
import { useMe } from '@/features/auth/me'
import { useUpdateProfile } from '@/lib/data'
import { toast } from '@/components/toast'
import { PushEnableButton } from './PushEnableButton'

export function NotificationsSection() {
  const { userId, profile, partner } = useMe()
  const update = useUpdateProfile(userId)
  const [time, setTime] = useState(profile.reminder_time.slice(0, 5))
  useEffect(() => {
    setTime(profile.reminder_time.slice(0, 5))
  }, [profile.reminder_time])
  if (!('PushManager' in window)) return null

  function save(patch: Parameters<typeof update.mutate>[0]) {
    update.mutate(patch, {
      onError: () => {
        setTime(profile.reminder_time.slice(0, 5))
        toast('No se pudieron guardar los avisos', 'Comprueba tu conexión e inténtalo de nuevo')
      },
    })
  }

  return (
    <section className="card space-y-4 p-5" aria-labelledby="notifications-title">
      <h2 id="notifications-title">Avisos</h2>
      <label className="flex min-h-11 items-center justify-between gap-4">
        <span>Recordatorio diario</span>
        <input
          type="checkbox"
          role="switch"
          className="h-11 w-11 accent-[var(--accent)]"
          checked={profile.notify_reminder}
          disabled={update.isPending}
          onChange={(event) => save({ notify_reminder: event.target.checked })}
        />
      </label>
      <label className="label" htmlFor="reminder-time">
        Hora del recordatorio
      </label>
      <input
        id="reminder-time"
        type="time"
        className="input"
        required
        value={time}
        disabled={update.isPending}
        onChange={(event) => setTime(event.target.value)}
        onBlur={(event) => {
          if (event.target.validity.valid && time !== profile.reminder_time.slice(0, 5))
            save({ reminder_time: `${time}:00` })
          else if (!event.target.validity.valid) setTime(profile.reminder_time.slice(0, 5))
        }}
      />
      <label className="flex min-h-11 items-center justify-between gap-4">
        <span>Avisos de {partner?.display_name ?? 'tu pareja'}</span>
        <input
          type="checkbox"
          role="switch"
          className="h-11 w-11 accent-[var(--accent)]"
          checked={profile.notify_partner}
          disabled={update.isPending}
          onChange={(event) => save({ notify_partner: event.target.checked })}
        />
      </label>
      <PushEnableButton />
    </section>
  )
}
