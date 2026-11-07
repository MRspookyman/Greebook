import { useState, type SubmitEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/Logo'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: SubmitEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) {
      setError(error.status === 400 ? 'Email o contraseña incorrectos' : 'No hay conexión. Inténtalo de nuevo.')
    }
  }

  return (
    <main className="flex min-h-dvh flex-col justify-center px-[26px] pt-safe pb-safe">
      <div className="mx-auto w-full max-w-sm">
        <header className="mb-8">
          <Logo size={48} />
          <h1 className="display mt-6">
            Nuestro diario
            <br />
            <span className="display-italic">de lectura</span>
          </h1>
        </header>
        <form onSubmit={submit} className="rule flex flex-col gap-5 pt-6">
          <div>
            <label className="eyebrow mb-2 block" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="username"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="eyebrow mb-2 block" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-danger text-sm">
              {error}
            </p>
          )}
          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  )
}
