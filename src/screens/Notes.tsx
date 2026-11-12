import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { openSlip } from '@/lib/actions'
import { bookViews } from '@/lib/model'
import { mailbox, slipPlace } from '@/lib/slips'
import type { Slip } from '@/lib/types'
import { usePeople } from '@/session'
import { Cover } from '@/ui/Book'
import { Sheet } from '@/ui/Sheet'
import { SlipPaper } from '@/ui/SlipPaper'
import { WriteSlip } from '@/ui/WriteSlip'

type Whose = 'todas' | 'suyas' | 'mias' | 'queridas'

/**
 * «Las notas»: everything you two have left between pages, in one place and book by book. The same notes live
 * in each book; here they are read as what they are together: a correspondence.
 */
export function Notes() {
  const { db, me, partner } = usePeople()
  const [whose, setWhose] = useState<Whose>('todas')
  const [editing, setEditing] = useState<Slip | null>(null)
  const bundles = useMemo(() => mailbox(db, me.id), [db, me.id])
  const views = useMemo(() => bookViews(db, me.id), [db, me.id])
  const name = partner?.name ?? 'Tu pareja'

  const total = bundles.reduce((sum, bundle) => sum + bundle.slips.length, 0)
  const unread = bundles.reduce((sum, bundle) => sum + bundle.unread, 0)
  const ahead = bundles.reduce((sum, bundle) => sum + bundle.ahead, 0)
  const wanted = (slip: Slip) =>
    whose === 'todas' ? true : whose === 'suyas' ? slip.user_id !== me.id : whose === 'mias' ? slip.user_id === me.id : slip.loved
  const shown = bundles.map((bundle) => ({ ...bundle, slips: bundle.slips.filter(wanted) })).filter((bundle) => bundle.slips.length > 0)
  const editingView = editing ? views.find((view) => view.book.id === editing.book_id) : undefined

  return (
    <main className="fade mx-auto min-h-dvh max-w-xl px-5 pb-28" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 14px)' }}>
      <h1 className="title mt-9">Las notas</h1>
      {total > 0 && (
        <p className="quiet mt-1.5 text-[16px]">
          {[
            total === 1 ? 'Una nota entre páginas' : `${total} notas entre páginas`,
            unread > 0 && (unread === 1 ? 'una por leer' : `${unread} por leer`),
            ahead > 0 && (ahead === 1 ? 'una te espera más adelante' : `${ahead} te esperan más adelante`),
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}

      {total > 0 && partner && (
        <div role="group" aria-label="Qué notas ver" className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 py-1">
          {(
            [
              ['todas', 'Todas'],
              ['suyas', `De ${partner.name}`],
              ['mias', 'Tuyas'],
              ['queridas', 'Con corazón'],
            ] as Array<[Whose, string]>
          ).map(([value, label]) => (
            <button key={value} type="button" className="chip shrink-0 whitespace-nowrap" aria-pressed={whose === value} onClick={() => setWhose(value)}>
              {label}
            </button>
          ))}
        </div>
      )}

      {shown.map((bundle) => {
        const view = views.find((v) => v.book.id === bundle.book.id)
        return (
          <section key={bundle.book.id} className="mt-8" aria-label={bundle.book.title}>
            <Link to={`/libro/${bundle.book.id}#papeles`} className="pressable mb-3 flex items-center gap-3">
              <Cover book={bundle.book} width={34} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[19px] leading-tight">{bundle.book.title}</span>
                <span className="quiet block truncate text-[15px]">
                  {[
                    bundle.book.author && <em key="a">{bundle.book.author}</em>,
                    bundle.unread > 0 && (bundle.unread === 1 ? 'una por leer' : `${bundle.unread} por leer`),
                  ]
                    .filter(Boolean)
                    .flatMap((part, i) => (i ? [' · ', part] : [part]))}
                </span>
              </span>
            </Link>
            <ul className="flex flex-col gap-2.5">
              {bundle.slips.map((slip) => {
                const own = slip.user_id === me.id
                return (
                  <li key={slip.id}>
                    <SlipPaper
                      slip={slip}
                      mine={own}
                      author={own ? 'Tú' : name}
                      other={name}
                      color={own ? 'var(--me)' : 'var(--you)'}
                      place={slipPlace(slip, view?.mine ?? (own ? undefined : view?.theirs))}
                      onOpen={() => openSlip(slip)}
                      onLove={(loved) => openSlip(slip, loved)}
                      onEdit={() => setEditing(slip)}
                    />
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}

      {total > 0 && !shown.length && <p className="quiet mt-8">{whose === 'queridas' ? 'Todavía no hay ninguna con corazón.' : 'Ninguna así todavía.'}</p>}

      {total === 0 && (
        <div className="mt-6 rounded-[22px] border-[1.5px] border-dashed border-rule px-5 py-7 text-center">
          <p className="text-[19px]">Aún no hay ninguna nota.</p>
          <p className="quiet mt-1">
            Se escriben dentro de un libro, o mientras arde tu vela: una frase que subrayarías, lo que te ha hecho sentir una página.
            {partner ? ` ${partner.name} la encontrará al llegar.` : ''}
          </p>
          <Link to="/#mesilla" className="btn btn-soft mt-5">
            Ir a la mesilla
          </Link>
        </div>
      )}

      <Sheet open={!!editing} onClose={() => setEditing(null)} title="Cambiar la nota">
        {editing && editingView && <WriteSlip book={editingView.book} mine={editingView.mine} partner={partner} editing={editing} onDone={() => setEditing(null)} />}
      </Sheet>
    </main>
  )
}
