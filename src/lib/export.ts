import { supabase } from '@/lib/supabase'
import { todayISO } from '@/lib/dates'
import type { Message, Note, Profile, ReadingWithBook, Session } from '@/lib/types'

interface ExportData {
  profile: Profile
  readings: ReadingWithBook[]
  sessions: Session[]
  notes: Note[]
  messages: Message[]
}

export class ExportFetchError extends Error {
  constructor() {
    super('No se pudieron cargar los datos para exportar')
    this.name = 'ExportFetchError'
  }
}

async function allRows<T>(
  query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query(from, from + 999)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) return rows
  }
}

function csvCell(value: string | number | null): string {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

function readingsCsv(readings: ReadingWithBook[]): string {
  const formats = { paper: 'Papel', audio: 'Audiolibro' }
  const statuses = { want: 'Quiero leer', reading: 'Leyendo', finished: 'Leído', abandoned: 'Abandonado' }
  const units = { pages: 'Páginas', minutes: 'Minutos' }
  const rows: (string | number | null)[][] = [
    [
      'Título',
      'Autores',
      'Formato',
      'Estado',
      'Inicio',
      'Fin',
      'Valoración',
      'Ánimos',
      'Páginas/minutos',
      'Unidad',
      'Posición actual',
    ],
    ...readings.map((reading) => [
      reading.book.title,
      reading.book.authors.join(', '),
      formats[reading.format],
      statuses[reading.status],
      reading.started_on,
      reading.finished_on,
      reading.rating,
      reading.moods.join(', '),
      reading.total_units,
      units[reading.unit],
      reading.current_position,
    ]),
  ]
  return '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
}

export async function exportGreenbook(userId: string): Promise<void> {
  const [profileResult, readings, sessions, notes, messages] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    allRows<ReadingWithBook>((from, to) =>
      supabase.from('readings').select('*, book:books(*)').eq('user_id', userId).order('id').range(from, to),
    ),
    allRows<Session>((from, to) =>
      supabase.from('sessions').select('*').eq('user_id', userId).order('id').range(from, to),
    ),
    allRows<Note>((from, to) => supabase.from('notes').select('*').eq('user_id', userId).order('id').range(from, to)),
    allRows<Message>((from, to) =>
      supabase
        .from('messages_visible')
        .select('*')
        .or(`from_user.eq.${userId},to_user.eq.${userId}`)
        .eq('locked', false)
        .order('id')
        .range(from, to),
    ),
  ]).catch(() => {
    throw new ExportFetchError()
  })
  if (profileResult.error) throw new ExportFetchError()
  const data: ExportData = { profile: profileResult.data as Profile, readings, sessions, notes, messages }
  const date = todayISO()
  const files = [
    new File([JSON.stringify(data, null, 2)], `greenbook-${date}.json`, { type: 'application/json;charset=utf-8' }),
    new File([readingsCsv(readings)], `greenbook-lecturas-${date}.csv`, { type: 'text/csv;charset=utf-8' }),
  ]
  try {
    if (navigator.share && navigator.canShare?.({ files })) {
      await navigator.share({ files })
      return
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return
    // Sharing may be blocked after fetching data; keep the files available as downloads.
  }
  for (const file of files) {
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    try {
      link.href = url
      link.download = file.name
      document.body.append(link)
      link.click()
    } finally {
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    }
  }
}
