/**
 * An invitation that arrived as a link («…/?invitacion=AB12C-D34EF»). It is kept for this tab from the very
 * first moment, because between the link and the place where it is used there may be a sign-up and a welcome.
 */
const KEY = 'gb.invitacion'

const clean = (code: string) => code.replace(/[^0-9a-z]/gi, '').toUpperCase()

try {
  const arrived = new URLSearchParams(window.location.search).get('invitacion')
  if (arrived && clean(arrived)) sessionStorage.setItem(KEY, clean(arrived))
} catch {
  // Without sessionStorage the code can still be typed in.
}

export function pendingInvite(): string | null {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function clearInvite() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // Nothing to forget.
  }
}

/** «AB12C-D34EF»: how a code is shown and read aloud. */
export const fmtInvite = (code: string) => {
  const tidy = clean(code)
  return tidy.length > 5 ? `${tidy.slice(0, 5)}-${tidy.slice(5)}` : tidy
}

export const inviteLink = (code: string) => `${window.location.origin}/?invitacion=${fmtInvite(code)}`

/** Why an invitation was turned down, in words. The server only gives the reason's name. */
export function inviteProblem(reason: string): string {
  if (reason.includes('invitacion_no_vale')) return 'Ese código no vale o ha caducado. Pide uno nuevo.'
  if (reason.includes('invitacion_propia')) return 'Ese es tu propio código: es para la otra persona.'
  if (reason.includes('ya_emparejado')) return 'Uno de los dos ya lee con otra persona.'
  return 'No he podido usar ese código. Prueba otra vez.'
}
