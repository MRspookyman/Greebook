/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> }

self.skipWaiting()
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// SPA: every navigation serves the precached shell (works offline).
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')))

// Book covers.
registerRoute(
  ({ url }) => url.hostname === 'books.google.com' || url.hostname === 'covers.openlibrary.org',
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
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png',
      data: { url: payload.url ?? '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL((event.notification.data?.url as string | undefined) ?? '/', self.location.origin).href
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const existing = windows[0]
      if (existing) {
        await existing.focus()
        if ('navigate' in existing) await existing.navigate(url)
        return
      }
      await self.clients.openWindow(url)
    })(),
  )
})
