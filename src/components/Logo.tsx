/** "Greenbook" wordmark; always green regardless of the user's accent. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 text-green" style={{ fontSize: size * 0.8 }}>
      <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden>
        <g fill="none" stroke="currentColor" strokeWidth="28" strokeLinejoin="round" strokeLinecap="round">
          <path d="M256 158c-38-30-96-40-156-36v236c60-4 118 6 156 36" />
          <path d="M256 158c38-30 96-40 156-36v236c-60-4-118 6-156 36" />
          <path d="M256 158v236" />
        </g>
      </svg>
      <span className="font-serif font-semibold">Greenbook</span>
    </span>
  )
}
