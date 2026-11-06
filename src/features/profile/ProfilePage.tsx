import { useMe } from '@/features/auth/me'
import { StatsSection } from './StatsSection'
import { NotificationsSection } from './NotificationsSection'
import { DataSection } from './DataSection'
import { SettingsSection } from './SettingsSection'

export function ProfilePage() {
  const { profile } = useMe()
  return (
    <div className="flex flex-col gap-8 py-6">
      <header className="flex items-center gap-3">
        <span className="w-12 h-12 rounded-full bg-accent text-surface flex items-center justify-center font-serif font-semibold text-xl">
          {profile.display_name.charAt(0).toUpperCase()}
        </span>
        <h1>{profile.display_name}</h1>
      </header>
      <StatsSection />
      <NotificationsSection />
      <DataSection />
      <SettingsSection />
    </div>
  )
}
