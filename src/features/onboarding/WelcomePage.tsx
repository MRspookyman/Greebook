import { useEffect, useRef, useState, type SubmitEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useMe } from '@/features/auth/me'
import { PushEnableButton } from '@/features/profile/PushEnableButton'
import { useUpdateProfile } from '@/lib/data'

export function WelcomePage() {
  const { userId, profile } = useMe()
  const navigate = useNavigate()
  const update = useUpdateProfile(userId)
  const [step, setStep] = useState(1)
  const [name, setName] = useState(profile.display_name)
  const [goal, setGoal] = useState(String(profile.yearly_goal))
  const [time, setTime] = useState(profile.reminder_time.slice(0, 5))
  const [error, setError] = useState('')
  const container = useRef<HTMLDivElement>(null)
  useEffect(() => {
    container.current?.querySelector('h1')?.focus()
  }, [step])

  if (profile.onboarded_at) return <Navigate to="/" replace />

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (step === 1) {
      if (!name.trim() || !Number.isInteger(Number(goal)) || Number(goal) < 1 || Number(goal) > 365) {
        setError('Escribe tu nombre y un objetivo entre 1 y 365 libros.')
        return
      }
      setStep(2)
      return
    }
    if (!/^\d{2}:\d{2}$/.test(time)) {
      setError('Elige una hora para el recordatorio.')
      return
    }
    try {
      await update.mutateAsync({
        display_name: name.trim(),
        yearly_goal: Number(goal),
        reminder_time: `${time}:00`,
        onboarded_at: new Date().toISOString(),
      })
      navigate('/', { replace: true })
    } catch {
      setError('No se pudo guardar tu bienvenida. Comprueba la conexión e inténtalo de nuevo.')
    }
  }

  return (
    <main className="min-h-dvh bg-bg px-[26px] text-ink pt-safe pb-safe">
      <div
        ref={container}
        className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 py-12"
        style={{ animation: 'gb-fade-up 300ms ease-out' }}
      >
        <p className="font-serif text-2xl text-green">Greenbook</p>
          <form onSubmit={submit} className="flex flex-col gap-6">
            <p className="folio text-muted">
              Paso {step} de 2
            </p>
            {step === 1 ? (
              <>
                <h1 tabIndex={-1} className="display display-italic focus-heading">
                  Tu rincón de lectura
                </h1>
                <label className="label">
                  Tu nombre
                  <input
                    className="input mt-2"
                    name="given-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    autoComplete="given-name"
                  />
                </label>
                <label className="label">
                  Objetivo anual de libros
                  <input
                    className="input mt-2"
                    name="yearly-goal"
                    autoComplete="off"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="365"
                    step="1"
                    value={goal}
                    onChange={(event) => setGoal(event.target.value)}
                    required
                  />
                </label>
                <p className="text-muted">Sin prisas: puedes cambiar tu objetivo cuando quieras.</p>
              </>
            ) : (
              <>
                <h1 tabIndex={-1} className="display display-italic focus-heading">
                  Un ratito para leer
                </h1>
                <label className="label">
                  Hora del recordatorio
                  <input
                    className="input mt-2"
                    name="reminder-time"
                    autoComplete="off"
                    type="time"
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                    required
                  />
                </label>
                <PushEnableButton />
              </>
            )}
            {error && (
              <p role="alert" className="text-danger">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              {step === 2 && (
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={update.isPending}
                  onClick={() => setStep(step - 1)}
                >
                  Atrás
                </button>
              )}
              <button className="btn btn-primary" disabled={update.isPending}>
                {update.isPending ? 'Guardando…' : step === 1 ? 'Continuar' : 'Empezar a leer'}
              </button>
            </div>
          </form>
      </div>
    </main>
  )
}
