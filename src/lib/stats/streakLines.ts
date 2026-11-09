import { formatDays } from '../units'
import { coupleStreak, currentStreak } from './streak'

/**
 * The streak line on the reading screen. With a partner it is always «la racha de los dos», the same one Inicio and
 * Nosotros show; alone, your own.
 */
export function streakInvite(mine: Set<string>, theirs: Set<string> | null, today: string, partnerName: string): string {
  if (!theirs) {
    const own = currentStreak(mine, today)
    if (mine.has(today)) return `Hoy ya has leído · racha de ${formatDays(own)}`
    return own > 0 ? `Racha de ${formatDays(own)} · un ratito hoy y sigue` : 'Un ratito hoy y empieza tu racha'
  }
  const { current } = coupleStreak(mine, theirs, today)
  const me = mine.has(today)
  const you = theirs.has(today)
  if (me && you) return `Hoy habéis leído los dos · racha de ${formatDays(current)}`
  if (me) return `Hoy ya has leído · falta ${partnerName} para la racha de los dos`
  if (you) return `${partnerName} ya ha leído hoy · con tu ratito, la racha llega a ${formatDays(current + 1)}`
  return current > 0
    ? `Racha de los dos: ${formatDays(current)} · un ratito hoy y sigue`
    : 'Un ratito hoy y empieza vuestra racha'
}

/** After saving, with the new session's day already in `mine`. */
export function streakAfterSave(mine: Set<string>, theirs: Set<string> | null, today: string, partnerName: string): string {
  if (!theirs) {
    const own = currentStreak(mine, today)
    return own > 1 ? `Racha de ${formatDays(own)}` : 'Hoy empieza una racha'
  }
  const { current } = coupleStreak(mine, theirs, today)
  if (mine.has(today) && !theirs.has(today))
    return current > 0
      ? `Racha de los dos: ${formatDays(current)} · falta ${partnerName} hoy`
      : `Falta ${partnerName} para empezar vuestra racha`
  return current > 0 ? `Racha de los dos: ${formatDays(current)}` : 'Hoy empieza vuestra racha'
}
