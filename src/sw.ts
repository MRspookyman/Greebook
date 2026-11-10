/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> }

// A new version waits until the app asks for it («Actualizar»), so it never swaps code under a lit candle.
self.addEventListener('message', (event) => {
  const data: unknown = event.data
  if (typeof data === 'object' && data !== null && 'type' in data && data.type === 'SKIP_WAITING') void self.skipWaiting()
})
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// The whole app is one page: every navigation gets the precached shell, also offline.
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')))

// Book covers, kept so the shelf looks the same without a connection.
registerRoute(
  // Any image from elsewhere is a cover: found by the search or pasted by hand.
  ({ url, request }) => request.destination === 'image' && url.origin !== self.location.origin,
  new CacheFirst({
    cacheName: 'portadas',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 400, maxAgeSeconds: 90 * 24 * 60 * 60 }),
    ],
  }),
)

interface PushPayload {
  title: string
  body?: string
  url?: string
  tag?: string
}

self.addEventListener('push', (event) => {
  let payload: PushPayload = { title: 'Greenbook' }
  try {
    payload = event.data?.json() ?? payload
  } catch {
    payload = { title: 'Greenbook', body: event.data?.text() }
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png',
      data: { url: payload.url ?? '/' },
    }),
  )
})

// Tapping a notice brings the open app forward at the right place, or opens it.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL((event.notification.data?.url as string | undefined) ?? '/', self.registration.scope)
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const existing = windows.find((client) => new URL(client.url).origin === url.origin)
      if (existing) {
        try {
          await existing.focus()
          if (await existing.navigate(url.href)) return
        } catch {
          // The app may have closed in the meantime; open it again below.
        }
      }
      await self.clients.openWindow(url.href)
    })(),
  )
})
