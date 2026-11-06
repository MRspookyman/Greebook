import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
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
    <div className="flex flex-col gap-5 py-4">
      <header className="flex items-center gap-3">
        <Link to="/" className="icon-btn" aria-label="Volver a Hoy">
          <ArrowLeft size={20} />
        </Link>
        <Avatar person={profile} size={44} />
        <h1 className="min-w-0 font-serif text-2xl font-semibold">{profile.display_name}</h1>
      </header>
      <section className="card" aria-labelledby="yearly-goal-heading">
        <header className="mb-3 flex items-center justify-between gap-2">
          <h2 id="yearly-goal-heading" className="font-serif text-lg font-semibold">
            Objetivo anual
          </h2>
          <span className="text-xs text-muted">{new Date().getFullYear()}</span>
        </header>
        <fieldset disabled={updateProfile.isPending}>
          <Stepper
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
            caption="libros este año"
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
      <NotificationsSection />
      <DataSection />
      <SettingsSection />
    </div>
  )
}
