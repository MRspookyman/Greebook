import type { Remote } from './sync/remote'

/** Whether this phone gets notices, and why not when it doesn't. */
export type PushState = 'unsupported' | 'needs-install' | 'unconfigured' | 'denied' | 'off' | 'on'

function base(): PushState | null {
  if (!('PushManager' in window) || !('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported'
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  // On an iPhone, notices only exist for apps added to the home screen.
  if (!standalone && /iPhone|iPad/.test(navigator.userAgent)) return 'needs-install'
  if (!import.meta.env.VITE_VAPID_PUBLIC_KEY) return 'unconfigured'
  if (Notification.permission === 'denied') return 'denied'
  return null
}

function serverKey(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
  return Uint8Array.from(raw, (character) => character.charCodeAt(0))
}

async function current(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration()
  return (await registration?.pushManager.getSubscription()) ?? null
}

async function claim(remote: Remote, subscription: PushSubscription) {
  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error('Suscripción incompleta')
  await remote.claimPush({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth })
}

export async function pushState(remote: Remote): Promise<PushState> {
  const blocked = base()
  if (blocked) return blocked
  if (Notification.permission !== 'granted') return 'off'
  const subscription = await current()
  return subscription && (await remote.hasPush(subscription.endpoint)) ? 'on' : 'off'
}

/** Call straight from a tap: asking for permission needs the gesture. */
export async function enablePush(remote: Remote): Promise<PushState> {
  const blocked = base()
  if (blocked) return blocked
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off'
  const registration = await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: serverKey(import.meta.env.VITE_VAPID_PUBLIC_KEY!),
    }))
  await claim(remote, subscription)
  return 'on'
}

export async function disablePush(remote: Remote): Promise<PushState> {
  try {
    const subscription = await current()
    if (subscription) {
      await remote.dropPush(subscription.endpoint)
      await subscription.unsubscribe()
    }
  } catch {
    // Offline: the server forgets the phone the next time a notice bounces.
  }
  return 'off'
}

/** After signing in on a phone that already allowed notices: make sure they reach this account. */
export async function reclaimPush(remote: Remote) {
  try {
    if (base() || Notification.permission !== 'granted') return
    const subscription = await current()
    if (subscription) await claim(remote, subscription)
  } catch {
    // Not worth interrupting anything for.
  }
}
