/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> }

// A new version waits until the app asks for it («Actualizar»), so it never swaps code under an open screen.
self.addEventListener('message', (event) => {
  const data: unknown = event.data
  if (typeof data === 'object' && data !== null && 'type' in data && data.type === 'SKIP_WAITING') void self.skipWaiting()
})
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// SPA: every navigation serves the precached shell (works offline).
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')))

// Book covers.
const coverStorageOrigin = new URL(
  (import.meta as ImportMeta & { env: { VITE_SUPABASE_URL: string } }).env.VITE_SUPABASE_URL,
).origin
registerRoute(
  ({ url }) => url.hostname === 'books.google.com' || url.hostname === 'covers.openlibrary.org' ||
    (url.origin === coverStorageOrigin && url.pathname.startsWith('/storage/v1/object/public/book-covers/')),
  new CacheFirst({
    cacheName: 'covers',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 60 * 24 * 60 * 60 }),
    ],
  }),
)

interface PushPayload {
  title: string
  body?: string
  url?: string
  tag?: string
  renotify?: boolean
}

self.addEventListener('push', (event) => {
  let payload: PushPayload = { title: 'Greenbook' }
  try {
    payload = event.data?.json() ?? payload
  } catch {
    payload = { title: 'Greenbook', body: event.data?.text() }
  }
  // renotify is supported by the Notifications API but absent from TypeScript's DOM options.
  const options: NotificationOptions & { renotify: boolean } = {
    body: payload.body,
    tag: payload.tag,
    renotify: payload.renotify ?? false,
    icon: '/pwa-192x192.png',
    badge: '/pwa-64x64.png',
    data: { url: payload.url ?? '/' },
  }
  event.waitUntil(self.registration.showNotification(payload.title, options))
})

const standaloneClients = new Set<string>()

self.addEventListener('message', (event) => {
  const source = event.source
  const data: unknown = event.data
  if (
    source && 'type' in source && source.type === 'window' &&
    typeof data === 'object' && data !== null && 'type' in data && data.type === 'display-mode' &&
    'standalone' in data && typeof data.standalone === 'boolean'
  ) {
    if (data.standalone) standaloneClients.add(source.id)
    else standaloneClients.delete(source.id)
  }
})

function askDisplayMode(client: WindowClient): Promise<boolean> {
  return new Promise((resolve) => {
    const channel = new MessageChannel()
    const finish = (standalone: boolean) => {
      clearTimeout(timeout)
      channel.port1.close()
      channel.port2.close()
      if (standalone) standaloneClients.add(client.id)
      else standaloneClients.delete(client.id)
      resolve(standalone)
    }
    // A suspended or older app may not reply. Never let it block a notification launch.
    const timeout = setTimeout(() => finish(false), 300)
    channel.port1.onmessage = (event: MessageEvent<unknown>) => {
      const data = event.data
      finish(
        typeof data === 'object' && data !== null &&
        'type' in data && data.type === 'display-mode' &&
        'standalone' in data && data.standalone === true,
      )
    }
    try {
      client.postMessage({ type: 'get-display-mode' }, [channel.port2])
    } catch {
      finish(false)
    }
  })
}

async function findStandaloneClient(): Promise<WindowClient | undefined> {
  await Promise.all(
    [...standaloneClients].map(async (id) => {
      if (!(await self.clients.get(id))) standaloneClients.delete(id)
    }),
  )
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  const known = windows.find((client) => standaloneClients.has(client.id))
  if (known) return known

  // Worker memory is not persistent: ask live pages rather than guessing from their URLs.
  const standalone = await Promise.all(windows.map(askDisplayMode))
  return windows.find((_, index) => standalone[index])
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(
    (event.notification.data?.url as string | undefined) ?? '/',
    self.registration.scope,
  )
  event.waitUntil(
    (async () => {
      const existing = url.origin === self.location.origin ? await findStandaloneClient() : undefined
      if (existing) {
        try {
          // Focus before navigation while the notification click still grants activation.
          await existing.focus()
          if (await existing.navigate(url.href)) return
        } catch {
          // The app may have closed since discovery; let the browser launch it again.
        }
      }
      await self.clients.openWindow(url.href)
    })(),
  )
})
