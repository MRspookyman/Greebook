import type { ReactNode } from 'react'

interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
  disabled?: boolean
}

/** Full-width setting row; the label remains the touch target. */
export function Switch({ checked, onChange, children, disabled }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className="flex min-h-11 w-full items-center justify-between gap-3 text-left disabled:opacity-50"
      onClick={() => onChange(!checked)}
    >
      <span className="min-w-0 wrap-anywhere">{children}</span>
      <span
        aria-hidden
        className={`relative h-[26px] w-[44px] flex-none rounded-full border border-rule transition-colors duration-150 ${checked ? 'bg-accent' : 'bg-track'}`}
      >
        <span
          className="absolute top-[2px] left-[2px] h-5 w-5 rounded-full bg-bg shadow-[0_1px_2px_rgb(0_0_0/0.15)]"
          style={{ transform: checked ? 'translateX(18px)' : 'none', transition: 'transform 140ms var(--ease)' }}
        />
      </span>
    </button>
  )
}
