import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { endOfMonth, startOfMonth, subDays, subMonths } from 'date-fns'
import { BottomSheet } from '@/components/BottomSheet'
import { Stepper } from '@/components/Stepper'
import { toast } from '@/components/toast'
import { useEntered } from '@/components/motion'
import { useMe } from '@/features/auth/me'
import { couplePair, monthOf, suggestedGoal } from '@/lib/club'
import { qk, useChallenge, useReadings, useSessions } from '@/lib/data'
import { fmt, fromISODate, todayISO, toISODate } from '@/lib/dates'
import { summarize } from '@/lib/stats/aggregate'
import { supabase } from '@/lib/supabase'
import type { Accent } from '@/lib/types'

const nf = new Intl.NumberFormat('es')

/** «Reto del mes»: a page goal we fill between the two of us. */
export function ChallengeCard() {
  const { userId, profile, partner } = useMe()
  const qc = useQueryClient()
  const entered = useEntered()
  const today = todayISO()
  const month = monthOf(today)
  const challenge = useChallenge(month, !!partner)
  const myReadings = useReadings(userId)
  const theirReadings = useReadings(partner?.id)
  const mySessions = useSessions(userId)
  const theirSessions = useSessions(partner?.id)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(0)
  const [busy, setBusy] = useState(false)
  if (!partner) return null

  const now = fromISODate(today)
  const monthRange = (date: Date) => ({ from: toISODate(startOfMonth(date)), to: toISODate(endOfMonth(date)) })
  const pagesOf = (date: Date) => {
    const range = monthRange(date)
    return [
      summarize(mySessions.data ?? [], myReadings.data ?? [], range).pages,
      summarize(theirSessions.data ?? [], theirReadings.data ?? [], range).pages,
    ] as const
  }
  const [mine, theirs] = pagesOf(now)
  const suggestion = suggestedGoal(
    [1, 2, 3].map((n) => {
      const [a, b] = pagesOf(subMonths(now, n))
      return a + b
    }),
  )
  const goal = challenge.data?.pages_goal
  const recentFrom = toISODate(subDays(now, 29))
  const hasRecentSessions = [...(mySessions.data ?? []), ...(theirSessions.data ?? [])].some(
    (session) => session.read_on >= recentFrom && session.read_on <= today,
  )
  if (!goal && !hasRecentSessions) return null
  const hasAverage = [1, 2, 3].some((n) => pagesOf(subMonths(now, n)).some((pages) => pages > 0))
  const total = mine + theirs
  const daysInMonth = endOfMonth(now).getDate()
  const daysLeft = daysInMonth - now.getDate()
  const expected = goal ? (goal * now.getDate()) / daysInMonth : 0
  const monthName = fmt(today, 'MMMM')

  async function save(pages: number) {
    if (busy) return
    setBusy(true)
    try {
      const { error } = await supabase.from('challenges').upsert(
        {
          ...couplePair(userId, partner!.id),
          month,
          pages_goal: pages,
          created_by: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_a,user_b,month' },
      )
      if (error) throw error
      await qc.invalidateQueries({ queryKey: qk.challenge(month) })
      setEditing(false)
    } catch {
      toast('No se pudo guardar el reto')
    } finally {
      setBusy(false)
    }
  }

  const segments: [number, Accent][] = [
    [mine, profile.accent],
    [theirs, partner.accent],
  ]
  return (
    <section className="card space-y-2.5" aria-label={`Reto de ${monthName}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-semibold">Reto de {monthName}</h2>
        <span className="text-[11px] text-muted">
          {daysLeft === 0 ? 'último día' : `quedan ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'}`}
        </span>
      </div>
      {challenge.isPending ? (
        <div className="h-16 animate-pulse rounded-xl bg-track" />
      ) : goal ? (
        <>
          <button
            className="flex items-baseline gap-1 text-left"
            onClick={() => {
              setDraft(goal)
              setEditing(true)
            }}
            aria-label={`${total} de ${goal} páginas juntos. Cambiar objetivo`}
          >
            <span className="num font-serif text-[22px] font-semibold">{nf.format(total)}</span>
            <span className="text-sm text-muted">/ {nf.format(goal)} páginas juntos</span>
          </button>
          <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-border" aria-hidden>
            {segments.map(([pages, accent], index) => (
              <span
                key={accent + index}
                className="h-full"
                style={{
                  width: entered ? `${Math.min(100, (pages / goal) * 100)}%` : 0,
                  background: `var(--${accent})`,
                  transition: `width 1.1s var(--ease) ${index * 120}ms`,
                }}
              />
            ))}
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 text-[11px] text-muted">
            <span>
              {profile.display_name} {nf.format(mine)} · {partner.display_name} {nf.format(theirs)}
            </span>
            <span className={total >= goal ? 'font-semibold text-green' : ''}>
              {total >= goal
                ? '¡Reto conseguido!'
                : total >= expected
                  ? 'Vais por delante del ritmo'
                  : `Os faltan ${nf.format(Math.ceil(expected - total))} para ir al día`}
            </span>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-3">
          <p className="flex-1 text-xs text-muted">
            Una meta de páginas que llenáis entre los dos.{' '}
            {hasAverage ? 'Según vuestra media, os proponemos' : 'Podéis empezar con'} {nf.format(suggestion)}.
          </p>
          <button
            className="btn btn-primary min-h-9 shrink-0 px-3 text-xs"
            disabled={busy}
            onClick={() => void save(suggestion)}
          >
            Aceptar reto
          </button>
        </div>
      )}
      <BottomSheet open={editing} onClose={() => setEditing(false)} title={`Reto de ${monthName}`}>
        <div className="space-y-4">
          <Stepper
            label="Páginas entre los dos"
            value={draft}
            onChange={setDraft}
            step={50}
            min={50}
            max={100000}
            display={nf.format(draft)}
            caption="páginas entre los dos"
          />
          <button className="btn btn-primary w-full" disabled={busy} onClick={() => void save(draft)}>
            Guardar reto
          </button>
        </div>
      </BottomSheet>
    </section>
  )
}
