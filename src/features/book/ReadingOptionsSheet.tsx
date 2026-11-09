import type { ReadingWithBook } from '@/lib/types'
import { BottomSheet } from '@/components/BottomSheet'
import { BookMetadataEditor } from './BookMetadataEditor'

export function ReadingOptionsSheet({ reading, open, busy, disabled, destructiveDisabled, explanation, onClose, onEdit, onDestroy }: {
  reading: ReadingWithBook
  open: boolean
  busy: boolean
  disabled: boolean
  destructiveDisabled: boolean
  explanation: string | null
  onClose: () => void
  onEdit: () => void
  onDestroy: (remove: boolean) => void
}) {
  return <BottomSheet open={open} onClose={() => { if (!busy) onClose() }} title="Opciones de la lectura">
    <div className="space-y-3">
      <button className="btn btn-secondary w-full" disabled={disabled} onClick={onEdit}>Editar lectura</button>
      <BookMetadataEditor book={reading.book} onSaved={onClose} />
      {explanation && <p className="text-sm text-muted">{explanation}</p>}
      <button className="btn btn-secondary w-full" disabled={destructiveDisabled} onClick={() => onDestroy(false)}>Reiniciar lectura</button>
      <button className="btn btn-ghost w-full text-danger" disabled={destructiveDisabled} onClick={() => onDestroy(true)}>Eliminar de la biblioteca</button>
    </div>
  </BottomSheet>
}
