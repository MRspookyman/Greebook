export type IntensityLevel = 0 | 1 | 2 | 3 | 4

export function level(score: number): IntensityLevel {
  if (score <= 0) return 0
  if (score <= 10) return 1
  if (score <= 30) return 2
  if (score <= 60) return 3
  return 4
}

const MIX = [0, 20, 40, 65, 90] as const

/** CSS background for a level in the given color variable (default the user's accent). */
export function levelColor(lvl: IntensityLevel, colorVar = '--accent'): string {
  return `color-mix(in srgb, var(${colorVar}) ${MIX[lvl]}%, var(--surface))`
}
