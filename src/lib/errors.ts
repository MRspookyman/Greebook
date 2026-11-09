/** Translate known backend failures without exposing database details. */
export function userMessage(error: unknown, fallback: string): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null
  switch (code) {
    case '23503':
      return 'Ese libro ya no está en tu biblioteca'
    case '23514':
      return 'Algún dato no es válido'
    case '42501':
    case 'PGRST301':
      return 'No tienes permiso para hacer eso'
  }
  // Use this queued-retry message only for operations already saved locally.
  if (error instanceof TypeError) return 'Sin conexión. Se guardará cuando vuelvas a tener red'
  return fallback
}
