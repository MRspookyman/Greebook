import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enablePush, getPushState, signOutWithPushCleanup, syncPushSubscription } from './push'

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), signOut: vi.fn() }))
vi.mock('./supabase', () => ({ supabase: { rpc: mocks.rpc, from: mocks.from, auth: { signOut: mocks.signOut } } }))

const subscription = {
  endpoint: 'https://push.example/device',
  toJSON: () => ({ endpoint: 'https://push.example/device', keys: { p256dh: 'public-key', auth: 'auth-key' } }),
  unsubscribe: vi.fn(),
}
const getSubscription = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'AQID')
  vi.stubGlobal('window', { PushManager: {}, Notification: {}, matchMedia: () => ({ matches: true }) })
  vi.stubGlobal('Notification', { permission: 'granted', requestPermission: vi.fn().mockResolvedValue('granted') })
  const registration = { pushManager: { getSubscription } }
  vi.stubGlobal('navigator', {
    serviceWorker: { ready: Promise.resolve(registration), getRegistration: vi.fn().mockResolvedValue(registration) },
  })
  getSubscription.mockResolvedValue(subscription)
  subscription.unsubscribe.mockResolvedValue(true)
  mocks.rpc.mockResolvedValue({ error: null })
  mocks.signOut.mockResolvedValue({ error: null })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('push account privacy', () => {
  it('claims the existing browser subscription on signed-in startup', async () => {
    await syncPushSubscription()
    expect(mocks.rpc).toHaveBeenCalledWith('claim_push_subscription', {
      p_endpoint: subscription.endpoint, p_p256dh: 'public-key', p_auth: 'auth-key',
    })
  })

  it('uses the same claim RPC when enabling push', async () => {
    expect(await enablePush()).toBe('enabled')
    expect(mocks.rpc).toHaveBeenCalledWith('claim_push_subscription', expect.any(Object))
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('does not prompt or claim without granted permission', async () => {
    vi.stubGlobal('Notification', { permission: 'default' })
    await syncPushSubscription()
    expect(getSubscription).not.toHaveBeenCalled()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('does not report enabled when the database subscription is missing', async () => {
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }
    mocks.from.mockReturnValue(query)
    expect(await getPushState()).toBe('default')
    expect(query.eq).toHaveBeenCalledWith('endpoint', subscription.endpoint)
  })

  it('deletes only this account and endpoint, then unsubscribes before signing out', async () => {
    const order: string[] = []
    const query = {
      delete: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      abortSignal: vi.fn().mockImplementation(async () => { order.push('delete'); return { error: null } }),
    }
    mocks.from.mockReturnValue(query)
    subscription.unsubscribe.mockImplementation(async () => { order.push('unsubscribe'); return true })
    mocks.signOut.mockImplementation(async () => { order.push('signOut'); return { error: null } })
    await signOutWithPushCleanup('current-user')
    expect(query.eq).toHaveBeenCalledWith('user_id', 'current-user')
    expect(query.eq).toHaveBeenCalledWith('endpoint', subscription.endpoint)
    expect(order).toEqual(['delete', 'unsubscribe', 'signOut'])
  })

  it('still unsubscribes and signs out if deleting the server row fails', async () => {
    const query = {
      delete: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      abortSignal: vi.fn().mockRejectedValue(new Error('offline')),
    }
    mocks.from.mockReturnValue(query)
    await signOutWithPushCleanup('current-user')
    expect(subscription.unsubscribe).toHaveBeenCalledOnce()
    expect(mocks.signOut).toHaveBeenCalledOnce()
  })

  it('still signs out if the browser cannot unsubscribe', async () => {
    vi.stubGlobal('navigator', { serviceWorker: { getRegistration: vi.fn().mockRejectedValue(new Error('browser error')) } })
    await signOutWithPushCleanup('current-user')
    expect(mocks.signOut).toHaveBeenCalledOnce()
  })
})
