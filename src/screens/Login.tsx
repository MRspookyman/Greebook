import { useState, type FormEvent } from 'react'
import type { Remote } from '@/lib/sync/remote'
import { RemoteError } from '@/lib/sync/remote'
import { Candle } from '@/ui/Candle'
import { pendingInvite } from '@/lib/invite'

/** The door: two unlit candles and, behind it, your room. */
export function Login({ remote }: { remote: Remote }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [withStory, setWithStory] = useState(true)
  /** Making a new account instead of entering an existing one. */
  const [creating, setCreating] = useState(false)
  const [confirm, setConfirm] = useState(false)

  async function enter(who: string, secret: string) {
    setBusy(true)
    setError(null)
    try {
      await remote.signIn(who.trim(), secret)
    } catch (cause) {
      setError(
        cause instanceof RemoteError && cause.permanent
          ? 'El email o la contraseña no coinciden.'
          : 'No hay conexión. Prueba otra vez en un momento.',
      )
      setBusy(false)
    }
  }
  async function create() {
    setBusy(true)
    setError(null)
    try {
      // With a session it lets you straight in; without one, the email has to be confirmed first.
      if (!(await remote.signUp(email.trim(), password))) {
        setConfirm(true)
        setCreating(false)
      }
    } catch (cause) {
      setError(
        cause instanceof RemoteError && cause.permanent
          ? 'No he podido crear la cuenta. Puede que ese email ya tenga una, o que la contraseña sea muy corta.'
          : 'No hay conexión. Prueba otra vez en un momento.',
      )
    }
    setBusy(false)
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    void (creating ? create() : enter(email, password))
  }
  const invited = !!pendingInvite()

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-7 pt-safe pb-safe">
      <div className="fade -ml-3 flex items-end" aria-hidden>
        <Candle color="salvia" lit={false} size={64} wax={0.8} />
        <Candle color="miel" lit size={64} lean={-1} />
      </div>
      <h1 className="display mt-2">Greenbook</h1>
      <p className="quiet mt-2 text-[19px] italic">Una vela para leer, otra para saber que lees.</p>

      {remote.ensayo ? (
        <div className="mt-9 flex flex-col gap-3">
          <p className="eyebrow">Modo ensayo · sin servidor</p>
          <p className="quiet text-[16px]">
            Todo se queda en este navegador. Abre dos pestañas y entra en cada una como uno de los dos.
          </p>
          <button className="btn btn-primary" disabled={busy} onClick={() => enter(withStory ? 'laura+historia' : 'laura', '')}>
            Entrar como Laura
          </button>
          <button className="btn btn-line" disabled={busy} onClick={() => enter('javier', '')}>
            Entrar como Javier
          </button>
          <label className="mt-1 flex min-h-11 items-center gap-3 text-[16px]">
            <input
              type="checkbox"
              className="h-5 w-5 accent-[var(--primary)]"
              checked={withStory}
              onChange={(event) => setWithStory(event.currentTarget.checked)}
            />
            Empezar con una historia de ejemplo
          </label>
          <button className="btn btn-text self-start !px-0" disabled={busy} onClick={() => enter('laura+sin-pareja', '')}>
            Entrar sin pareja, para ensayar la invitación
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-9 flex flex-col gap-4">
          {invited && <p className="text-[17px]">Te han invitado a leer. {creating ? 'Crea tu cuenta' : 'Entra o crea tu cuenta'} y os emparejo al momento.</p>}
          {confirm && <p role="status" className="text-[17px]">Te he mandado un correo para confirmar la cuenta. Ábrelo y vuelve a entrar aquí.</p>}
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="field"
              type="email"
              autoComplete="username"
              inputMode="email"
              required
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              className="field"
              type="password"
              autoComplete={creating ? 'new-password' : 'current-password'}
              minLength={creating ? 6 : undefined}
              required
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-[16px] text-danger">
              {error}
            </p>
          )}
          <button className="btn btn-primary mt-2" disabled={busy}>
            {busy ? 'Abriendo…' : creating ? 'Crear mi cuenta' : 'Entrar'}
          </button>
          <button
            type="button"
            className="btn btn-text self-center"
            onClick={() => {
              setCreating(!creating)
              setError(null)
            }}
          >
            {creating ? 'Ya tengo cuenta' : 'Es mi primera vez: crear una cuenta'}
          </button>
        </form>
      )}
    </main>
  )
}
