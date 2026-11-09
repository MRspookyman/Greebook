import { useState, type SubmitEvent } from 'react'
import { useMe } from '@/features/auth/me'
import { useUpdateProfile } from '@/lib/data'
import { supabase } from '@/lib/supabase'
import { signOutWithPushCleanup } from '@/lib/push'
import type { ThemePref } from '@/lib/types'
import { toast } from '@/components/toast'

const THEMES: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
]

export function SettingsSection() {
  const { userId, profile } = useMe()
  const update = useUpdateProfile(userId)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState('')
  const [passwordOpen, setPasswordOpen] = useState(false)

  async function changePassword(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setBusy(true)
    try {
      const result = await supabase.auth.updateUser({ password })
      if (result.error) throw result.error
      setPassword('')
      setConfirmation('')
      setPasswordOpen(false)
      toast('Contraseña actualizada')
    } catch {
      setError('No se pudo cambiar la contraseña. Comprueba la conexión e inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    setSigningOut(true)
    try {
      const { error: signOutError } = await signOutWithPushCleanup(userId)
      if (signOutError) throw signOutError
    } catch {
      toast('No se pudo cerrar sesión', 'Comprueba la conexión e inténtalo de nuevo.')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <section className="rule space-y-5 pt-5" aria-labelledby="settings-title">
      <h2 id="settings-title" className="eyebrow text-muted">
        Ajustes
      </h2>
      <fieldset>
        <legend className="label mb-2">Tema</legend>
        <div className="flex flex-wrap gap-2">
          {THEMES.map((theme) => (
            <button
              key={theme.value}
              type="button"
              aria-pressed={profile.theme === theme.value}
              disabled={update.isPending}
              className={`btn btn-outline ${profile.theme === theme.value ? 'border-accent text-accent' : ''}`}
              onClick={() =>
                update.mutate({ theme: theme.value }, { onError: () => toast('No se pudo guardar el tema') })
              }
            >
              {theme.label}
            </button>
          ))}
        </div>
      </fieldset>
      <button
        type="button"
        className="rule flex min-h-14 w-full items-center justify-between pt-3 text-left font-medium"
        aria-expanded={passwordOpen}
        aria-controls="password-form"
        onClick={() => setPasswordOpen(!passwordOpen)}
      >
        Cambiar contraseña
        <span aria-hidden="true">{passwordOpen ? '−' : '+'}</span>
      </button>
      {passwordOpen && (
        <form id="password-form" onSubmit={changePassword} className="space-y-4">
          <label className="label">
            Nueva contraseña
            <input
              type="password"
              className="input mt-2"
              minLength={8}
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <p className="text-sm text-muted">Al menos 8 caracteres.</p>
          <label className="label">
            Confirmar contraseña
            <input
              type="password"
              className="input mt-2"
              minLength={8}
              autoComplete="new-password"
              required
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="text-danger">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-outline" disabled={busy}>
            {busy ? 'Guardando…' : 'Cambiar contraseña'}
          </button>
        </form>
      )}
      <button type="button" className="btn btn-link text-danger" disabled={signingOut} onClick={signOut}>
        {signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
      </button>
    </section>
  )
}
