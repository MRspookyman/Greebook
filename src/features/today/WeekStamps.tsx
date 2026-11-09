import type { CSSProperties } from 'react'
import { Heart, Moon } from 'lucide-react'
import { fmt } from '@/lib/dates'
import { weekDays } from '@/lib/stats/insights'
import type { Profile } from '@/lib/types'

const LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const TILT = [-6, 4, -3, 6, -5, 3, -4]

/** This week as stamps: a heart when both of you read, half filled in someone's colour when only one did. */
export function WeekStamps({
  today,
  mine,
  theirs,
  profile,
  partner,
  wildcards,
}: {
  wildcards?: Set<string>
  today: string
  mine: Set<string>
  theirs: Set<string>
  profile: Profile
  partner: Profile | null
}) {
  return (
    <div className="grid grid-cols-7 gap-1 text-center" role="list" aria-label="Esta semana">
      {weekDays(today).map((date, index) => {
        const me = mine.has(date)
        const you = theirs.has(date)
        const isToday = date === today
        const future = date > today
        const who = me ? profile : partner
        const free = wildcards?.has(date) ?? false
        const text =
          me && you
            ? 'leísteis los dos'
            : me
              ? 'solo leíste tú'
              : you
                ? `solo leyó ${partner?.display_name}`
                : 'sin lectura'
        return (
          <div
            key={date}
            role="listitem"
            className={`grid justify-items-center gap-1.5 text-xs font-extrabold ${isToday ? 'text-ink' : 'text-muted'}`}
          >
            <span
              className={`stamp ${me && you ? 'stamp-both' : free ? 'stamp-free' : me || you ? 'stamp-one' : ''} ${isToday && !(me && you) ? 'stamp-pending' : ''} ${future ? 'opacity-50' : ''}`}
              style={
                { '--rot': `${TILT[index]}deg`, '--pc': who ? `var(--${who.accent})` : undefined } as CSSProperties
              }
              role="img"
              aria-label={`${fmt(date, 'EEEE d')}: ${future ? 'aún no ha llegado' : text}${free ? ', cubierto con un comodín' : ''}${isToday && !me ? '; falta tu parte' : ''}`}
            >
              {me && you && <Heart size={15} fill="currentColor" aria-hidden />}
              {free && <Moon size={14} fill="currentColor" aria-hidden />}
            </span>
            <span aria-hidden>{LETTERS[index]}</span>
          </div>
        )
      })}
    </div>
  )
}
