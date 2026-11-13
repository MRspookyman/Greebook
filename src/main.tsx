import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource-variable/newsreader/opsz.css'
import '@fontsource-variable/newsreader/opsz-italic.css'
import '@fontsource/caveat/latin-500.css'
import '@/styles/theme.css'
import '@/styles/room.css'
import App from './App'
import { toast } from './ui/toast'

let offered = false
// A new version waits for a tap instead of reloading under a lit candle.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    if (offered) return
    offered = true
    toast('Hay una versión nueva', {
      label: 'Actualizar',
      run: () => {
        navigator.serviceWorker?.addEventListener('controllerchange', () => window.location.reload(), { once: true })
        void updateSW(true)
      },
    }, true)
  },
  onRegisteredSW(_url, registration) {
    if (!registration) return
    const check = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) void registration.update().catch(() => {})
    }
    document.addEventListener('visibilitychange', check)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
