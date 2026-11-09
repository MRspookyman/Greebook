// A worker can restart while the app stays open, so answer probes as well as reporting changes.
export function reportDisplayMode() {
  if (!('serviceWorker' in navigator)) return

  const displayMode = window.matchMedia('(display-mode: standalone)')
  const status = () => ({
    type: 'display-mode',
    standalone:
      displayMode.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
  })
  const report = () => {
    navigator.serviceWorker.controller?.postMessage(status())
    void navigator.serviceWorker.ready.then((registration) => {
      registration.active?.postMessage(status())
    })
  }

  navigator.serviceWorker.addEventListener('message', (event: MessageEvent<unknown>) => {
    const data = event.data
    if (typeof data === 'object' && data !== null && 'type' in data && data.type === 'get-display-mode') {
      event.ports[0]?.postMessage(status())
    }
  })
  navigator.serviceWorker.addEventListener('controllerchange', report)
  document.addEventListener('visibilitychange', report)
  displayMode.addEventListener('change', report)
  report()
}
