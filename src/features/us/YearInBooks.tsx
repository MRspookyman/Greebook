import { useState } from 'react'
import { BookHeart, ChevronRight, Share2 } from 'lucide-react'
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
      <button type="button" className="card flex min-h-[84px] w-full items-center gap-4 text-left" onClick={() => setOpen(true)}>
        <span
          className="grid h-[50px] w-[72px] flex-none place-items-center rounded-md bg-[color-mix(in_oklab,var(--rose)_18%,var(--surface))] text-rose"
          aria-hidden
        >
          <BookHeart size={26} />
        </span>
        <span className="grid flex-1 gap-0.5">
          <b className="font-extrabold">{title}</b>
          <span className="text-[13.5px] text-muted">
            {summary.partial ? 'De momento: ' : ''}
            {summary.books} {summary.books === 1 ? 'libro' : 'libros'} y {summary.bothDays}{' '}
            {summary.bothDays === 1 ? 'día' : 'días'} leyendo los dos
          </span>
        </span>
        <ChevronRight size={20} aria-hidden />
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
