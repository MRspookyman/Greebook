import { useEffect, useRef, useState } from 'react'
import { BottomSheet } from '@/components/BottomSheet'
import { toast } from '@/components/toast'
import { useMe } from '@/features/auth/me'
import { useReadings } from '@/lib/data'
import type { Emotion, ReadingWithBook } from '@/lib/types'
import { EMOTIONS, sendMessage } from './messages'

type TracePrefill = { body?: string; page?: number | null }

export function TraceComposer({
  reading: initial,
  onClose,
  prefill,
  onDirtyChange,
}: {
  reading?: ReadingWithBook
  onClose: () => void
  prefill?: TracePrefill
  onDirtyChange?: (dirty: boolean) => void
}) {
  const { userId, partner } = useMe()
  const readings = useReadings(userId)
  const choices = [...(readings.data ?? [])].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  const [selected, setSelected] = useState<string | null>(initial?.id ?? null)
  const reading = selected ? (choices.find((item) => item.id === selected) ?? initial) : (initial ?? choices[0])
  const [emotion, setEmotion] = useState<Emotion | null>(null)
  const [body, setBody] = useState(prefill?.body ?? '')
  const [page, setPage] = useState<{ id: string; value: string } | null>(
    initial && prefill?.page !== undefined ? { id: initial.id, value: String(prefill.page ?? '') } : null,
  )
  const position =
    page?.id === reading?.id ? (page?.value ?? '') : reading?.unit === 'pages' ? String(reading.current_position) : ''
  const [busy, setBusy] = useState(false)
  const [pageError, setPageError] = useState('')
  const pageRef = useRef<HTMLInputElement>(null)
  const dirty =
    !!emotion ||
    !!body.trim() ||
    (page !== null &&
      page.value !== String(prefill?.page ?? (reading?.unit === 'pages' ? reading.current_position : '')))
  useEffect(() => {
    onDirtyChange?.(dirty)
    return () => onDirtyChange?.(false)
  }, [dirty, onDirtyChange])
  async function send() {
    if (busy || (!emotion && !body.trim())) return
    if (
      position !== '' &&
      (!/^\d+$/.test(position) ||
        !Number.isSafeInteger(Number(position)) ||
        (reading?.unit === 'pages' && Number(position) > reading.total_units))
    ) {
      setPageError(`Escribe una página entre 0 y ${reading?.total_units ?? 'el final del libro'}`)
      pageRef.current?.focus()
      return
    }
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
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void send()
      }}
    >
      {readings.isPending && !initial && (
        <p role="status" className="text-sm text-muted">
          Cargando libros…
        </p>
      )}
      {readings.isError && !initial && (
        <p role="alert" className="text-sm text-danger">
          No se pudieron cargar los libros. Vuelve a abrir la huella cuando tengas conexión.
        </p>
      )}
      <h2 className="font-serif text-xl">¿Le dejas algo a {partner?.display_name ?? 'tu pareja'}?</h2>
      <label className="block space-y-1">
        <span className="lbl">Libro</span>
        <select
          className="input"
          name="trace-book"
          autoComplete="off"
          value={reading?.id ?? ''}
          onChange={(event) => {
            setSelected(event.target.value)
            setPage(null)
            setPageError('')
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
        name="trace-body"
        autoComplete="off"
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
            ref={pageRef}
            name="trace-page"
            autoComplete="off"
            inputMode="numeric"
            aria-invalid={!!pageError}
            aria-describedby={pageError ? 'trace-page-error' : undefined}
            type="number"
            min={0}
            max={reading.total_units}
            step={1}
            value={position}
            onChange={(event) => {
              setPage({ id: reading.id, value: event.target.value })
              setPageError('')
            }}
          />
        </label>
      )}
      {pageError && (
        <p id="trace-page-error" role="alert" className="text-sm text-danger">
          {pageError}
        </p>
      )}
      {!emotion && !body.trim() && (
        <p className="text-sm text-muted" id="trace-required">
          Elige una emoción o escribe algo
        </p>
      )}
      {!partner && <p className="text-sm text-muted">Necesitas tener una pareja vinculada para dejar una huella.</p>}
      <button
        className="btn btn-primary w-full"
        disabled={busy || !partner || (!emotion && !body.trim())}
        aria-describedby={!emotion && !body.trim() ? 'trace-required' : undefined}
      >
        {busy ? 'Enviando…' : 'Dejar huella'}
      </button>
    </form>
  )
}

export function TraceSheet({
  open,
  onClose,
  reading,
  prefill,
}: {
  open: boolean
  onClose: () => void
  reading?: ReadingWithBook
  prefill?: TracePrefill
}) {
  const [dirty, setDirty] = useState(false)
  return (
    <BottomSheet open={open} onClose={onClose} title="Dejar huella" dirty={dirty}>
      {open && <TraceComposer reading={reading} prefill={prefill} onClose={onClose} onDirtyChange={setDirty} />}
    </BottomSheet>
  )
}
