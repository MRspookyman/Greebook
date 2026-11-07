import { useState } from 'react'
import { BottomSheet } from '@/components/BottomSheet'
import { toast } from '@/components/toast'
import { useMe } from '@/features/auth/me'
import { useInvites } from '@/lib/data'
import { InviteCard } from './InviteCard'
import { isInviteExpired, sendInvite } from './ratito'

export function RatitoSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { userId, profile, partner } = useMe()
  const invites = useInvites()
  const pending = invites.data?.find(
    (invite) => invite.from_user === userId && invite.status === 'pending' && !isInviteExpired(invite),
  )
  const [choice, setChoice] = useState<'now' | 'tonight' | 'time'>('now')
  const [time, setTime] = useState(profile.reminder_time.slice(0, 5))
  const [busy, setBusy] = useState(false)
  const reminder = new Date()
  const [reminderHours, reminderMinutes] = profile.reminder_time.split(':').map(Number)
  reminder.setHours(reminderHours, reminderMinutes, 0, 0)
  const reminderTomorrow = reminder.getTime() <= Date.now()
  async function send() {
    if (busy) return
    setBusy(true)
    try {
      let startsAt: string | null = null
      if (choice !== 'now') {
        const [hours, minutes] = (choice === 'tonight' ? profile.reminder_time : time).split(':').map(Number)
        const date = new Date()
        date.setHours(hours, minutes, 0, 0)
        if (date.getTime() <= Date.now()) date.setDate(date.getDate() + 1)
        startsAt = date.toISOString()
      }
      await sendInvite(startsAt)
      toast('Invitación enviada', 'Un ratito para los dos')
      onClose()
    } catch (error) {
      toast('No se pudo enviar', error instanceof Error ? error.message : 'Inténtalo de nuevo')
    } finally {
      setBusy(false)
    }
  }
  return (
    <BottomSheet open={open} onClose={onClose} title="Invitar a un ratito">
      {pending ? (
        <InviteCard invite={pending} />
      ) : (
        <form
          className="space-y-4 pt-2"
          onSubmit={(event) => {
            event.preventDefault()
            void send()
          }}
        >
          <p className="text-sm text-muted">
            Un rato de lectura con {partner?.display_name ?? 'tu pareja'}, cada uno con su libro.
          </p>
          <div className="space-y-2">
            {(
              [
                ['now', 'Ahora'],
                ['tonight', `${reminderTomorrow ? 'Mañana' : 'Esta noche'} · ${profile.reminder_time.slice(0, 5)}`],
                ['time', 'Elegir hora'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className="btn btn-outline w-full justify-start"
                aria-pressed={choice === value}
                onClick={() => setChoice(value)}
              >
                {choice === value ? '●' : '○'} {label}
              </button>
            ))}
          </div>
          {choice === 'time' && (
            <label className="block space-y-2">
              <span className="lbl">Hora · si ya ha pasado, mañana</span>
              <input
                className="input"
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                required
              />
            </label>
          )}
          <button className="btn btn-primary w-full" disabled={busy || !partner || invites.isPending}>
            {busy ? 'Enviando…' : 'Invitar'}
          </button>
        </form>
      )}
    </BottomSheet>
  )
}
