import type { ReactNode } from 'react'

interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
  disabled?: boolean
}

/** Full-width row with a label and an iOS-style switch (spring knob). */
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
        className={`relative h-[30px] w-[50px] flex-none rounded-full transition-colors duration-200 ${checked ? 'bg-accent' : 'bg-track'}`}
      >
        <span
          className="absolute top-[3px] left-[3px] h-6 w-6 rounded-full bg-surface shadow-[0_1px_3px_rgb(0_0_0/0.2)]"
          style={{ transform: checked ? 'translateX(20px)' : 'none', transition: 'transform 0.35s var(--spring)' }}
        />
      </span>
    </button>
  )
}
