import type { SVGProps } from 'react'

/** The few marks the app needs, drawn in one hand: 1.6px round strokes on a 24px grid. */
function Icon({ children, size = 24, ...rest }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  )
}
type P = SVGProps<SVGSVGElement> & { size?: number }

export const Back = (p: P) => <Icon {...p}><path d="M14.5 5.5 8 12l6.5 6.5" /></Icon>
export const Close = (p: P) => <Icon {...p}><path d="M6 6l12 12M18 6 6 18" /></Icon>
export const Plus = (p: P) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>
export const Minus = (p: P) => <Icon {...p}><path d="M5 12h14" /></Icon>
export const More = (p: P) => (
  <Icon {...p}><circle cx="5.5" cy="12" r="0.6" /><circle cx="12" cy="12" r="0.6" /><circle cx="18.5" cy="12" r="0.6" /></Icon>
)
export const Flame = (p: P) => (
  <Icon {...p}><path d="M12 3c3.5 4 5.5 6.8 5.5 10.2A5.5 5.5 0 0 1 12 19a5.5 5.5 0 0 1-5.5-5.8C6.5 10.5 9 9 12 3Z" /><path d="M12 13c1.2 1.3 1.8 2.2 1.8 3.2a1.8 1.8 0 0 1-3.6 0c0-1 .6-1.9 1.8-3.2Z" /></Icon>
)
export const Paper = (p: P) => (
  <Icon {...p}><path d="M6.5 3.5h8l3.5 3.5v13.5h-11.5z" /><path d="M14.5 3.5v3.5h3.5M9.5 11.5h5.5M9.5 15h5.5" /></Icon>
)
export const Envelope = (p: P) => (
  <Icon {...p}><rect x="3.5" y="6" width="17" height="12.5" rx="1.5" /><path d="m4 7 8 6.5L20 7" /></Icon>
)
export const Heart = ({ filled, ...p }: P & { filled?: boolean }) => (
  <Icon {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 19.5s-7-4.3-7-9.5a3.9 3.9 0 0 1 7-2.3A3.9 3.9 0 0 1 19 10c0 5.2-7 9.5-7 9.5Z" />
  </Icon>
)
export const Search = (p: P) => <Icon {...p}><circle cx="11" cy="11" r="6" /><path d="m19.5 19.5-4.2-4.2" /></Icon>
export const Lock = (p: P) => (
  <Icon {...p}><rect x="5.5" y="10.5" width="13" height="9" rx="2" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></Icon>
)
export const Check = (p: P) => <Icon {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Icon>
export const Star = ({ filled, ...p }: P & { filled?: boolean }) => (
  <Icon {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="m12 4 2.4 5 5.4.7-4 3.8 1 5.4L12 16.3 7.2 18.9l1-5.4-4-3.8 5.4-.7z" />
  </Icon>
)
