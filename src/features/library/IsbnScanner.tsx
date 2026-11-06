import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { BarcodeFormat } from '@zxing/library'
import { BottomSheet } from '@/components/BottomSheet'

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
      <Camera onScan={onScan} onClose={onClose} />
    </BottomSheet>
  )
}

function Camera({ onScan, onClose }: { onScan: (isbn: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const scanCallback = useRef(onScan)
  scanCallback.current = onScan
  const [error, setError] = useState('')
  useEffect(() => {
    if (!video.current) return
    let disposed = false
    let scanned = false
    let controls: IScannerControls | undefined
    const reader = new BrowserMultiFormatReader()
    reader.possibleFormats = [BarcodeFormat.EAN_13]
    void reader
      .decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } }, audio: false },
        video.current,
        (result, _error, scanner) => {
          if (disposed || scanned || !result) return
          const isbn = result.getText()
          if (!/^97[89]\d{10}$/.test(isbn)) return
          scanned = true
          scanner.stop()
          scanCallback.current(isbn)
        },
      )
      .then((scanner) => {
        controls = scanner
        if (disposed || scanned) scanner.stop()
      })
      .catch((cause: unknown) => {
        if (disposed) return
        const denied =
          cause instanceof Error && ['NotAllowedError', 'PermissionDeniedError', 'SecurityError'].includes(cause.name)
        setError(
          denied
            ? 'Permite la cámara en Ajustes › Safari'
            : 'No se pudo abrir la cámara. Puedes buscar el título o el ISBN.',
        )
      })
    return () => {
      disposed = true
      controls?.stop()
    }
  }, [])
  return (
    <div className="space-y-4">
      {error ? (
        <>
          <p role="alert" className="text-danger">
            {error}
          </p>
          <button className="btn btn-secondary w-full" onClick={onClose}>
            Volver al buscador
          </button>
        </>
      ) : (
        <>
          <video
            ref={video}
            autoPlay
            muted
            playsInline
            className="w-full rounded-xl bg-bg aspect-[4/3] object-cover"
            aria-label="Vista de la cámara"
          />
          <p className="text-muted text-sm">Apunta al código de barras ISBN del libro (978 o 979).</p>
        </>
      )}
    </div>
  )
}
