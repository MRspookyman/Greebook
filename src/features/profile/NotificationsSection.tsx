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
    <section className="card space-y-4 p-5" aria-labelledby="notifications-title">
      <h2 id="notifications-title">Avisos</h2>
      <PushEnableButton />
      <p className="text-sm text-muted">
        Preferencias de tu cuenta. Solo recibirás estos avisos en los dispositivos donde los hayas activado.
      </p>
      <Switch
        checked={profile.notify_reminder}
        disabled={update.isPending}
        onChange={(checked) => save({ notify_reminder: checked })}
      >
        Recibir recordatorio diario
      </Switch>
      <label className="label" htmlFor="reminder-time">
        Hora del recordatorio
      </label>
      <input
        id="reminder-time"
        name="reminder-time"
        autoComplete="off"
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
      <Switch
        checked={profile.notify_partner}
        disabled={update.isPending}
        onChange={(checked) => save({ notify_partner: checked })}
      >
        <span className="block">Recibir avisos de {partner?.display_name ?? 'tu pareja'}</span>
        <span className="block text-xs text-muted">
          Toques, mensajes de la sala, recomendaciones, reacciones y cuando se pone a leer
        </span>
      </Switch>
    </section>
  )
}
