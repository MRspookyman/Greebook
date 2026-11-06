import { useState } from 'react'
import { Link } from 'react-router'
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
      className={compact ? 'flex flex-wrap items-center gap-2 scroll-mt-5' : 'card space-y-3 scroll-mt-5'}
    >
      <p className={compact ? 'min-w-40 flex-1 text-xs' : 'text-sm'}>
        ☕{' '}
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
          <button className="btn btn-ghost w-full" disabled={busy} onClick={() => void act('cancel')}>
            Cancelar
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              className={`btn btn-primary flex-1 whitespace-nowrap ${compact ? 'px-3 text-xs' : ''}`}
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
          className={`btn btn-primary ${compact ? 'px-3 text-xs' : 'w-full'}`}
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
