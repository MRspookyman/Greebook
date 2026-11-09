import { useState, type CSSProperties } from 'react'
import { ArrowLeft, BarChart3, ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { Avatar } from '@/components/Avatar'
import { Stepper } from '@/components/Stepper'
import { toast } from '@/components/toast'
import { useMe } from '@/features/auth/me'
import { useUpdateProfile } from '@/lib/data'
import { NotificationsSection } from './NotificationsSection'
import { DataSection } from './DataSection'
import { SettingsSection } from './SettingsSection'

export function ProfilePage() {
  const { userId, profile } = useMe()
  const updateProfile = useUpdateProfile(userId)
  const [goalDraft, setGoalDraft] = useState<number | null>(null)
  const [goalError, setGoalError] = useState('')
  const goal = goalDraft ?? profile.yearly_goal

  async function saveGoal() {
    setGoalError('')
    try {
      await updateProfile.mutateAsync({ yearly_goal: goal })
      setGoalDraft(null)
      toast('Objetivo actualizado')
    } catch {
      setGoalError('No se ha podido guardar el objetivo. Inténtalo de nuevo.')
    }
  }

  return (
    <div className="flex flex-col gap-8 py-5">
      <header className="enter flex flex-wrap items-center gap-3">
        <Link to="/" className="icon-btn" aria-label="Volver a Inicio">
          <ArrowLeft size={20} />
        </Link>
        <Avatar person={profile} size={44} />
        <h1 className="display min-w-0 flex-1 [overflow-wrap:anywhere]">{profile.display_name}</h1>
      </header>
      <section className="rule enter pt-5" style={{ '--i': 1 } as CSSProperties} aria-labelledby="yearly-goal-heading">
        <header className="mb-4 flex items-center justify-between gap-2">
          <h2 id="yearly-goal-heading" className="eyebrow text-muted">
            Objetivo anual
          </h2>
          <span className="folio text-muted">{new Date().getFullYear()}</span>
        </header>
        <fieldset disabled={updateProfile.isPending}>
          <Stepper
            editable
            editLabel="Escribir el objetivo"
            label="Libros que quieres leer este año"
            value={goal}
            onChange={(value) => {
              setGoalDraft(value)
              setGoalError('')
            }}
            step={1}
            min={1}
            max={365}
            display={goal}
            caption={goal === 1 ? 'libro este año' : 'libros este año'}
          />
        </fieldset>
        {goal !== profile.yearly_goal && (
          <button
            className="btn btn-primary mt-3 w-full"
            disabled={updateProfile.isPending}
            onClick={() => {
              void saveGoal()
            }}
          >
            {updateProfile.isPending ? 'Guardando…' : 'Guardar objetivo'}
          </button>
        )}
        {goalError && (
          <p className="mt-2 text-sm text-danger" role="alert">
            {goalError}
          </p>
        )}
      </section>
      <Link to="/stats" className="card flex min-h-16 items-center gap-3">
        <BarChart3 size={22} aria-hidden className="text-muted" />
        <span className="flex-1">
          <span className="block font-extrabold">Tus números</span>
          <span className="block text-sm text-muted">Páginas, tiempo y días de lectura, solo tuyos</span>
        </span>
        <ChevronRight size={20} aria-hidden />
      </Link>
      <NotificationsSection />
      <DataSection />
      <SettingsSection />
    </div>
  )
}
