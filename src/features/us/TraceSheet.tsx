import { useState } from 'react'
import { BottomSheet } from '@/components/BottomSheet'
import { toast } from '@/components/toast'
import { useMe } from '@/features/auth/me'
import { useReadings } from '@/lib/data'
import type { Emotion, ReadingWithBook } from '@/lib/types'
import { EMOTIONS, sendMessage } from './messages'

export function TraceComposer({
  reading: initial,
  onClose,
  savedLabel,
}: {
  reading?: ReadingWithBook
  onClose: () => void
  savedLabel?: string
}) {
  const { userId, partner } = useMe()
  const readings = useReadings(userId)
  const choices = [...(readings.data ?? [])].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  const [selected, setSelected] = useState<string | null>(initial?.id ?? null)
  const reading = selected ? (choices.find((item) => item.id === selected) ?? initial) : (initial ?? choices[0])
  const [emotion, setEmotion] = useState<Emotion | null>(null)
  const [body, setBody] = useState('')
  const [page, setPage] = useState<{ id: string; value: string } | null>(null)
  const position =
    page?.id === reading?.id ? (page?.value ?? '') : reading?.unit === 'pages' ? String(reading.current_position) : ''
  const [busy, setBusy] = useState(false)
  async function send() {
    if (busy || (!emotion && !body.trim())) return
    setBusy(true)
    try {
      await sendMessage({
        kind: 'trace',
        bookId: reading?.book_id,
        page: position === '' ? null : Number(position),
        emotion,
        body: body.trim() || null,
      })
      toast('Le has dejado algo')
      onClose()
    } catch (error) {
      toast('No se pudo dejar la huella', error instanceof Error ? error.message : 'Inténtalo de nuevo')
    } finally {
      setBusy(false)
    }
  }
  return (
    <form
      className="space-y-4 pt-2"
      onSubmit={(event) => {
        event.preventDefault()
        void send()
      }}
    >
      {savedLabel && <p className="font-semibold text-accent">✓ {savedLabel}</p>}
      <h2 className="font-serif text-xl">¿Le dejas algo a {partner?.display_name ?? 'tu pareja'}?</h2>
      <label className="block space-y-1">
        <span className="lbl">Libro</span>
        <select
          className="input"
          value={reading?.id ?? ''}
          onChange={(event) => {
            setSelected(event.target.value)
            setPage(null)
          }}
        >
          {!reading && <option value="">Sin libro</option>}
          {initial && !choices.some((item) => item.id === initial.id) && (
            <option value={initial.id}>{initial.book.title}</option>
          )}
          {choices.map((item) => (
            <option value={item.id} key={item.id}>
              {item.book.title}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-2" aria-label="Cómo te ha hecho sentir">
        {(Object.entries(EMOTIONS) as [Emotion, { emoji: string; label: string }][]).map(([value, item]) => (
          <button
            key={value}
            type="button"
            className="chip min-h-11 px-3"
            aria-pressed={emotion === value}
            onClick={() => setEmotion(emotion === value ? null : value)}
          >
            {item.emoji} {item.label}
          </button>
        ))}
      </div>
      <textarea
        className="input min-h-24"
        aria-label="Frase o cita opcional"
        placeholder="Una frase, una cita… (opcional)"
        maxLength={5000}
        value={body}
        onChange={(event) => setBody(event.target.value)}
      />
      {reading?.unit === 'pages' && (
        <label className="flex items-center gap-3">
          <span className="lbl">Página</span>
          <input
            className="input"
            type="number"
            min={0}
            max={reading.total_units}
            step={1}
            value={position}
            onChange={(event) => setPage({ id: reading.id, value: event.target.value })}
          />
        </label>
      )}
      <button className="btn btn-primary w-full" disabled={busy || !partner || (!emotion && !body.trim())}>
        {busy ? 'Enviando…' : savedLabel ? 'Enviar' : 'Dejar'}
      </button>
      {savedLabel && (
        <button type="button" className="btn btn-ghost w-full" onClick={onClose}>
          Solo guardar
        </button>
      )}
    </form>
  )
}

export function TraceSheet({
  open,
  onClose,
  reading,
}: {
  open: boolean
  onClose: () => void
  reading?: ReadingWithBook
}) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      {open && <TraceComposer reading={reading} onClose={onClose} />}
    </BottomSheet>
  )
}
