import { useState } from 'react'
import { Cover } from '@/components/Cover'
import { Stepper } from '@/components/Stepper'
import { useMe } from '@/features/auth/me'
import { useCoupleGoal } from '@/lib/data'
import { todayISO } from '@/lib/dates'
import type { CoupleGoal } from '@/lib/types'
import { answerGoal, proposeGoal } from './goals'
import { EMOTIONS } from './messages'
import type { MonthMemories } from './memories'

export function GoalProposal({ goal }: { goal: CoupleGoal }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const answer = async (accept: boolean) => {
    setBusy(true)
    try {
      await answerGoal(goal, accept)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar la respuesta')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-2">
      <p className="text-sm">
        ¿Este mes, {goal.target} {goal.kind === 'days' ? 'días leyendo los dos' : 'ratitos juntos'}?
      </p>
      <div className="flex gap-2">
        <button className="btn btn-soft" disabled={busy} onClick={() => void answer(true)}>
          Aceptar
        </button>
        <button className="btn btn-ghost" disabled={busy} onClick={() => void answer(false)}>
          Ahora no
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

export function MemoriesCard({
  summary,
  goalPendingAbove = false,
}: {
  summary: MonthMemories
  goalPendingAbove?: boolean
}) {
  const { userId } = useMe()
  const goalQuery = useCoupleGoal(summary.month)
  const goal = goalQuery.data
  const [quoteIndex, setQuoteIndex] = useState(0)
  const [proposing, setProposing] = useState(false)
  const [kind, setKind] = useState<CoupleGoal['kind']>('ratitos')
  const [target, setTarget] = useState(4)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const quote = summary.quotes[quoteIndex % Math.max(1, summary.quotes.length)]
  const current = summary.month === todayISO().slice(0, 7)
  const amount = goal?.kind === 'days' ? summary.daysTogether : summary.ratitos
  return (
    <div className="space-y-3">
      {summary.books.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {summary.books.map((book) => (
            <Cover key={book.id} book={book} width={35} />
          ))}
        </div>
      )}
      <p className="text-sm">
        <strong>{summary.daysTogether}</strong> días leyendo los dos · <strong>{summary.ratitos}</strong> ratitos
        compartidos
      </p>
      {quote && (
        <div className="flex items-center gap-2 rounded-xl bg-soft px-3">
          <blockquote className="min-w-0 flex-1 py-3 text-sm italic">
            ❤️ {quote.body ?? (quote.emotion ? EMOTIONS[quote.emotion].label : 'Un recuerdo vuestro')}
          </blockquote>
          {summary.quotes.length > 1 && (
            <button
              className="icon-btn min-h-11 min-w-11"
              aria-label="Siguiente recuerdo"
              onClick={() => setQuoteIndex((index) => index + 1)}
            >
              →
            </button>
          )}
        </div>
      )}
      {goal &&
        (goal.accepted_at ? (
          <div className="space-y-2">
            <p className="text-sm">
              {amount >= goal.target ? '¡Lo habéis hecho juntos! 💚' : 'Vuestro pequeño propósito'} ·{' '}
              {Math.min(amount, goal.target)} / {goal.target} {goal.kind === 'days' ? 'días' : 'ratitos'}
            </p>
            <div
              className="h-2 overflow-hidden rounded-full bg-soft"
              role="progressbar"
              aria-label="Propósito de los dos"
              aria-valuemin={0}
              aria-valuemax={goal.target}
              aria-valuenow={Math.min(amount, goal.target)}
            >
              <div
                className="h-full rounded-full bg-accent"
                style={{
                  width: `${Math.min(100, (amount / goal.target) * 100)}%`,
                  transition: 'width 400ms var(--ease)',
                }}
              />
            </div>
          </div>
        ) : goal.proposed_by === userId ? (
          <p className="text-sm text-muted">
            Propuesto: {goal.target} {goal.kind === 'days' ? 'días leyendo los dos' : 'ratitos juntos'} · esperando a tu
            pareja
          </p>
        ) : goalPendingAbove ? (
          <p className="text-sm text-muted">
            Propuesto: {goal.target} {goal.kind === 'days' ? 'días leyendo los dos' : 'ratitos juntos'} · puedes
            responder arriba
          </p>
        ) : (
          <GoalProposal goal={goal} />
        ))}
      {current &&
        !goal &&
        !goalQuery.isPending &&
        !goalQuery.isError &&
        (proposing ? (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              setBusy(true)
              setError('')
              void proposeGoal(summary.month, kind, target)
                .then(() => setProposing(false))
                .catch((cause: unknown) => {
                  setError(cause instanceof Error ? cause.message : 'No se pudo enviar la propuesta')
                })
                .finally(() => setBusy(false))
            }}
          >
            <label className="lbl">
              Nuestro propósito
              <select
                className="min-h-11 w-full"
                value={kind}
                onChange={(event) => setKind(event.target.value as CoupleGoal['kind'])}
              >
                <option value="ratitos">Ratitos juntos</option>
                <option value="days">Días leyendo los dos</option>
              </select>
            </label>
            <Stepper
              value={target}
              onChange={setTarget}
              step={1}
              min={1}
              max={31}
              display={target}
              label="Cantidad del propósito"
            />
            <div className="flex gap-2">
              <button className="btn btn-soft" disabled={busy}>
                Proponer
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setProposing(false)}>
                Ahora no
              </button>
            </div>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
          </form>
        ) : (
          <button className="btn btn-ghost min-h-11" onClick={() => setProposing(true)}>
            Un pequeño propósito juntos
          </button>
        ))}
    </div>
  )
}
