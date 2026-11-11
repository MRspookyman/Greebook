/**
 * The notice that stays on the phone while your candle burns, like a running timer's: which book, since when,
 * and a way back to blow it out. It is a local notification (nothing travels to a server); the phone itself
 * keeps counting from the moment the candle was lit, also with the app in the background.
 */
const TAG = 'velada'

const supported = () => 'Notification' in window && 'serviceWorker' in navigator

/** Asked once, on the gesture of lighting the candle: without permission there is simply no notice. */
export function askForCandleNotice() {
  try {
    if (supported() && Notification.permission === 'default') void Notification.requestPermission()
  } catch {
    // Some browsers only take the old callback form; the notice is a nicety, not worth a fallback.
  }
}

const clock = (date: Date) => `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`

export async function showCandleNotice(litAt: string, title: string | null): Promise<boolean> {
  if (!supported() || Notification.permission !== 'granted') return false
  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) return false
  const lit = new Date(litAt)
  // `timestamp`, `renotify` and `actions` are real but not in every TypeScript lib yet.
  const options: NotificationOptions & { timestamp?: number; renotify?: boolean; actions?: Array<{ action: string; title: string }> } = {
    body: `Vela encendida desde las ${clock(lit)}. Toca para volver a tu velada.`,
    tag: TAG,
    // Replacing it (another book, the app reopened) must not buzz again.
    renotify: false,
    silent: true,
    // Stays until the candle goes out, instead of leaving on its own.
    requireInteraction: true,
    // The phone shows and keeps counting the time since this moment.
    timestamp: lit.getTime(),
    icon: '/pwa-192x192.png',
    badge: '/pwa-64x64.png',
    data: { url: '/velada', ongoing: true },
    actions: [{ action: 'apagar', title: 'Apagar la vela' }],
  }
  try {
    await registration.showNotification(title ? `🕯️ Leyendo «${title}»` : '🕯️ Tu vela está encendida', options)
    return true
  } catch {
    return false
  }
}

export async function clearCandleNotice() {
  if (!supported()) return
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    const notices = (await registration?.getNotifications({ tag: TAG })) ?? []
    notices.forEach((notice) => notice.close())
  } catch {
    // Nothing to clear where notifications can't be listed.
  }
}
