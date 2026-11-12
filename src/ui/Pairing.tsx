import { useEffect, useState, type FormEvent } from 'react'
import { clearInvite, fmtInvite, inviteLink, inviteProblem, pendingInvite } from '@/lib/invite'
import { RemoteError } from '@/lib/sync/remote'
import { sync } from '@/lib/sync/store'
import { useSession } from '@/session'
import { toast } from './toast'

/**
 * How two people become the two of this room: one makes an invitation and passes it on (a link, or the code
 * read aloud); the other opens the link or types the code. Shown only while you read alone.
 */
export function Pairing() {
  const { remote } = useSession()
  const [mine, setMine] = useState<string | null>(null)
  const [making, setMaking] = useState(false)
  const [typed, setTyped] = useState(() => fmtInvite(pendingInvite() ?? ''))
  const [joining, setJoining] = useState(false)
  const [problem, setProblem] = useState('')

  // While my code is on the screen the other may be typing it: look often, so their candle appears by itself.
  useEffect(() => {
    if (!mine) return
    const id = setInterval(() => void sync(), 5000)
    return () => clearInterval(id)
  }, [mine])

  const make = () => {
    setMaking(true)
    setProblem('')
    remote
      .invite()
      .then(setMine)
      .catch((cause: unknown) => setProblem(cause instanceof RemoteError && cause.permanent ? inviteProblem(cause.message) : 'No hay conexión. Prueba otra vez en un momento.'))
      .finally(() => setMaking(false))
  }
  const share = async () => {
    if (!mine) return
    const text = `Lee conmigo en Greenbook. Entra con este enlace o escribe el código ${fmtInvite(mine)}:`
    try {
      if (navigator.share) await navigator.share({ title: 'Greenbook', text, url: inviteLink(mine) })
      else {
        await navigator.clipboard.writeText(`${text} ${inviteLink(mine)}`)
        toast('Invitación copiada')
      }
    } catch {
      // Closing the share sheet is not a problem.
    }
  }
  const join = (event: FormEvent) => {
    event.preventDefault()
    if (joining || !typed.trim()) return
    setJoining(true)
    setProblem('')
    remote
      .acceptInvite(typed)
      .then(async () => {
        clearInvite()
        await sync()
        toast('Ya leéis juntos')
      })
      .catch((cause: unknown) => setProblem(cause instanceof RemoteError && cause.permanent ? inviteProblem(cause.message) : 'No hay conexión. Prueba otra vez en un momento.'))
      .finally(() => setJoining(false))
  }

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h3 className="text-[19px] font-medium">Invitar</h3>
        {mine ? (
          <>
            <p className="quiet mt-1 text-[16px]">Pásale este código o el enlace. Vale una semana y para una sola persona.</p>
            <p className="mt-3 rounded-[16px] border-[1.5px] border-dashed border-rule px-4 py-3 text-center text-[27px] tracking-[0.08em] tabular-nums select-all" aria-label={`Tu código: ${fmtInvite(mine).split('').join(' ')}`}>
              {fmtInvite(mine)}
            </p>
            <button className="btn btn-primary mt-3 w-full" onClick={() => void share()}>
              Enviar la invitación
            </button>
            <p className="quiet mt-2 text-center text-[15px]" role="status">Esperando a que entre…</p>
          </>
        ) : (
          <>
            <p className="quiet mt-1 text-[16px]">Crea una invitación y pásasela a quien lee contigo.</p>
            <button className="btn btn-primary mt-3" disabled={making} aria-busy={making} onClick={make}>
              {making ? 'Un momento…' : 'Crear mi invitación'}
            </button>
          </>
        )}
      </div>

      <form onSubmit={join}>
        <label className="text-[19px] font-medium" htmlFor="invite-code">
          Tengo un código
        </label>
        <p className="quiet mt-1 text-[16px]">Si te han invitado, escríbelo aquí.</p>
        <div className="mt-3 flex gap-2">
          <input
            id="invite-code"
            className="field min-w-0 flex-1 tracking-[0.06em] uppercase"
            value={typed}
            maxLength={14}
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="AB12C-D34EF"
            onChange={(event) => setTyped(event.currentTarget.value)}
          />
          <button className="btn btn-soft flex-none" disabled={joining || !typed.trim()} aria-busy={joining}>
            {joining ? 'Entrando…' : 'Unirme'}
          </button>
        </div>
      </form>
      {problem && (
        <p role="alert" className="text-[16px] text-danger">
          {problem}
        </p>
      )}
    </div>
  )
}
