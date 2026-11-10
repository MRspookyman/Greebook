import { useState, type FormEvent } from 'react'
import type { Remote } from '@/lib/sync/remote'
import { RemoteError } from '@/lib/sync/remote'
import { Candle } from '@/ui/Candle'

/** The door: two unlit candles and, behind it, your room. */
export function Login({ remote }: { remote: Remote }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [withStory, setWithStory] = useState(true)

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
  const submit = (event: FormEvent) => {
    event.preventDefault()
    void enter(email, password)
  }

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
        </div>
      ) : (
        <form onSubmit={submit} className="mt-9 flex flex-col gap-4">
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
              autoComplete="current-password"
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
            {busy ? 'Abriendo…' : 'Entrar'}
          </button>
        </form>
      )}
    </main>
  )
}
