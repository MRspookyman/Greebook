import { useId } from 'react'

/** A little light on the wall; the existing interactive candles sit in front. */
export function RoomScene() {
  const id = useId()
  return (
    <svg className="room-scene-art" viewBox="0 0 360 280" fill="none" aria-hidden>
      <defs>
        <linearGradient id={id + 'wall'} x1="180" y1="16" x2="180" y2="275" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--room-arch-high)" />
          <stop offset="1" stopColor="var(--room-arch-low)" />
        </linearGradient>
        <radialGradient id={id + 'light'}>
          <stop stopColor="#f6cf87" stopOpacity=".45" />
          <stop offset="1" stopColor="#f6cf87" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M46 275V150a134 134 0 0 1 268 0v125Z" fill={`url(#${id}wall)`} />
      <path d="M54 274V150a126 126 0 0 1 252 0v124" stroke="var(--room-arch-line)" strokeWidth=".8" />
      <path d="M42 275V150a138 138 0 0 1 276 0v125" stroke="var(--room-arch-line)" strokeWidth=".6" opacity=".65" />
      <ellipse className="room-wall-light" cx="185" cy="171" rx="145" ry="128" fill={`url(#${id}light)`} />
      <g stroke="var(--room-leaf)" strokeWidth="1" strokeLinecap="round">
        <path d="M31 271c-12-50-8-91 5-129M26 238c-16-5-20-20-18-31 13 4 19 16 18 31ZM24 211c14-5 20-17 20-27-14 4-20 14-20 27ZM27 184c-12-6-14-17-12-27 11 5 14 14 12 27ZM32 161c12-6 17-16 16-26-12 4-17 13-16 26Z" />
        <path
          d="M330 273c9-34 9-62 2-87m1 61c13-3 19-13 20-23-13 2-19 11-20 23Zm2-22c-12-3-17-11-18-20 11 2 17 9 18 20Zm-2-22c9-5 12-13 11-21-10 4-12 11-11 21Z"
          opacity=".7"
        />
      </g>
      <g fill="var(--room-leaf)" opacity=".13">
        <path d="M26 238c-16-5-20-20-18-31 13 4 19 16 18 31ZM24 211c14-5 20-17 20-27-14 4-20 14-20 27ZM27 184c-12-6-14-17-12-27 11 5 14 14 12 27Z" />
      </g>
      <g stroke="var(--room-gold)" strokeWidth=".9" strokeLinecap="round">
        <path d="M211 53a13 13 0 1 0 15 16 14 14 0 0 1-15-16Z" fill="var(--room-gold)" fillOpacity=".2" />
        <path d="M135 70v9m-4.5-4.5h9M259 123v7m-3.5-3.5h7M173 42v5m-2.5-2.5h5" />
      </g>
      <g className="room-motes" fill="#e6bd72">
        <circle cx="120" cy="122" r="1.5" />
        <circle cx="244" cy="98" r="1" />
        <circle cx="185" cy="88" r="1.2" />
      </g>
    </svg>
  )
}

/** A quiet still life under the books, drawn in the same ink as the room. */
export function ReadingStillLife() {
  return (
    <div className="reading-still-life" aria-hidden>
      <svg viewBox="0 0 280 120" fill="none">
        <ellipse cx="144" cy="103" rx="101" ry="7" fill="currentColor" opacity=".045" />
        <path d="m56 77 118-5 15 12-117 5Z" fill="var(--you)" fillOpacity=".19" />
        <path d="m59 91 127-5 14 11-127 5Z" fill="var(--me)" fillOpacity=".18" />
        <g stroke="currentColor" strokeWidth="1.05" strokeLinecap="round" strokeLinejoin="round">
          <path d="m56 77 118-5 15 12-117 5Z M56 77v10l16 12 117-5V84M72 89v10m3-5 109-5m-125 2 14 11 127-5V87m-125 10 110-5" />
          <path d="m89 78 53-2m-49 5 38-1" opacity=".5" />
          <path d="M203 66h31l-3 24c-6 7-19 7-25 0Zm31 4c17-4 15 16-2 14M198 95c11 7 31 8 42 0" />
          <path className="reading-steam" d="M215 55c-10-10 9-12 0-23m10 24c-6-7 6-11 1-17" opacity=".4" />
          <path
            d="M43 96c-5-21-5-39 2-57m-3 38C26 77 24 66 25 59c11 2 16 10 17 18Zm0-13c13-2 18-12 18-19-10 3-16 9-18 19Zm2-20c-10-1-15-9-15-16 11 2 15 8 15 16Z"
            opacity=".7"
          />
        </g>
        <path d="m131 88 9-.5v18l-4-3-5 3Z" fill="var(--me)" />
      </svg>
      <p>Solo una página más…</p>
    </div>
  )
}
