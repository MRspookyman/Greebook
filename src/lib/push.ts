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
  return (await registration.pushManager.getSubscription()) ? 'enabled' : 'default'
}

function applicationServerKey(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
  return Uint8Array.from(raw, (character) => character.charCodeAt(0))
}

/** Call directly from a click: requestPermission must retain the user gesture on iOS. */
export async function enablePush(userId: string): Promise<PushState> {
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
  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth)
    throw new Error('La suscripción de avisos está incompleta')
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    { onConflict: 'endpoint' },
  )
  if (error) throw error
  return 'enabled'
}
