/**
 * Whether this phone's owner already knows the gesture: how many times a candle has been lit here.
 * Kept per device, like any habit of the hand.
 */
const KEY = 'gb.encendidas'
/** After this many, the room stops explaining how a candle is lit. */
const ENOUGH = 3

export function knowsTheGesture(): boolean {
  try {
    return Number(localStorage.getItem(KEY)) >= ENOUGH
  } catch {
    return false
  }
}

export function litOnce() {
  try {
    localStorage.setItem(KEY, String(Number(localStorage.getItem(KEY) ?? 0) + 1))
  } catch {
    // Then it is simply explained again.
  }
}
