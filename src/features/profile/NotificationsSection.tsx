import { useEffect, useState } from 'react'
import { useMe } from '@/features/auth/me'
import { useUpdateProfile } from '@/lib/data'
import { toast } from '@/components/toast'
import { Switch } from '@/components/Switch'
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
    <section className="rule space-y-4 pt-5" aria-labelledby="notifications-title">
      <h2 id="notifications-title" className="eyebrow text-muted">
        Avisos
      </h2>
      <PushEnableButton />
      <Switch
        checked={profile.notify_reminder}
        disabled={update.isPending}
        onChange={(checked) => save({ notify_reminder: checked })}
      >
        Recibir recordatorio diario
      </Switch>
      {profile.notify_reminder && (
        <label className="rise flex items-center justify-between gap-3" htmlFor="reminder-time">
          <span className="text-sm text-muted">A las</span>
          <input
            id="reminder-time"
            aria-label="Hora del recordatorio"
            name="reminder-time"
            autoComplete="off"
            type="time"
            className="input w-auto min-w-32"
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
        </label>
      )}
      <Switch
        checked={profile.notify_partner}
        disabled={update.isPending}
        onChange={(checked) => save({ notify_partner: checked })}
      >
        <span className="block">Recibir avisos de {partner?.display_name ?? 'tu pareja'}</span>
        <span className="block text-xs text-muted">
          Cuando termina un libro, te deja una cita o te propone leer juntos. Valen para todos tus dispositivos con
          avisos activados.
        </span>
      </Switch>
    </section>
  )
}
