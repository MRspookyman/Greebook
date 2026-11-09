import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource/young-serif/latin-400.css'
import '@fontsource/young-serif/latin-ext-400.css'
import '@fontsource-variable/nunito/wght.css'
import '@fontsource-variable/literata/opsz.css'
import '@fontsource-variable/literata/opsz-italic.css'
import '@fontsource/caveat/latin-500.css'
import '@fontsource/caveat/latin-ext-500.css'
import '@/styles/theme.css'
import App from './App'
import { reportDisplayMode } from './lib/displayMode'
import { toast } from './components/toast'

reportDisplayMode()

const HOUR = 60 * 60 * 1000
let offered = false
// New versions wait for a tap instead of reloading mid-sentence; they are looked for every time you come back.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    if (offered) return
    offered = true
    toast('Hay una versión nueva de Greenbook', undefined, {
      duration: null,
      action: {
        label: 'Actualizar',
        run: () => {
          // Reload once the new version takes over, also when the page was the first install.
          navigator.serviceWorker?.addEventListener('controllerchange', () => window.location.reload(), { once: true })
          void updateSW(true)
        },
      },
    })
  },
  onRegisteredSW(_url, registration) {
    if (!registration) return
    const check = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) void registration.update().catch(() => {})
    }
    document.addEventListener('visibilitychange', check)
    window.setInterval(check, HOUR)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
