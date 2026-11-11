import { useId, useState } from 'react'
import { coverFromFile } from '@/lib/photo'
import type { Book } from '@/lib/types'
import { Cover } from './Book'

interface Props {
  /** The book as it would look, to draw its cloth cover while it has no photo. */
  book: Pick<Book, 'id' | 'title' | 'author' | 'pages'>
  value: string | null
  onChange: (cover: string | null) => void
}

/** The cover of a book, with a way to give it one: a photo taken now or picked from the gallery. */
export function CoverPhoto({ book, value, onChange }: Props) {
  const id = useId()
  const [state, setState] = useState<'idle' | 'working' | 'failed'>('idle')
  return (
    <div className="flex items-center gap-4">
      <Cover book={{ ...book, cover_url: value } as Book} width={72} />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <label htmlFor={id} className="btn btn-soft !min-h-11 cursor-pointer !px-4 !text-[16px]" aria-busy={state === 'working'}>
          {state === 'working' ? 'Preparando la foto…' : value ? 'Cambiar la portada' : 'Poner una foto de portada'}
        </label>
        <input
          id={id}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0]
            event.currentTarget.value = ''
            if (!file) return
            setState('working')
            coverFromFile(file)
              .then((cover) => {
                onChange(cover)
                setState('idle')
              })
              .catch(() => setState('failed'))
          }}
        />
        {value && (
          <button type="button" className="btn btn-text !min-h-11 !px-1" onClick={() => onChange(null)}>
            Quitar la portada
          </button>
        )}
        <p className="quiet text-[15px]" role="status">
          {state === 'failed' ? 'No he podido usar esa foto. Prueba con otra.' : !value ? 'Hazle una foto o elige una de la galería.' : ''}
        </p>
      </div>
    </div>
  )
}
