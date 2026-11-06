import { useState } from 'react'
import { Cover } from '@/components/Cover'
import { useMe } from '@/features/auth/me'
import { todayISO } from '@/lib/dates'
import type { TogetherItemWithBook } from '@/lib/types'
import { answerTogether, startTogether } from './together'

export function TogetherCard({ item }: { item: TogetherItemWithBook }) {
  const { userId, partner } = useMe()
  const [choosing, setChoosing] = useState(false)
  const [date, setDate] = useState(todayISO())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar. Inténtalo otra vez.')
    } finally {
      setBusy(false)
    }
  }
  const mine = item.added_by === userId
  return (
    <article className="space-y-2">
      <div className="flex items-center gap-3">
        <Cover book={item.book} width={34} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {item.partner_answer === 'yes'
              ? `Los dos queréis leer «${item.book.title}»`
              : mine
                ? `Quieres leer «${item.book.title}» con ${partner?.display_name ?? 'tu pareja'}`
                : `${partner?.display_name ?? 'Tu pareja'} quiere leer contigo «${item.book.title}»`}
          </p>
          {item.reason && <p className="text-sm text-muted">{item.reason}</p>}
          <p className="text-xs text-muted">
            Añadido por {mine ? 'ti' : (partner?.display_name ?? 'tu pareja')} ·{' '}
            {item.partner_answer === 'yes'
              ? 'a los dos os apetece'
              : item.partner_answer === 'later'
                ? mine
                  ? `${partner?.display_name ?? 'Tu pareja'} prefiere otro día`
                  : 'prefieres otro día'
                : mine
                  ? `esperando a ${partner?.display_name ?? 'tu pareja'}`
                  : 'esperando tu respuesta'}
          </p>
        </div>
      </div>
      {!mine && item.partner_answer !== 'yes' && !item.start_on && (
        <div className="flex gap-2">
          <button
            className="btn btn-soft"
            disabled={busy}
            onClick={() => void run(() => answerTogether(item.id, 'yes'))}
          >
            Me apetece
          </button>
          {item.partner_answer !== 'later' && (
            <button
              className="btn btn-ghost"
              disabled={busy}
              onClick={() => void run(() => answerTogether(item.id, 'later'))}
            >
              Otro día
            </button>
          )}
        </div>
      )}
      {item.partner_answer === 'yes' && !item.start_on && (
        <div className="space-y-2">
          <p className="text-sm">¿Empezamos?</p>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn btn-soft"
              disabled={busy}
              onClick={() => void run(() => startTogether(item.id, todayISO()))}
            >
              Hoy
            </button>
            <button className="btn btn-ghost" onClick={() => setChoosing(!choosing)}>
              Elige fecha
            </button>
          </div>
          {choosing && (
            <div className="flex gap-2">
              <input
                className="min-h-11 min-w-0"
                type="date"
                aria-label="Fecha para empezar"
                min={todayISO()}
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
              <button
                className="btn btn-soft"
                disabled={busy || !date}
                onClick={() => void run(() => startTogether(item.id, date))}
              >
                Empezar
              </button>
            </div>
          )}
        </div>
      )}
      {item.start_on && (
        <p className="text-xs text-muted">
          {item.start_on > todayISO() ? 'Lo empezamos el' : 'Empezado el'} {item.start_on}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </article>
  )
}
