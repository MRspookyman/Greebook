import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'react-router'
import type { Surprise } from '@/config/surprises'
import { useMe } from '@/features/auth/me'
import { useReadings, useSessions } from '@/lib/data'
import { todayISO } from '@/lib/dates'
import { currentStreak } from '@/lib/stats/streak'
import { pendingSurprises, surpriseSeenKey } from '@/lib/surprises/evaluate'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/toast'

// A launch may reveal one surprise; additional pending messages wait for a reload.
const shownThisLaunch = new Set<string>()

function SurpriseModal({ surprise, onClose, busy }: { surprise: Surprise; onClose: () => void; busy: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    element?.querySelector<HTMLElement>('#surprise-title')?.focus()
    return () => element?.close()
  }, [])
  return (
    <dialog
      ref={dialog}
      aria-labelledby="surprise-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-bg p-6 text-ink pt-safe pb-safe"
    >
      <div
        className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-8 text-center"
        style={{ animation: 'gb-fade-up 400ms ease-out' }}
      >
        <span className="font-serif text-5xl text-green" aria-hidden="true">
          ♡
        </span>
        <h1 id="surprise-title" tabIndex={-1} className="[overflow-wrap:anywhere]">
          {surprise.title}
        </h1>
        <p className="whitespace-pre-line font-serif text-xl leading-relaxed [overflow-wrap:anywhere]">
          {surprise.message}
        </p>
        <button type="button" className="btn btn-primary" onClick={onClose} disabled={busy}>
          {busy ? 'Guardando…' : 'Cerrar'}
        </button>
      </div>
    </dialog>
  )
}

export function SurpriseHost() {
  const { userId, profile } = useMe()
  const { pathname } = useLocation()
  const readings = useReadings(userId)
  const sessions = useSessions(userId)
  const qc = useQueryClient()
  const [dismissed, setDismissed] = useState(false)
  const key = ['surprisesSeen', userId] as const
  const seen = useQuery({
    queryKey: key,
    enabled: profile.is_gift_recipient,
    queryFn: async () => {
      const keys: string[] = []
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
          .from('surprises_seen')
          .select('surprise_key')
          .eq('user_id', userId)
          .order('surprise_key')
          .range(from, from + 999)
        if (error) throw error
        keys.push(...data.map((row: { surprise_key: string }) => row.surprise_key))
        if (data.length < 1000) return keys
      }
    },
  })
  const today = todayISO()
  const close = useMutation({
    mutationFn: async (seenKey: string) => {
      const { error } = await supabase
        .from('surprises_seen')
        .upsert({ user_id: userId, surprise_key: seenKey }, { onConflict: 'user_id,surprise_key' })
      if (error) throw error
    },
    onMutate: async (seenKey) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<string[]>(key)
      qc.setQueryData<string[]>(key, (old = []) => [...new Set([...old, seenKey])])
      shownThisLaunch.add(userId)
      setDismissed(true)
      return { previous }
    },
    onError: (error, _seenKey, context) => {
      qc.setQueryData(key, context?.previous)
      shownThisLaunch.delete(userId)
      setDismissed(false)
      toast(
        'No se pudo guardar la sorpresa',
        error instanceof Error ? error.message : 'Inténtalo de nuevo cuando tengas conexión.',
      )
    },
  })
  if (
    !profile.is_gift_recipient ||
    !profile.onboarded_at ||
    pathname === '/bienvenida' ||
    dismissed ||
    shownThisLaunch.has(userId) ||
    !seen.isSuccess ||
    !readings.isSuccess ||
    !sessions.isSuccess
  )
    return null
  const finished = readings.data.filter((reading) => reading.status === 'finished')
  const surprise = pendingSurprises(
    {
      booksFinished: finished.length,
      currentStreak: currentStreak(new Set(sessions.data.map((session) => session.read_on)), today),
      finishedThisYear: finished.filter((reading) => reading.finished_on?.slice(0, 4) === today.slice(0, 4)).length,
      yearlyGoal: profile.yearly_goal,
    },
    today,
    new Set(seen.data),
  )[0]
  return surprise ? (
    <SurpriseModal
      surprise={surprise}
      busy={close.isPending}
      onClose={() => close.mutate(surpriseSeenKey(surprise, today))}
    />
  ) : null
}
