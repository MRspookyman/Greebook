import { useState } from 'react'
import { BookHeart, Share2 } from 'lucide-react'
import { BottomSheet } from '@/components/BottomSheet'
import { toast } from '@/components/toast'
import { useMe } from '@/features/auth/me'
import type { YearSummary } from './yearSummary'
import { shareYearImage, yearLines } from './yearImage'

/** «Vuestro 2026 en libros»: the year of the two of you, to read together and share as an image. */
export function YearInBooks({ summary, names }: { summary: YearSummary; names: string }) {
  const { userId } = useMe()
  const [open, setOpen] = useState(false)
  const [sharing, setSharing] = useState(false)
  const title = `Vuestro ${summary.year} en libros`
  return (
    <>
      <button type="button" className="card pressable grid min-h-[104px] content-start justify-items-start gap-1.5 p-3.5 text-left" onClick={() => setOpen(true)}>
        <BookHeart size={22} className="text-rose" aria-hidden />
        <b className="text-[14.5px] leading-tight font-extrabold">Vuestro {summary.year}</b>
        <span className="text-xs leading-snug text-muted">
          {summary.books} {summary.books === 1 ? 'libro' : 'libros'} · {summary.bothDays} días juntos
        </span>
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={summary.partial ? `${title}, de momento` : title}>
        <article className="space-y-5 pb-2">
          <div className="grid grid-cols-2 gap-3">
            <p className="grid gap-0.5 rounded-[20px] bg-sunk px-4 py-3">
              <span className="font-serif text-[44px] leading-none">{summary.books}</span>
              <span className="text-sm text-muted">{summary.books === 1 ? 'libro terminado' : 'libros terminados'}</span>
            </p>
            <p className="grid gap-0.5 rounded-[20px] bg-sunk px-4 py-3">
              <span className="font-serif text-[44px] leading-none text-rose">{summary.bothDays}</span>
              <span className="text-sm text-muted">{summary.bothDays === 1 ? 'día leyendo los dos' : 'días leyendo los dos'}</span>
            </p>
          </div>
          <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-extrabold">
            {summary.people.map(({ person, books }) => (
              <span key={person.id} className="flex items-center gap-1.5" style={{ color: `var(--${person.accent})` }}>
                <i className="h-2.5 w-2.5 rounded-full" style={{ background: `var(--${person.accent})` }} aria-hidden />
                {person.id === userId ? 'Tú' : person.display_name}: {books} {books === 1 ? 'libro' : 'libros'}
              </span>
            ))}
          </p>
          <ul className="space-y-2 font-[family-name:var(--font-book)] text-[16.5px] leading-snug">
            {yearLines(summary).map((line) => (
              <li key={line} className="border-b border-rule pb-2 last:border-0">
                {line}
              </li>
            ))}
          </ul>
          {summary.quote && (
            <figure className="space-y-1 text-center">
              <blockquote className="quote-text text-rose">«{summary.quote.body}»</blockquote>
              <figcaption className="text-xs text-muted">— {summary.quote.title}</figcaption>
            </figure>
          )}
          <button
            type="button"
            className="btn btn-primary w-full"
            disabled={sharing}
            onClick={() => {
              setSharing(true)
              void shareYearImage(summary, names)
                .then((result) => {
                  if (result === 'downloaded') toast('Imagen descargada')
                })
                .catch(() => toast('No se pudo crear la imagen'))
                .finally(() => setSharing(false))
            }}
          >
            <Share2 size={17} aria-hidden />
            {sharing ? 'Preparando…' : 'Compartir como imagen'}
          </button>
        </article>
      </BottomSheet>
    </>
  )
}
