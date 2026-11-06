import type { ReactNode } from 'react'

/** Line illustration of an open book in `--muted`. */
function BookIllustration() {
  return (
    <svg
      width="96"
      height="72"
      viewBox="0 0 96 72"
      fill="none"
      stroke="var(--muted)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M48 16c-8-6-20-8-32-7v46c12-1 24 1 32 7" />
      <path d="M48 16c8-6 20-8 32-7v46c-12-1-24 1-32 7" />
      <path d="M48 16v46" />
      <path d="M24 22h14M24 30h14M24 38h10M58 22h14M58 30h14M58 38h10" opacity=".5" />
    </svg>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-10 px-6">
      <BookIllustration />
      <p className="font-serif font-semibold text-lg">{title}</p>
      {children}
    </div>
  )
}
