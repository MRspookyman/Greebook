/* oxlint-disable react/immutability -- the drawing loop keeps its own mutable state inside one effect; nothing here is render state */
import { useEffect, useRef, type RefObject } from 'react'
import { glowOf } from '@/lib/candle'

interface Props {
  /** What holds each candle's drawing; the wall finds the wick inside. Theirs may be missing when you read alone. */
  mine: RefObject<HTMLElement | null>
  theirs: RefObject<HTMLElement | null>
  mineLit: boolean
  theirsLit: boolean
  /** What is left of each candle, 1 → 0: a spent one lights less of the wall. */
  mineWax: number
  theirWax: number
  /** The words on screen: the wall goes quiet behind them. */
  quiet: RefObject<HTMLElement | null>
  /** Changes with each wink received, and with each one sent. */
  winkIn: number
  winkOut: number
}

interface Light { who: 'mine' | 'theirs'; x: number; y: number; r: number; gain: number }
interface Body { who: 'mine' | 'theirs'; x0: number; x1: number; y0: number; y1: number }
interface Moth { x: number; y: number; vx: number; vy: number; placed: boolean; home: 'mine' | 'theirs'; dir: number; seed: number; speed: number; phase: number; rest: number; scared: number; visit: number }
interface Ring { x: number; y: number; t: number; life: number; speed: number; k: number }

const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s) }
function noise(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
const clamp = (v: number, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v)

/** From the faintest sign to the densest: the more light reaches a cell of the wall, the further along. */
const RAMP = '  .·:-~=+*'
/** Ordered dithering: between one sign and the next a cell decides by a fixed pattern, so the light fades without rings. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((n) => (n + 0.5) / 16)
/** Dim amber to cream, in twelve steps. */
const TONES = Array.from({ length: 12 }, (_, i) => {
  const t = i / 11, mix = (a: number, b: number) => Math.round(a + (b - a) * t)
  return `rgb(${mix(150, 255)},${mix(96, 241)},${mix(40, 194)})`
})
const FLAP = ['\\o/', '-o-', '/o\\', '-o-']
const FPS = 24

/** Whether the straight line from a flame to a point of the wall crosses a candle's body. */
function blocked(ax: number, ay: number, bx: number, by: number, r: Body): boolean {
  let t0 = 0, t1 = 1
  const dx = bx - ax, dy = by - ay
  for (const [p, q] of [[-dx, ax - r.x0], [dx, r.x1 - ax], [-dy, ay - r.y0], [dy, r.y1 - ay]]) {
    if (p === 0) { if (q < 0) return false; continue }
    const t = q / p
    if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t } else { if (t < t0) return false; if (t < t1) t1 = t }
  }
  return true
}

/**
 * The wall behind the candles, drawn in signs: each cell shows a denser, brighter one the more candlelight
 * reaches it. The light leans and dips with the flames (it is what sways them), draws in as the candles burn
 * down, and is cut by the candles' own bodies. Three moths circle the flames and throw their shadows on it.
 *
 * It is scenery: it reads nothing and decides nothing. It runs at a low frame rate, only where there is light,
 * stops while the screen is hidden, and stands still under «reduce motion».
 */
