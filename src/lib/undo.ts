import { useSyncExternalStore } from 'react'
import { dismissToast, toast } from '@/components/toast'

/**
 * «Deshacer» instead of «¿Seguro?»: what you delete disappears at once and is really deleted a few seconds later,
 * unless you undo it. Nothing reaches the server before then, so undoing never re-sends notifications.
 * Leaving the app (or locking the phone) commits straight away rather than losing the deletion.
 */

const UNDO_MS = 5000

let hidden: ReadonlySet<string> = new Set()
const listeners = new Set<() => void>()

function setHidden(next: ReadonlySet<string>) {
  hidden = next
  listeners.forEach((listener) => listener())
}
function hide(ids: readonly string[]) {
  setHidden(new Set([...hidden, ...ids]))
}
function show(ids: readonly string[]) {
  setHidden(new Set([...hidden].filter((id) => !ids.includes(id))))
}

/** Ids removed but not yet deleted on the server; lists filter them out. */
export function useHiddenIds(): ReadonlySet<string> {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => hidden,
    () => hidden,
  )
}

/** Drops rows waiting to be deleted; returns the same array when nothing is hidden. */
export function withoutHidden<T extends { id: string }>(rows: T[], ids: ReadonlySet<string>): T[] {
  return ids.size ? rows.filter((row) => !ids.has(row.id)) : rows
}

export function removeWithUndo(input: {
  /** Rows to hide from every list right away. */
  ids: string[]
  message: string
  /** The real deletion, run once the undo window closes. */
  commit: () => Promise<unknown>
  failMessage: string
  /** Optional local changes that go with the removal (e.g. a reading's position), and how to put them back. */
  apply?: () => void
  revert?: () => void
}): void {
  const { ids, message, commit, failMessage, apply, revert } = input
  let settled = false
  let toastId = 0
  const cleanup = () => {
    settled = true
    window.clearTimeout(timer)
    document.removeEventListener('visibilitychange', onHidden)
    window.removeEventListener('pagehide', run)
  }
  async function run() {
    if (settled) return
    cleanup()
    dismissToast(toastId)
    try {
      await commit()
    } catch {
      revert?.()
      toast(failMessage)
    } finally {
      // Fresh data no longer contains the rows (or contains them again after a failure).
      show(ids)
    }
  }
  const onHidden = () => {
    if (document.visibilityState === 'hidden') void run()
  }
  hide(ids)
  apply?.()
  const timer = window.setTimeout(() => void run(), UNDO_MS)
  document.addEventListener('visibilitychange', onHidden)
  window.addEventListener('pagehide', run)
  toastId = toast(message, undefined, {
    duration: UNDO_MS,
    action: {
      label: 'Deshacer',
      run: () => {
        if (settled) return
        cleanup()
        show(ids)
        revert?.()
      },
    },
  })
}
