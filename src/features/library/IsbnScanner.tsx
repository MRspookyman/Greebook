import { useEffect, useId, useRef, useState } from 'react'
import type * as DecoderModule from 'barcode-detector/ponyfill'
import { BottomSheet } from '@/components/BottomSheet'

const isbnPattern = /^97[89]\d{10}$/

// Both the decoder and its same-origin WASM are loaded only when the camera opens.
let decoder: Promise<typeof DecoderModule> | undefined
function loadDecoder() {
  decoder ??= Promise.all([
    import('barcode-detector/ponyfill'),
    import('zxing-wasm/reader/zxing_reader.wasm?url'),
  ])
    .then(async ([module, { default: wasmUrl }]) => {
      await module.prepareZXingModule({
        overrides: {
          locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path),
        },
        fireImmediately: true,
      })
      return module
    })
    .catch((cause: unknown) => {
      decoder = undefined
      throw cause
    })
  return decoder
}

export function IsbnScanner({
  open,
  onClose,
  onScan,
}: {
  open: boolean
  onClose: () => void
  onScan: (isbn: string) => void
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Escanear ISBN">
      {open && <Camera onScan={onScan} onClose={onClose} />}
    </BottomSheet>
  )
}

function Camera({ onScan, onClose }: { onScan: (isbn: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const scanCallback = useRef(onScan)
  scanCallback.current = onScan
  const stopCamera = useRef<() => void>(() => {})
  const scanned = useRef(false)
  const [error, setError] = useState('')
  const [isbn, setIsbn] = useState('')
  const inputId = useId()

  const acceptIsbn = (value: string) => {
    if (scanned.current || !isbnPattern.test(value)) return
    scanned.current = true
    stopCamera.current()
    scanCallback.current(value)
  }
  const acceptCallback = useRef(acceptIsbn)
  acceptCallback.current = acceptIsbn

  useEffect(() => {
    const element = video.current
    if (!element) return
    let disposed = false
    let stream: MediaStream | undefined
    let frame = 0
    let lastDetection = -Infinity
    const stop = () => {
      cancelAnimationFrame(frame)
      stream?.getTracks().forEach((track) => track.stop())
      if (element.srcObject === stream) element.srcObject = null
    }
    stopCamera.current = stop

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        })
        if (disposed || scanned.current) {
          stop()
          return
        }
        element.srcObject = stream
        await element.play()
        const track = stream.getVideoTracks()[0]
        const capabilities = track?.getCapabilities?.() as
          | (MediaTrackCapabilities & { focusMode?: string[] })
          | undefined
        if (capabilities?.focusMode?.includes('continuous')) {
          // Safari's DOM typings do not yet include the Image Capture focus constraints.
          await track.applyConstraints({
            advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet],
          }).catch(() => {})
        }
        if (disposed || scanned.current) return
        const { BarcodeDetector } = await loadDecoder()
        if (disposed || scanned.current) return
        const detector = new BarcodeDetector({ formats: ['ean_13'] })
        const detect = async (now: number) => {
          if (disposed || scanned.current) return
          if (now - lastDetection >= 200 && element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            lastDetection = now
            try {
              const results = await detector.detect(element)
              if (disposed || scanned.current) return
              const result = results.find(({ rawValue }) => isbnPattern.test(rawValue))
              if (result) {
                acceptCallback.current(result.rawValue)
                return
              }
            } catch {
              if (disposed || scanned.current) return
              stop()
              setError('No se pudo leer el código. Puedes escribir el ISBN.')
              return
            }
          }
          if (!disposed && !scanned.current) frame = requestAnimationFrame((time) => void detect(time))
        }
        frame = requestAnimationFrame((time) => void detect(time))
      } catch (cause: unknown) {
        stop()
        if (disposed || scanned.current) return
        const denied =
          cause instanceof Error && ['NotAllowedError', 'PermissionDeniedError', 'SecurityError'].includes(cause.name)
        setError(
          denied
            ? 'Permite la cámara en Ajustes › Safari'
            : 'No se pudo abrir la cámara. Puedes buscar el título o el ISBN.',
        )
      }
    }
    void start()
    return () => {
      disposed = true
      stop()
    }
  }, [])
  return (
    <div className="space-y-4">
      {error ? (
        <>
          <p role="alert" className="text-danger">
            {error}
          </p>
          <button className="btn btn-outline w-full" onClick={onClose}>
            Volver al buscador
          </button>
        </>
      ) : (
        <>
          <div className="relative overflow-hidden rounded-md">
            <video
              ref={video}
              autoPlay
              muted
              playsInline
              className="aspect-[4/3] w-full rounded-md border border-rule bg-bg object-cover"
              aria-label="Vista de la cámara"
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
              <div className="h-1/3 w-4/5 rounded-md border-2 border-white shadow-[0_0_0_999px_rgb(0_0_0_/_0.2)]" />
            </div>
          </div>
          <p className="text-muted text-sm">Centra el código de barras</p>
        </>
      )}
      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault()
          acceptIsbn(isbn)
        }}
      >
        <label htmlFor={inputId} className="block text-sm">Escribe el ISBN</label>
        <div className="flex gap-2">
          <input
            id={inputId}
            className="input min-w-0 flex-1"
            inputMode="numeric"
            autoComplete="off"
            pattern="97[89][0-9]{10}"
            maxLength={13}
            required
            placeholder="978…"
            value={isbn}
            onChange={(event) => setIsbn(event.target.value.replace(/\D/g, '').slice(0, 13))}
          />
          <button type="submit" className="btn btn-primary" disabled={!isbnPattern.test(isbn)}>
            Buscar
          </button>
        </div>
      </form>
    </div>
  )
}
