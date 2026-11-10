/* Web Push from the Edge Function, with Deno's own WebCrypto (npm:web-push does not run there).
 * One VAPID key pair: `npx web-push generate-vapid-keys`. The public key is VITE_VAPID_PUBLIC_KEY in the
 * app; the function needs the secrets VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT (mailto:…).
 */
import { ApplicationServer, importVapidKeys, PushMessageError } from 'jsr:@negrel/webpush@0.5.0'
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

interface NotificationPayload {
  title: string
  body: string
  url: string
  tag?: string
}
let server: Promise<ApplicationServer> | undefined

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function applicationServer(): Promise<ApplicationServer> {
  const encoded = requiredEnv('VAPID_PUBLIC_KEY').replace(/-/g, '+').replace(/_/g, '/')
  const raw = Uint8Array.from(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')), (c) => c.charCodeAt(0))
  if (raw.length !== 65 || raw[0] !== 4) throw new Error('Invalid VAPID public key')
  const publicKey: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    x: base64url(raw.slice(1, 33)),
    y: base64url(raw.slice(33, 65)),
    ext: true,
  }
  const privateKey: JsonWebKey = { ...publicKey, d: requiredEnv('VAPID_PRIVATE_KEY') }
  return await ApplicationServer.new({
    contactInformation: requiredEnv('VAPID_SUBJECT'),
    vapidKeys: await importVapidKeys({ publicKey, privateKey }, { extractable: false }),
  })
}

export async function sendToUser(
  supabaseAdmin: SupabaseClient,
  userId: string,
  payload: NotificationPayload,
): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)
  if (error) throw error
  if (!data?.length) return 0
  const app = await (server ??= applicationServer())
  const results = await Promise.allSettled(
    data.map(async (subscription) => {
      try {
        await app
          .subscribe({
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          })
          .pushTextMessage(JSON.stringify(payload), {})
      } catch (error) {
        if (error instanceof PushMessageError && [404, 410].includes(error.response.status)) {
          const { error: deletionError } = await supabaseAdmin
            .from('push_subscriptions')
            .delete()
            .eq('id', subscription.id)
            .eq('user_id', userId)
          if (deletionError) throw deletionError
        } else throw error
      }
    }),
  )
  const failed = results.find((result) => result.status === 'rejected')
  if (failed?.status === 'rejected') throw failed.reason
  return data.length
}
