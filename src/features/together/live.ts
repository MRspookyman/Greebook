import { useEffect, useRef, useState } from 'react'
import { useMe } from '@/features/auth/me'
import { attachTogether, useActiveTimer } from '@/features/session/Timer'
import { qk, useReadTogether } from '@/lib/data'
import { queryClient } from '@/lib/queryClient'
import { supabase } from '@/lib/supabase'
import type { ReadTogether } from '@/lib/types'
import { toast } from '@/components/toast'

const OPEN_MS = 4 * 60 * 60 * 1000

/** Join your partner's reading: reuses the open «lectura a la vez» or creates it. */
export async function joinReading(): Promise<ReadTogether> {
  const { data, error } = await supabase.rpc('join_reading')
  if (error) throw error
  const row = (Array.isArray(data) ? data[0] : data) as ReadTogether
  queryClient.setQueryData<ReadTogether[]>(qk.readTogether(), (old = []) => [
    row,
    ...old.filter((r) => r.id !== row.id),
  ])
  return row
}

export async function saveTogetherNote(id: string, note: string): Promise<void> {
  const { error } = await supabase
    .from('read_together')
    .update({ note: note.trim() || null })
    .eq('id', id)
  if (error) throw error
  await queryClient.invalidateQueries({ queryKey: qk.readTogether() })
}

/** The open «lectura a la vez» of the two of you, if any. */
export function useOpenTogether(): ReadTogether | undefined {
  const { partner } = useMe()
  const rows = useReadTogether(!!partner).data ?? []
  return rows.find((row) => !row.ended_at && Date.now() - new Date(row.started_at).getTime() < OPEN_MS)
}

/** When your partner joins while your timer runs, your timer becomes part of the same «lectura a la vez». */
export function useAttachTogether(): void {
  const timer = useActiveTimer()
  const open = useOpenTogether()
  useEffect(() => {
    if (!timer || timer.togetherId || !open) return
    // Only a reading that started around this timer, not an old one left open.
    if (new Date(open.started_at).getTime() >= timer.startedAt - 5 * 60 * 1000) attachTogether(open.id)
  }, [timer, open])
}

interface Live {
  /** Partner's page as they move it, until a fresher one arrives from the database. */
  partnerPage: number | null
  /** Increments with every heartbeat received, to animate it. */
  received: number
  sendBeat: () => void
}

/**
 * Live side of reading together over a Realtime broadcast channel: each one's page and the «latido», a tap that
 * makes the other phone vibrate softly. Nothing is stored.
 */
export function useLiveTogether(togetherId: string | null | undefined, myPage: number): Live {
  const { userId, partner } = useMe()
  const [partnerPage, setPartnerPage] = useState<number | null>(null)
  const [received, setReceived] = useState(0)
  const channel = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const page = useRef(myPage)
  useEffect(() => {
    page.current = myPage
  }, [myPage])

  useEffect(() => {
    if (!togetherId) return
    const ch = supabase.channel(`juntos:${togetherId}`, { config: { private: true, broadcast: { self: false } } })
    const sendPage = () =>
      void ch.send({ type: 'broadcast', event: 'page', payload: { from: userId, page: page.current } })
    ch.on('broadcast', { event: 'page' }, ({ payload }) => {
      if (payload?.from !== userId && Number.isFinite(payload?.page)) setPartnerPage(Number(payload.page))
    })
    ch.on('broadcast', { event: 'hello' }, ({ payload }) => {
      if (payload?.from !== userId) sendPage()
    })
    ch.on('broadcast', { event: 'beat' }, ({ payload }) => {
      if (payload?.from === userId) return
      setReceived((n) => n + 1)
      navigator.vibrate?.([30, 60, 30])
      toast(`${partner?.display_name ?? 'Tu pareja'} te ha mandado un latido`)
    })
    ch.subscribe((status) => {
      if (status !== 'SUBSCRIBED') return
      sendPage()
      void ch.send({ type: 'broadcast', event: 'hello', payload: { from: userId } })
    })
    channel.current = ch
    return () => {
      channel.current = null
      void supabase.removeChannel(ch)
    }
  }, [togetherId, userId, partner?.display_name])

  useEffect(() => {
    void channel.current?.send({ type: 'broadcast', event: 'page', payload: { from: userId, page: myPage } })
  }, [myPage, userId])

  return {
    partnerPage,
    received,
    sendBeat: () => {
      navigator.vibrate?.(15)
      void channel.current?.send({ type: 'broadcast', event: 'beat', payload: { from: userId } })
    },
  }
}
