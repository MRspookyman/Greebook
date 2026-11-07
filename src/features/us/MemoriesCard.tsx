import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { CountUp } from '@/components/CountUp'
import { Cover } from '@/components/Cover'
import { useEntered } from '@/components/motion'
import { Stepper } from '@/components/Stepper'
import { useMe } from '@/features/auth/me'
import { useCoupleGoal } from '@/lib/data'
import { todayISO } from '@/lib/dates'
import type { CoupleGoal } from '@/lib/types'
import { formatDays } from '@/lib/units'
import { answerGoal, proposeGoal } from './goals'
import { EMOTIONS } from './messages'
import type { MonthMemories } from './memories'

const goalText = (goal: Pick<CoupleGoal, 'kind' | 'target'>) =>
  goal.kind === 'days'
    ? `${formatDays(goal.target)} leyendo los dos`
    : `${goal.target} ${goal.target === 1 ? 'ratito' : 'ratitos'} juntos`

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
      <p className="text-sm">¿Este mes, {goalText(goal)}?</p>
      <div className="flex gap-2">
        <button className="btn btn-outline" disabled={busy} onClick={() => void answer(true)}>
          Aceptar
        </button>
        <button className="btn btn-link" disabled={busy} onClick={() => void answer(false)}>
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

/** The month's shared purpose: both add to one count, so the bar is the couple's, not a race. */
export function CoupleGoalCard({
  summary,
  goalPendingAbove = false,
}: {
  summary: MonthMemories
  goalPendingAbove?: boolean
}) {
  const { userId } = useMe()
  const entered = useEntered()
  const goalQuery = useCoupleGoal(summary.month)
  const goal = goalQuery.data
  const [proposing, setProposing] = useState(false)
  const [kind, setKind] = useState<CoupleGoal['kind']>('ratitos')
  const [target, setTarget] = useState(4)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const current = summary.month === todayISO().slice(0, 7)
  const amount = goal?.kind === 'days' ? summary.daysTogether : summary.ratitos
  if (goal?.accepted_at) {
    const done = Math.min(amount, goal.target)
    const unit = goal.kind === 'days' ? (goal.target === 1 ? 'día' : 'días') : goal.target === 1 ? 'ratito' : 'ratitos'
    return (
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm">{amount >= goal.target ? '¡Lo habéis hecho juntos!' : goalText(goal)}</p>
          <p className="folio shrink-0">
            <CountUp value={done} /> <span className="text-muted">/ {goal.target}</span>{' '}
            <span className="text-xs text-muted">{unit}</span>
          </p>
        </div>
        <div
          className="h-[3px] overflow-hidden bg-rule"
          role="progressbar"
          aria-label="Propósito de los dos"
          aria-valuemin={0}
          aria-valuemax={goal.target}
          aria-valuenow={done}
        >
          <div
            className="h-full origin-left"
            style={{
              background: amount >= goal.target ? 'var(--amber)' : 'var(--accent)',
              transform: `scaleX(${entered ? Math.min(1, amount / goal.target) : 0})`,
              transition: 'transform var(--dur-fill) var(--ease)',
            }}
          />
        </div>
      </div>
    )
  }
  if (goal) {
    if (goal.proposed_by === userId)
      return <p className="text-sm text-muted">Propuesto: {goalText(goal)} · esperando a tu pareja</p>
    if (goalPendingAbove)
      return <p className="text-sm text-muted">Propuesto: {goalText(goal)} · puedes responder arriba</p>
    return <GoalProposal goal={goal} />
  }
  if (!current || goalQuery.isPending || goalQuery.isError) return null
  return proposing ? (
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
          className="input min-h-11 w-full"
          name="goalKind"
          autoComplete="off"
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
        editable
        editLabel="Escribir el objetivo"
      />
      <div className="flex gap-2">
        <button className="btn btn-outline" disabled={busy}>
          Proponer
        </button>
        <button className="btn btn-link" type="button" onClick={() => setProposing(false)}>
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
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-muted">Un propósito pequeño para este mes, de los dos.</p>
      <button className="btn btn-outline" onClick={() => setProposing(true)}>
        Proponer
      </button>
    </div>
  )
}

export function MemoriesCard({
  summary,
  goalPendingAbove = false,
  withGoal = true,
}: {
  summary: MonthMemories
  goalPendingAbove?: boolean
  /** The current month shows its goal in its own section. */
  withGoal?: boolean
}) {
  const [quoteIndex, setQuoteIndex] = useState(0)
  const quote = summary.quotes[quoteIndex % Math.max(1, summary.quotes.length)]
  return (
    <div className="space-y-4">
      {summary.books.length > 0 && (
        <div className="flex gap-3 overflow-x-auto py-1">
          {summary.books.map((book) => (
            <Cover key={book.id} book={book} width={48} />
          ))}
        </div>
      )}
      <p className="max-w-[22ch] font-serif text-[28px] leading-[1.12]">
        {formatDays(summary.daysTogether)} leyendo los dos.
        <span className="mt-2 block font-sans text-xs leading-normal text-muted">
          {summary.ratitos} {summary.ratitos === 1 ? 'ratito compartido' : 'ratitos compartidos'}
        </span>
      </p>
      {quote && (
        <div className="flex items-center gap-3">
          <blockquote
            key={quote.id}
            className="min-w-0 flex-1 py-1 font-serif text-xl italic text-accent [overflow-wrap:anywhere]"
            style={{ animation: 'gb-fade-up 360ms var(--ease) both' }}
          >
            «{quote.body ?? (quote.emotion ? EMOTIONS[quote.emotion].label : 'Un recuerdo vuestro')}»
          </blockquote>
          {summary.quotes.length > 1 && (
            <button
              className="icon-btn min-h-11 min-w-11"
              aria-label="Siguiente recuerdo"
              onClick={() => setQuoteIndex((index) => index + 1)}
            >
              <ArrowRight size={18} aria-hidden />
            </button>
          )}
        </div>
      )}
      {withGoal && <CoupleGoalCard summary={summary} goalPendingAbove={goalPendingAbove} />}
    </div>
  )
}
