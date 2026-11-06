import { supabase } from '@/lib/supabase'
import { todayISO } from '@/lib/dates'
import type { Note, Profile, ReadingWithBook, Session } from '@/lib/types'

interface ExportData {
  profile: Profile
  readings: ReadingWithBook[]
  sessions: Session[]
  notes: Note[]
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
  const [profileResult, readings, sessions, notes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    allRows<ReadingWithBook>((from, to) =>
      supabase.from('readings').select('*, book:books(*)').eq('user_id', userId).order('id').range(from, to),
    ),
    allRows<Session>((from, to) =>
      supabase.from('sessions').select('*').eq('user_id', userId).order('id').range(from, to),
    ),
    allRows<Note>((from, to) => supabase.from('notes').select('*').eq('user_id', userId).order('id').range(from, to)),
  ])
  if (profileResult.error) throw profileResult.error
  const data: ExportData = { profile: profileResult.data as Profile, readings, sessions, notes }
  const date = todayISO()
  const files = [
    new File([JSON.stringify(data, null, 2)], `greenbook-${date}.json`, { type: 'application/json;charset=utf-8' }),
    new File([readingsCsv(readings)], `greenbook-lecturas-${date}.csv`, { type: 'text/csv;charset=utf-8' }),
  ]
  if (navigator.share && navigator.canShare?.({ files })) {
    await navigator.share({ files })
    return
  }
  for (const file of files) {
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = file.name
    document.body.append(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }
}
