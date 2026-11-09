/** One sentence, prioritizing the shared streak over today's partner activity. */
export function dailyReminderBody(current: number, partnerReadToday: boolean, partnerName?: string | null): string {
  if (current > 0) return `Lleváis ${current} días seguidos leyendo los dos`
  if (partnerReadToday) return `${partnerName?.trim() || 'Tu pareja'} ya ha leído hoy`
  return 'Cuando te apetezca'
}