export function CandleWall({ mine, theirs, mineLit, theirsLit, mineWax, theirWax: theirsWax, quiet, winkIn, winkOut }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  /** What the loop reads each frame; kept in a ref so new props never restart it. */
  const live = useRef({ mineLit, theirsLit, mineWax, theirsWax })
  const poke = useRef<{ measure: () => void; wink: (from: 'mine' | 'theirs') => void } | null>(null)

  useEffect(() => {
    live.current = { mineLit, theirsLit, mineWax, theirsWax }
    poke.current?.measure()
  }, [mineLit, theirsLit, mineWax, theirsWax])
  // The first value is just where the counters stand when the screen opens: nothing has been sent yet.
  const seen = useRef({ winkIn, winkOut })
  useEffect(() => {
    if (winkIn !== seen.current.winkIn) poke.current?.wink('theirs')
    if (winkOut !== seen.current.winkOut) poke.current?.wink('mine')
    seen.current = { winkIn, winkOut }
  }, [winkIn, winkOut])

  useEffect(() => {
    const el = canvas.current, stage = el?.parentElement
    const ctx = el?.getContext('2d')
    if (!el || !stage || !ctx) return
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches

    let W = 0, H = 0, cw = 7, ch = 12, cols = 0, rows = 0
    /** The wall's own time, in seconds: it only moves while frames are drawn. */
    const clock = { t: 0 }
    let lights: Light[] = [], bodies: Body[] = [], hush: { x0: number; x1: number; y0: number; y1: number } | null = null
    const rings: Ring[] = []
    let shiver = 0
    const intensity = { mine: live.current.mineLit ? 1 : 0, theirs: live.current.theirsLit ? 1 : 0 }
    const sway = { mine: { lean: 0, power: 1 }, theirs: { lean: 0, power: 1 } }
    const moths: Moth[] = Array.from({ length: 3 }, (_, i) => ({
      x: 0, y: 0, vx: 0, vy: 0, placed: false, home: i === 1 ? 'theirs' : 'mine', dir: i % 2 ? 1 : -1,
      seed: 10 + i * 7.3, speed: 62 + i * 14, phase: i * 2, rest: 0, scared: 0, visit: 0,
    }))

    function layout() {
      const dpr = Math.min(2, devicePixelRatio || 1)
      W = stage!.clientWidth; H = stage!.clientHeight
      el!.width = Math.round(W * dpr); el!.height = Math.round(H * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      cw = W / Math.max(1, Math.round(W / 6.6)); ch = cw * 1.75
      cols = Math.ceil(W / cw); rows = Math.ceil(H / ch) + 1
      measure()
    }
    /** Where the flames and the candles' bodies are on screen now, and how far each still lights. */
    function measure() {
      const base = el!.getBoundingClientRect()
      const next: Light[] = [], solid: Body[] = []
      for (const [who, holder, wax] of [['mine', mine.current, live.current.mineWax], ['theirs', theirs.current, live.current.theirsWax]] as const) {
        const svg = holder?.querySelector('svg')
        if (!svg) continue
        const box = svg.getBoundingClientRect(), unit = box.width / 120
        if (!unit) continue
        // The same sums as the drawing: the wax's height, its rim, and the flame above the wick.
        const top = 212 - (62 + 86 * clamp(wax)), glow = glowOf(wax)
        solid.push({ who, x0: box.left - base.left + 38 * unit, x1: box.left - base.left + 82 * unit, y0: box.top - base.top + (top + 4) * unit, y1: box.top - base.top + 217 * unit })
        const size = who === 'mine' ? 1 : 0.55
        next.push({ who, x: box.left - base.left + 60 * unit, y: box.top - base.top + (top - 29) * unit, r: Math.min(240, W * 0.58) * size * glow.reach, gain: (who === 'mine' ? 1 : 0.62) * glow.strength })
      }
      lights = next; bodies = solid
      const q = quiet.current?.getBoundingClientRect()
      hush = q ? { x0: q.left - base.left, x1: q.right - base.left, y0: q.top - base.top + 10, y1: q.bottom - base.top } : null
    }

    /** Each flame's sway: where it leans and how much it gives right now. The drawn flame and the wall both follow it. */
    function breathe(dt: number) {
      for (const [who, k] of [['mine', 0], ['theirs', 31]] as const) {
        // Mostly a slight tremor; now and then a draught lays it over and the light drops.
        const gust = Math.max(0, noise(clock.t * 0.22 + k, 3) - 0.62) * 2.6
        sway[who].lean = (noise(clock.t * 0.7 + k, 1) - 0.5) * 0.5 + (noise(clock.t * 2.6 + k, 2) - 0.5) * 0.22 + gust * (noise(clock.t * 1.4 + k, 5) - 0.5) * 2.2
        // Several independent signals added up (slow, medium and a flame's fast tremor), with a floor.
        sway[who].power = Math.max(0.62, 1 + (noise(clock.t * 1.3 + k, 7) - 0.5) * 0.14 + (noise(clock.t * 4.1 + k, 8) - 0.5) * 0.09 + Math.sin(clock.t * 62 + k) * 0.018 - gust * 0.34)
      }
      if (shiver > 0) { shiver = Math.max(0, shiver - dt); sway.mine.lean += Math.sin(clock.t * 26) * shiver * 0.9; sway.mine.power -= shiver * 0.2 }
      for (const [who, holder] of [['mine', mine.current], ['theirs', theirs.current]] as const) {
        const flame = holder?.querySelector<SVGGElement>('[data-sway]')
        if (flame) flame.style.transform = `rotate(${(sway[who].lean * 14).toFixed(2)}deg) scale(${(1 - (sway[who].power - 1) * 0.5).toFixed(3)}, ${(0.4 + sway[who].power * 0.6).toFixed(3)})`
      }
    }
    function lightAt(x: number, y: number, shadows: boolean) {
      let total = 0
      for (const l of lights) {
        const k = intensity[l.who]
        if (k < 0.01) continue
        const w = sway[l.who], r = l.r * (0.8 + 0.2 * w.power), ox = w.lean * 22
        const dx = x - l.x - w.lean * (22 + Math.max(0, l.y - y) * 0.16), dy = (y - l.y) * (y < l.y ? 0.72 : 1.25)
        let part = k * l.gain * w.power / Math.pow(1 + (dx * dx + dy * dy) / (r * r), 1.35)
        if (shadows && part > 0.02) {
          // A flame is not a point: three rays across its width give the shadow a soft edge.
          for (const body of bodies) {
            let hit = 0
            for (const off of [-7, 0, 7]) if (blocked(l.x + ox + off, l.y, x, y, body)) hit++
            // The other candle cuts nearly all of it; its own only darkens what lies below it.
            if (hit) part *= 1 - (body.who === l.who ? 0.5 : 0.82) * hit / 3
          }
        }
        total += part
      }
      return total
    }
    const dimAt = (x: number, y: number) =>
      !hush ? 1 : 0.08 + 0.92 * clamp(Math.hypot(Math.max(hush.x0 - x, 0, x - hush.x1), Math.max(hush.y0 - y, 0, y - hush.y1)) / (cw * 8))
    const flameFor = (m: Moth) => {
      const want = m.visit > 0 ? 'mine' : m.home
      return lights.find((l) => l.who === want && intensity[want] > 0.5) ?? lights.find((l) => intensity[l.who] > 0.5) ?? null
    }

    function stepMoths(dt: number) {
      for (const m of moths) {
        if (!m.placed) { m.x = W * (0.2 + hash(m.seed, 1) * 0.6); m.y = H * (0.1 + hash(m.seed, 2) * 0.3); m.placed = true }
        m.scared = Math.max(0, m.scared - dt); m.visit = Math.max(0, m.visit - dt)
        const f = m.scared > 0 ? null : flameFor(m)
        const wander = noise(m.seed, clock.t * 0.35) * Math.PI * 4
        let wx = 0, wy = 0
        if (m.rest > 0) m.rest -= dt
        else if (f) {
          // A wide orbit round the flame that opens and closes.
          const rx = m.x - f.x, ry = m.y - (f.y - 20), d = Math.hypot(rx, ry) || 1
          const radius = (f.who === 'mine' ? 34 : 24) + noise(m.seed + 3, clock.t * 0.2) * (f.who === 'mine' ? 110 : 50)
          const pull = (radius - d) * 1.6
          wx = (-ry / d) * m.dir * m.speed + (rx / d) * pull + Math.cos(wander) * 22
          wy = (rx / d) * m.dir * m.speed + (ry / d) * pull + Math.sin(wander) * 22
          if (Math.random() < dt * 0.05 && d > 60) m.rest = 2 + Math.random() * 4
        } else { wx = Math.cos(wander) * 26; wy = Math.sin(wander) * 26 - 5 }
        const k = Math.min(1, dt * (m.scared > 0 ? 0.7 : 2.2))
        m.vx += (wx - m.vx) * k; m.vy += (wy - m.vy) * k
        m.x += m.vx * dt; m.y += m.vy * dt
        if (m.x < 16) m.vx += 160 * dt
        if (m.x > W - 16) m.vx -= 160 * dt
        if (m.y < 16) m.vy += 160 * dt
        if (m.y > H * 0.86) m.vy -= 160 * dt
        m.phase += dt * (m.rest > 0 ? 0 : 12)
      }
    }

    function draw(dt: number) {
      clock.t += dt
      const now = live.current
      intensity.mine += ((now.mineLit ? 1 : 0) - intensity.mine) * Math.min(1, dt * 2.4)
      intensity.theirs += ((now.theirsLit ? 1 : 0) - intensity.theirs) * Math.min(1, dt * 2.4)
      for (let i = rings.length - 1; i >= 0; i--) if (clock.t - rings[i].t >= rings[i].life) rings.splice(i, 1)
      ctx!.clearRect(0, 0, W, H)
      breathe(dt)
      stepMoths(dt)

      ctx!.font = `${(ch * 0.82).toFixed(1)}px ui-monospace, Menlo, Consolas, monospace`
      ctx!.textAlign = 'center'; ctx!.textBaseline = 'middle'
      const shadows = moths.flatMap((m) => {
        const f = flameFor(m)
        return f ? [{ x: f.x + (m.x - f.x) * 2.1, y: f.y + (m.y - f.y) * 2.1, rx: 20 * (0.75 + 0.25 * Math.sin(m.phase * 1.57)), k: intensity[f.who] }] : []
      })
      let last = -1
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const x = c * cw + cw / 2, y = r * ch + ch / 2
        let v = lightAt(x, y, true)
        let ring = 0
        for (const g of rings) { const age = clock.t - g.t; ring += g.k * (1 - age / g.life) * Math.exp(-(((Math.hypot(x - g.x, y - g.y) - age * g.speed) / 22) ** 2)) }
        // Where no light reaches there is nothing to draw, and nothing to work out.
        if (v < 0.04 && ring < 0.02) continue
        // The air: two noise fields drifting upwards that cross, like a net of light.
        const a = noise(x * 0.011 + clock.t * 0.09, y * 0.011 + clock.t * 0.3), b = noise(x * 0.019 - clock.t * 0.12, y * 0.019 + clock.t * 0.42 + 40)
        v *= 0.55 + 0.45 * (0.45 * a + 0.55 * clamp(1 - Math.abs(a - b) * 3.4))
        // Each moth's shadow, thrown large on the wall.
        for (const sh of shadows) { const q = ((x - sh.x) / sh.rx) ** 2 + ((y - sh.y) / 11) ** 2; if (q < 4) v *= 1 - 0.85 * sh.k * Math.exp(-q * 1.3) }
        v = (v + ring) * dimAt(x, y)
        // The eye does not read light in a straight line: it is compressed so every step of the fade weighs the same.
        v = Math.pow(clamp(v - 0.035), 0.72)
        const glyph = RAMP[clamp(Math.round(v * (RAMP.length - 1) + (BAYER[(r & 3) * 4 + (c & 3)] - 0.5) * 0.9), 0, RAMP.length - 1)]
        if (glyph === ' ') continue
        const tone = Math.min(TONES.length - 1, (v * TONES.length) | 0)
        if (last !== tone) { ctx!.fillStyle = TONES[tone]; last = tone }
        ctx!.globalAlpha = Math.min(0.95, 0.2 + v * 1.15)
        ctx!.fillText(glyph, x, y)
      }

      ctx!.font = '600 10px ui-monospace, Menlo, Consolas, monospace'
      for (const m of moths) {
        const light = lightAt(m.x, m.y, false)
        ctx!.save()
        ctx!.translate(m.x, m.y); ctx!.rotate(clamp(m.vx * 0.004, -0.45, 0.45))
        ctx!.globalAlpha = clamp(0.22 + light * 1.1) * dimAt(m.x, m.y)
        ctx!.fillStyle = light > 0.5 ? '#fff1c2' : '#e8d3a0'
        ctx!.fillText(m.rest > 0 ? '/o\\' : FLAP[Math.floor(m.phase) % 4], 0, 0)
        ctx!.restore()
      }
      ctx!.globalAlpha = 1
    }

    // ── The loop: a low frame rate, and none at all while the screen is hidden ──
    const loop = { raf: 0, last: 0, sinceMeasure: 0 }
    function frame(ms: number) {
      loop.raf = requestAnimationFrame(frame)
      if (ms - loop.last < 1000 / FPS) return
      const dt = Math.min(0.1, (ms - loop.last) / 1000)
      loop.last = ms
      // Sheets, the keyboard and the candle burning down all move things: look again now and then.
      if ((loop.sinceMeasure += dt) > 1) { loop.sinceMeasure = 0; measure() }
      draw(dt)
    }
    /** Without motion the wall is one settled picture, redrawn only when something changes. */
    const settle = () => { for (let i = 0; i < 30; i++) draw(0.1) }
    function run() {
      cancelAnimationFrame(loop.raf)
      if (still) settle()
      else if (!document.hidden) loop.raf = requestAnimationFrame(frame)
    }
    const resized = new ResizeObserver(() => { layout(); if (still) settle() })
    resized.observe(stage)
    document.addEventListener('visibilitychange', run)

    // A touch on the wall: a breath of light, and the moths near it bolt.
    const touched = (event: PointerEvent) => {
      if ((event.target as Element).closest('button, a, input, textarea, [role="dialog"]')) return
      const base = el.getBoundingClientRect(), px = event.clientX - base.left, py = event.clientY - base.top
      rings.push({ x: px, y: py, t: clock.t, life: 1.3, speed: 190, k: 0.35 })
      for (const m of moths) {
        const dx = m.x - px, dy = m.y - py, d = Math.hypot(dx, dy) || 1
        if (d < 150) { m.vx = (dx / d) * 300; m.vy = (dy / d) * 300; m.scared = 1.6; m.rest = 0 }
      }
      if (still) settle()
    }
    stage.addEventListener('pointerdown', touched)

    poke.current = {
      measure: () => { measure(); if (still) settle() },
      wink: (from) => {
        const flame = lights.find((l) => l.who === from)
        if (flame) rings.push({ x: flame.x, y: flame.y, t: clock.t, life: 1.5, speed: 300, k: from === 'theirs' ? 0.9 : 0.5 })
        if (from === 'theirs') {
          // Their wink reaches your flame, and their moth comes over for a while.
          shiver = 1
          for (const m of moths) if (m.home === 'theirs') { m.visit = 7; m.rest = 0 }
        }
        if (still) settle()
      },
    }
    layout()
    run()
    return () => {
      cancelAnimationFrame(loop.raf)
      resized.disconnect()
      document.removeEventListener('visibilitychange', run)
      stage.removeEventListener('pointerdown', touched)
      poke.current = null
    }
  }, [mine, theirs, quiet])

  return <canvas ref={canvas} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />
}
