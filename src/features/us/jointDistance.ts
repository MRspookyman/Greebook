import type { Reading } from '@/lib/types'

type Progress = Pick<Reading, 'unit' | 'total_units' | 'current_position'>

/** Compare unlike formats on the current reader's scale, never pages against minutes. */
export function jointDistance(mine: Progress, theirs: Progress, partnerName: string): string {
  const partnerPosition =
    mine.unit === theirs.unit
      ? theirs.current_position
      : (theirs.current_position / theirs.total_units) * mine.total_units
  const delta = Math.round(partnerPosition - mine.current_position)
  if (delta === 0) return 'Vais a la par'
  const amount = new Intl.NumberFormat('es').format(Math.abs(delta))
  const unit =
    mine.unit === 'minutes'
      ? Math.abs(delta) === 1
        ? 'minuto'
        : 'minutos'
      : Math.abs(delta) === 1
        ? 'página'
        : 'páginas'
  return delta > 0 ? `${partnerName} te lleva ${amount} ${unit}` : `Le llevas ${amount} ${unit}`
}
