import { supabase } from './supabase'

export type PushState = 'unsupported' | 'needs-install' | 'denied' | 'default' | 'enabled'

function initialState(): PushState {
  if (!('PushManager' in window) || !('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported'
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  if (!standalone) return 'needs-install'
  if (Notification.permission === 'denied') return 'denied'
  return 'default'
}

export async function getPushState(): Promise<PushState> {
  const state = initialState()
  if (state !== 'default' || Notification.permission !== 'granted') return state
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return 'default'
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id')
    .eq('endpoint', subscription.endpoint)
    .maybeSingle()
  if (error) throw error
  return data ? 'enabled' : 'default'
}

function applicationServerKey(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
  return Uint8Array.from(raw, (character) => character.charCodeAt(0))
}

/** Call directly from a click: requestPermission must retain the user gesture on iOS. */
export async function enablePush(): Promise<PushState> {
  const state = initialState()
  if (state !== 'default') return state
  const permission = await Notification.requestPermission()
  if (permission === 'denied') return 'denied'
  if (permission !== 'granted') return 'default'
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!key) throw new Error('Falta configurar la clave pública de los avisos')
  const registration = await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey(key),
    }))
  await claimSubscription(subscription)
  return 'enabled'
}

async function claimSubscription(subscription: PushSubscription): Promise<void> {
  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth)
    throw new Error('La suscripción de avisos está incompleta')
  const { error } = await supabase.rpc('claim_push_subscription', {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys.p256dh,
    p_auth: json.keys.auth,
  })
  if (error) throw error
}

/** Restore this browser's subscription for the current account, without prompting for permission. */
export async function syncPushSubscription(): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted' || !('serviceWorker' in navigator))
    return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (subscription) await claimSubscription(subscription)
}

/** Privacy cleanup must finish before auth is removed, but must never prevent signing out. */
export async function signOutWithPushCleanup(userId: string) {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      const subscription = await registration?.pushManager?.getSubscription()
      if (subscription) {
        try {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', userId)
            .eq('endpoint', subscription.endpoint)
            .abortSignal(AbortSignal.timeout(3000))
        } finally {
          await subscription.unsubscribe()
        }
      }
    } catch {
      // Offline, expired sessions or browser failures must not trap the user in their account.
    }
  }
  return supabase.auth.signOut()
}
