import { Logo } from './Logo'

export function Splash() {
  return (
    <div className="min-h-dvh flex items-center justify-center" style={{ animation: 'gb-fade-in 400ms' }}>
      <Logo size={48} />
    </div>
  )
}
