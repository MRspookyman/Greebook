import { useState, type SubmitEvent } from 'react'
import { useMe } from '@/features/auth/me'
import { useUpdateProfile } from '@/lib/data'
import { supabase } from '@/lib/supabase'
import { signOutWithPushCleanup } from '@/lib/push'
import type { Accent, ThemePref } from '@/lib/types'
import { toast } from '@/components/toast'

const THEMES: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
]

export function SettingsSection() {
  const { userId, profile, partner } = useMe()
  const update = useUpdateProfile(userId)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState('')
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [name, setName] = useState(profile.display_name)
  const [identityError, setIdentityError] = useState('')
  const nameChanged = name.trim() !== profile.display_name
  // Each of you keeps a different colour; yours can only move to one your partner isn't using.
  const partnerPending = !!profile.partner_id && !partner

  async function saveName(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setIdentityError('')
    const displayName = name.trim()
    if (displayName.length < 1 || displayName.length > 30) {
      setIdentityError('El nombre debe tener entre 1 y 30 caracteres.')
      return
    }
    try {
      await update.mutateAsync({ display_name: displayName })
      setName(displayName)
      toast('Nombre guardado')
    } catch {
      setIdentityError('No se pudo guardar el nombre. Comprueba la conexión e inténtalo de nuevo.')
    }
  }

  function pickAccent(accent: Accent) {
    if (accent === profile.accent || partnerPending || accent === partner?.accent) return
    setIdentityError('')
    update.mutate(
      { accent },
      {
        onSuccess: () => {
          document.documentElement.dataset.accent = accent
        },
        onError: () => toast('No se pudo cambiar el color', 'Comprueba la conexión e inténtalo de nuevo.'),
      },
    )
  }

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
      <form className="space-y-2" onSubmit={saveName}>
        <label className="label" htmlFor="display-name">
          Tu nombre
        </label>
        <div className="flex gap-2">
          <input id="display-name" className="input min-w-0 flex-1" value={name} onChange={(event) => setName(event.target.value)}
            required minLength={1} maxLength={30} autoComplete="given-name" />
          {nameChanged && (
            <button type="submit" className="btn btn-primary rise" disabled={update.isPending || !name.trim()}>
              {update.isPending ? 'Guardando…' : 'Guardar'}
            </button>
          )}
        </div>
        {identityError && <p role="alert" className="text-sm text-danger">{identityError}</p>}
      </form>
      <fieldset>
        <legend className="label mb-2">Tu color</legend>
        <div className="flex flex-wrap gap-2">
          {(['blue', 'green'] as const).map((color) => {
            const theirs = partner?.accent === color
            return (
              <button
                key={color}
                type="button"
                className="chip"
                aria-pressed={profile.accent === color}
                disabled={update.isPending || partnerPending || theirs}
                onClick={() => pickAccent(color)}
              >
                <span aria-hidden className="h-3 w-3 rounded-full" style={{ background: `var(--${color})` }} />
                {color === 'blue' ? 'Azul' : 'Verde'}
                {theirs && <span className="font-bold opacity-80">· de {partner?.display_name}</span>}
              </button>
            )
          })}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label mb-2">Tema</legend>
        <div className="flex flex-wrap gap-2">
          {THEMES.map((theme) => (
            <button
              key={theme.value}
              type="button"
              aria-pressed={profile.theme === theme.value}
              disabled={update.isPending}
              className="chip"
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
      <button type="button" className="btn btn-link px-0 text-danger" disabled={signingOut} onClick={signOut}>
        {signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
      </button>
    </section>
  )
}
