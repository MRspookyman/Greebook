/**
 * One sentence about what today's reading means for the two of you: if your partner already read and there is a
 * streak, your ratito is what keeps it going.
 */
export function dailyReminderBody(current: number, partnerReadToday: boolean, partnerName?: string | null): string {
  const name = partnerName?.trim() || 'Tu pareja'
  if (current > 0 && partnerReadToday) return `${name} ya ha leído hoy: con tu ratito, la racha llega a ${current + 1} días`
  if (current > 0) return current === 1 ? 'Lleváis 1 día leyendo los dos' : `Lleváis ${current} días seguidos leyendo los dos`
  if (partnerReadToday) return `${name} ya ha leído hoy`
  return 'Cuando te apetezca'
}
