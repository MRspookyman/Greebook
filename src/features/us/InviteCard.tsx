import { useState } from 'react'
import { Link } from 'react-router'
import { Coffee } from 'lucide-react'
import { useMe } from '@/features/auth/me'
import { useReadings } from '@/lib/data'
import type { Invite } from '@/lib/types'
import { startTimer } from '@/features/session/Timer'
import { toast } from '@/components/toast'
import { cancelInvite, inviteLabel, isInviteExpired, respondInvite } from './ratito'

export function InviteCard({ invite, compact = false }: { invite: Invite; compact?: boolean }) {
  const { userId, partner } = useMe()
  const readings = useReadings(userId)
  const [busy, setBusy] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const mine = invite.from_user === userId
  const reading = readings.data
    ?.filter((item) => item.status === 'reading')
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]
  if (isInviteExpired(invite) || invite.status === 'declined') return null

  async function act(answer: 'accepted' | 'declined' | 'cancel') {
    setBusy(true)
    try {
      if (answer === 'cancel') await cancelInvite(invite.id)
      else {
        await respondInvite(invite.id, answer)
        if (answer === 'accepted' && !invite.starts_at && reading) startTimer(reading)
      }
    } catch (error) {
      toast('No se pudo actualizar el ratito', error instanceof Error ? error.message : 'Inténtalo de nuevo')
    } finally {
      setBusy(false)
    }
  }

  return (
    <article
      id={`m-${invite.id}`}
      className={compact ? 'flex flex-wrap items-center gap-2 scroll-mt-5' : 'rule space-y-3 py-4 scroll-mt-5'}
    >
      <p className={compact ? 'min-w-40 flex-1 text-xs' : 'text-sm'}>
        <Coffee className="mr-1 inline text-muted" size={16} aria-hidden />{' '}
        {mine
          ? invite.status === 'accepted'
            ? `${partner?.display_name ?? 'Tu pareja'} se apunta`
            : `Has invitado a ${partner?.display_name ?? 'tu pareja'} a un ratito`
          : invite.status === 'accepted'
            ? 'Os habéis apuntado a un ratito'
            : `${partner?.display_name ?? 'Tu pareja'} te invita a un ratito`}{' '}
        · {inviteLabel(invite)}
      </p>
      {invite.status === 'pending' ? (
        mine ? (
          confirmCancel ? (
            <div className="space-y-1">
              <p className="text-sm">¿Cancelar la invitación?</p>
              <div className="flex gap-2">
                <button className="btn btn-ghost" disabled={busy} onClick={() => void act('cancel')}>
                  Sí, cancelar
                </button>
                <button className="btn btn-outline" disabled={busy} onClick={() => setConfirmCancel(false)}>
                  No, mantener
                </button>
              </div>
            </div>
          ) : (
            <button className="btn btn-ghost" disabled={busy} onClick={() => setConfirmCancel(true)}>
              Cancelar invitación
            </button>
          )
        ) : (
          <div className="flex gap-2">
            <button
              className={`btn ${compact ? 'btn-link px-3 text-xs' : 'btn-outline'} flex-1 whitespace-nowrap`}
              disabled={busy}
              onClick={() => void act('accepted')}
            >
              Me apunto
            </button>
            <button
              className={`btn btn-ghost flex-1 whitespace-nowrap ${compact ? 'px-3 text-xs' : ''}`}
              disabled={busy}
              onClick={() => void act('declined')}
            >
              Otro rato
            </button>
          </div>
        )
      ) : reading ? (
        <button
          className={`btn ${compact ? 'btn-link px-3 text-xs' : 'btn-outline w-full'}`}
          onClick={() => {
            if (startTimer(reading)) toast('Tu ratito ha empezado', reading.book.title)
          }}
        >
          Empezar
        </button>
      ) : (
        <Link className="btn btn-soft w-full" to="/biblioteca">
          Elige qué leer
        </Link>
      )}
      {!mine && invite.status === 'pending' && !invite.starts_at && !reading && (
        <p className="text-xs text-muted">Podrás elegir tu lectura en Biblioteca.</p>
      )}
    </article>
  )
}
