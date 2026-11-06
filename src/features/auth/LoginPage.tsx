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
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 pt-safe pb-safe">
      <div className="w-full max-w-sm" style={{ animation: 'gb-fade-up 300ms ease-out' }}>
        <div className="flex flex-col items-center gap-2 mb-8">
          <Logo size={56} />
          <p className="text-muted">Nuestro diario de lectura</p>
        </div>
        <form onSubmit={submit} className="card p-5 flex flex-col gap-4">
          <div>
            <label className="label" htmlFor="email">
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
            <label className="label" htmlFor="password">
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
