/* Greenbook · prototype of the new flow. Example data only, no server. */
;(() => {
  'use strict'

  // ───────────── Helpers ─────────────
  const esc = (value) =>
    String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))
  const pad = (n) => String(n).padStart(2, '0')
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
  const clone = (value) => JSON.parse(JSON.stringify(value))
  function clock(sec) {
    const s = Math.max(0, Math.floor(sec))
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`
  }
  function minutesLabel(value) {
    const min = Math.max(1, Math.round(value))
    const h = Math.floor(min / 60)
    const m = min % 60
    return h ? `${h} h${m ? ` ${pad(m)} min` : ''}` : `${m} min`
  }
  function addMinutes(hhmm, min) {
    const [h, m] = hhmm.split(':').map(Number)
    const t = (h * 60 + m + Math.round(min)) % (24 * 60)
    return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`
  }
  const rating = (r) => String(r).replace('.', ',')

  // ───────────── Icons (own strokes, 24×24) ─────────────
  const PATHS = {
    home: '<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/>',
    books: '<path d="M5 4.5h3.2v15H5zM10.2 4.5h3.2v15h-3.2z"/><path d="m15.4 5.6 3-.8 3.4 14-3 .8z"/>',
    open: '<path d="M12 7c-2-1.6-4.6-2.2-8-2.2v12.6c3.4 0 6 .6 8 2.2 2-1.6 4.6-2.2 8-2.2V4.8c-3.4 0-6 .6-8 2.2z"/><path d="M12 7v12.6"/>',
    quote:
      '<path d="M10 7.5c-3 .9-4.8 3-4.8 6.2v3.8h4.6V13H7.4c.1-2.1 1.1-3.4 3.2-4.1zM19 7.5c-3 .9-4.8 3-4.8 6.2v3.8h4.6V13h-2.4c.1-2.1 1.1-3.4 3.2-4.1z"/>',
    heart: '<path d="M12 19.6s-7.6-4.5-7.6-10.1A4.3 4.3 0 0 1 12 6.8a4.3 4.3 0 0 1 7.6 2.7c0 5.6-7.6 10.1-7.6 10.1z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    play: '<path d="M8 5.6v12.8a.6.6 0 0 0 .9.5l10-6.4a.6.6 0 0 0 0-1L8.9 5.1a.6.6 0 0 0-.9.5z"/>',
    pause: '<path d="M8.5 5.5v13M15.5 5.5v13"/>',
    back: '<path d="m14.5 5-7 7 7 7"/>',
    chev: '<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>',
    down: '<path d="m5.5 9.5 6.5 6.5 6.5-6.5"/>',
    x: '<path d="m6.5 6.5 11 11M17.5 6.5l-11 11"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.3"/><path d="m20 20-4.6-4.6"/>',
    lamp: '<path d="M8.2 3.5h7.6l3.2 7.5H5z"/><path d="M12 11v7.5M8.5 20.5h7"/>',
    moon: '<path d="M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1z"/>',
    leaf: '<path d="M5.2 18.8C5 10.6 9.7 5.5 19 5c-.2 9.4-5.3 14-13.8 13.8z"/><path d="m5.2 18.8 7.6-7.6"/>',
    lock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    unlock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 6.8-1.2"/>',
    camera: '<path d="M4.5 8.5h3l1.6-2.5h5.8l1.6 2.5h3v10h-15z"/><circle cx="12" cy="13.2" r="3"/>',
    gift: '<rect x="4.5" y="9.5" width="15" height="10" rx="1.5"/><path d="M3.5 9.5h17M12 9.5v10M12 9.5C10.6 6.2 7 5.8 7 7.9s3.3 1.6 5 1.6zM12 9.5c1.4-3.3 5-3.7 5-1.6s-3.3 1.6-5 1.6z"/>',
    check: '<path d="m5.5 12.5 4 4 9-9"/>',
    star: '<path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z"/>',
    cup: '<path d="M5.5 9.5h10v4.5a5 5 0 0 1-5 5 5 5 0 0 1-5-5z"/><path d="M15.5 10.5h1.2a2.4 2.4 0 0 1 0 4.8h-1.2M8.8 4.5c-.6.9.6 1.6 0 2.5M12.2 4.5c-.6.9.6 1.6 0 2.5"/>',
    reply: '<path d="M9.5 7.5 5 12l4.5 4.5"/><path d="M5.5 12h8a5.5 5.5 0 0 1 5.5 5.5"/>',
    pen: '<path d="m14.5 5.5 4 4L9 19H5v-4z"/>',
    bell: '<path d="M6.5 16v-4.5a5.5 5.5 0 0 1 11 0V16l1.5 2h-14z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
  }
  function ic(name, size = 20, opts = {}) {
    const cls = `ic${opts.fill ? ' ic--fill' : ''}${opts.cls ? ` ${opts.cls}` : ''}`
    return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${PATHS[name]}</svg>`
  }

  // ───────────── Example data ─────────────
  const PEOPLE = {
    el: { id: 'el', name: 'Javier', cls: 'p-him' },
    ella: { id: 'ella', name: 'Laura', cls: 'p-her' },
  }
  const other = (id) => (id === 'el' ? 'ella' : 'el')
  const name = (id) => PEOPLE[id].name

  const BOOKS = {
    sombra: { t: 'La sombra del viento', a: 'Carlos Ruiz Zafón', p: 590, cloth: '#2e4a3e', fg: '#ebd290', motif: 'frame' },
    hail: { t: 'Proyecto Hail Mary', a: 'Andy Weir', p: 646, cloth: '#1d2949', fg: '#f3d57e', motif: 'stars' },
    tokio: { t: 'Tokio blues', a: 'Haruki Murakami', p: 428, cloth: '#a83d35', fg: '#f8e8db', motif: 'circle' },
    klara: { t: 'Klara y el Sol', a: 'Kazuo Ishiguro', p: 226, cloth: '#e7b347', fg: '#3a2a22', motif: 'sun' },
    junco: { t: 'El infinito en un junco', a: 'Irene Vallejo', p: 452, cloth: '#d9cab0', fg: '#4a3526', motif: 'reed' },
    viento: { t: 'El nombre del viento', a: 'Patrick Rothfuss', p: 805, cloth: '#682b2e', fg: '#f1d8b4', motif: 'frame' },
    cuerpos: { t: 'El problema de los tres cuerpos', a: 'Cixin Liu', p: 432, cloth: '#24272d', fg: '#ee8b52', motif: 'three' },
    cien: { t: 'Cien años de soledad', a: 'Gabriel García Márquez', p: 471, cloth: '#edc04a', fg: '#23483d', motif: 'sun' },
    patria: { t: 'Patria', a: 'Fernando Aramburu', p: 721, cloth: '#e7e1d5', fg: '#232020', motif: 'lines' },
    mujercitas: { t: 'Mujercitas', a: 'Louisa May Alcott', p: 718, cloth: '#c68a9c', fg: '#3b1e2b', motif: 'frame' },
    tren: { t: 'La chica del tren', a: 'Paula Hawkins', p: 341, cloth: '#5a6971', fg: '#f2efe9', motif: 'lines' },
    orgullo: { t: 'Orgullo y prejuicio', a: 'Jane Austen', p: 424, cloth: '#56704f', fg: '#fbf6ec', motif: 'frame' },
    montecristo: { t: 'El conde de Montecristo', a: 'Alexandre Dumas', p: 1256, cloth: '#2f3550', fg: '#e9c982', motif: 'stars' },
  }
  const MOTIFS = {
    frame:
      '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="5" y="5" width="30" height="30" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M20 11l2.2 6.8L29 20l-6.8 2.2L20 29l-2.2-6.8L11 20l6.8-2.2z" fill="currentColor"/></svg>',
    stars:
      '<svg viewBox="0 0 40 40" aria-hidden="true" fill="currentColor"><circle cx="12" cy="14" r="2.2"/><circle cx="27" cy="10" r="1.4"/><circle cx="22" cy="26" r="3"/><circle cx="31" cy="30" r="1.6"/><circle cx="9" cy="30" r="1.2"/></svg>',
    circle: '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="12" fill="currentColor"/></svg>',
    sun: '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="8" fill="currentColor"/><path d="M20 4v6M20 30v6M4 20h6M30 20h6M8.7 8.7l4.2 4.2M27.1 27.1l4.2 4.2M8.7 31.3l4.2-4.2M27.1 12.9l4.2-4.2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    reed: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M12 36C14 24 16 14 22 4M20 36c1-9 4-17 11-24M28 36c0-6 2-12 6-16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    three:
      '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="13" cy="14" r="5" fill="currentColor"/><circle cx="28" cy="16" r="4" fill="currentColor"/><circle cx="20" cy="29" r="6" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    lines: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M6 12h28M6 20h28M6 28h18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  }

  /** Each person's library. `duo` = read together; `gift` = the person who gave it, with a dedication. */
  const READINGS = {
    el: [
      { b: 'hail', s: 'reading', since: '25 de octubre' },
      { b: 'tokio', s: 'reading', duo: true, since: '20 de octubre' },
      { b: 'klara', s: 'done', when: 'octubre' },
      { b: 'viento', s: 'done', when: 'julio', rating: 5 },
      { b: 'cuerpos', s: 'done', when: 'mayo', rating: 4 },
      { b: 'patria', s: 'done', when: 'marzo', rating: 4.5 },
      { b: 'cien', s: 'want', gift: 'ella', words: 'Empieza así y ya no podrás parar. Te lo dejo con una condición: me lo comentas.' },
    ],
    ella: [
      { b: 'sombra', s: 'reading', since: '19 de octubre' },
      { b: 'tokio', s: 'reading', duo: true, since: '20 de octubre' },
      { b: 'klara', s: 'done', when: 'septiembre' },
      { b: 'junco', s: 'done', when: 'agosto', rating: 4.5 },
      { b: 'mujercitas', s: 'done', when: 'junio', rating: 4 },
      { b: 'tren', s: 'done', when: 'abril', rating: 3.5 },
      { b: 'cien', s: 'done', when: 'febrero', rating: 5 },
      { b: 'patria', s: 'want', gift: 'el', words: 'Para cuando te apetezca algo que te remueva. Te espero al final para hablarlo.' },
    ],
  }
  const CURRENT = { el: 'hail', ella: 'sombra' }
  const PACE = { el: 25, ella: 20 }
  const START_PAGES = { el: { hail: 412, tokio: 187 }, ella: { sombra: 352, tokio: 212 } }
  const TOGETHER_LIST = [
    { b: 'orgullo', by: 'ella', why: 'Para leerlo en Navidad, con manta.' },
    { b: 'montecristo', by: 'el', why: 'El gran reto de 2027, poco a poco.' },
  ]
  const SHELF = [
    { b: 'cien', who: ['ella'] },
    { b: 'patria', who: ['el'] },
    { b: 'tren', who: ['ella'] },
    { b: 'cuerpos', who: ['el'] },
    { b: 'mujercitas', who: ['ella'] },
    { b: 'viento', who: ['el'] },
    { b: 'junco', who: ['ella'] },
    { b: 'klara', who: ['ella', 'el'] },
  ]
  const BASE_QUOTES = [
    {
      id: 'q1', by: 'ella', b: 'sombra', page: 358, kind: 'cita', ago: 'hace 8 min', t: 8, fresh: true,
      text: 'Los libros son espejos: sólo se ve en ellos lo que uno ya lleva dentro.',
      note: 'Esta me la guardo para siempre.', hearts: [], replies: [],
    },
    {
      id: 'q2', by: 'ella', b: 'tokio', page: 205, kind: 'nota', ago: 'ayer', t: 1300,
      text: '¡No me puedo creer lo que pasa en esta página! Avísame cuando llegues, que lo comentamos.',
      note: '', hearts: [], replies: [],
    },
    {
      id: 'q3', by: 'el', b: 'hail', page: 391, kind: 'nota', ago: 'el viernes', t: 2700,
      text: 'Rocky es lo mejor que me ha pasado este año. Después de ti.',
      note: '', hearts: ['ella'], replies: [{ by: 'ella', text: 'Eso, eso: después de mí.' }],
    },
    {
      id: 'q4', by: 'el', b: 'tokio', page: 160, kind: 'cita', ago: 'el jueves', t: 4100,
      text: 'Si solo lees los libros que todo el mundo está leyendo, solo puedes pensar lo que todo el mundo está pensando.',
      note: 'Nagasawa tiene razón, aunque me cae fatal.', hearts: ['ella'], replies: [{ by: 'ella', text: 'A mí también me cae fatal.' }],
    },
    {
      id: 'q5', by: 'ella', b: 'sombra', page: 6, kind: 'cita', ago: '19 de octubre', t: 29000,
      text: 'Cada libro, cada tomo que ves, tiene alma. El alma de quien lo escribió, y el alma de quienes lo leyeron y vivieron y soñaron con él.',
      note: 'Por esto me gusta tanto leer contigo.', hearts: ['el'], replies: [{ by: 'el', text: 'Y a mí contigo.' }],
    },
    {
      id: 'q6', by: 'ella', b: 'cien', page: 9, kind: 'cita', ago: 'febrero', t: 380000, safe: true,
      text: 'Muchos años después, frente al pelotón de fusilamiento, el coronel Aureliano Buendía había de recordar aquella tarde remota en que su padre lo llevó a conocer el hielo.',
      note: 'Te va a encantar. Empieza así.', hearts: ['el'], replies: [],
    },
  ]
  /** Tokio blues sessions; numbers are pages each one read. */
  const DUO_SESSIONS = [
    { when: 'Ayer', joint: true, min: 42, el: 14, ella: 19 },
    { when: 'Jueves', who: 'ella', min: 31, ella: 16 },
    { when: 'Jueves', who: 'el', min: 25, el: 11 },
    { when: 'Martes', joint: true, min: 50, el: 17, ella: 22 },
    { when: '20 oct', joint: true, min: 35, el: 12, ella: 12 },
  ]
  const OWN_SESSIONS = [
    { when: 'Ayer', min: 35, pages: 16 },
    { when: 'Viernes', min: 28, pages: 12 },
    { when: 'Jueves', min: 40, pages: 18 },
  ]
  /** Story: it's Sunday 8 November at 22:59; the partner started reading at 22:41. */
  const STORY = { start: '22:41', now: '22:59', liveMin: 18, date: 'domingo, 8 de noviembre', dateShort: 'domingo 8 nov' }
  /** Before tonight. */
  const TOTALS = { yearHours: 61, novNights: 4, weekNights: 3, weekMinutes: 160, novPages: 512 }
  /**
   * Six weeks of reading, Monday 28 Sep → Sunday 8 Nov 2026.
   * b = both · h / m = only her / only him · fh / fm = wildcard (only her / only him) · n = nobody · t = today.
   * Wildcards: two a month, used on days when only one of you read.
   */
  const CAL = [
    ['b', 'b', 'n', 'b', 'b', 'b', 'b'],
    ['fm', 'b', 'b', 'fh', 'b', 'b', 'b'],
    ['b', 'b', 'b', 'b', 'b', 'b', 'b'],
    ['b', 'b', 'm', 'b', 'b', 'b', 'b'],
    ['b', 'h', 'b', 'b', 'b', 'b', 'b'],
    ['b', 'fh', 'b', 'b', 'b', 'b', 't'],
  ]
  const CAL_START = new Date(2026, 8, 28)
  const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
  const MILESTONES = [
    { t: 'Primera noche juntos', d: '14 de marzo', icon: 'moon', on: true },
    { t: 'Una semana seguida', d: '22 de marzo', icon: 'lamp', on: true },
    { t: 'Veinte días seguidos', d: '20 de octubre', icon: 'heart', on: true },
    { t: '50 horas a la vez', d: '30 de septiembre', icon: 'cup', on: true },
    { t: 'Primer libro a dúo', d: 'Terminad Tokio blues', icon: 'open', on: false },
    { t: '10 libros en 2026', d: 'Lleváis 9', icon: 'books', on: false },
  ]

  // ───────────── State ─────────────
  function initialMode() {
    const theme = document.documentElement.dataset.theme
    if (theme === 'dark') return 'noche'
    if (theme === 'light') return 'tarde'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'noche' : 'tarde'
  }
  function freshState(me, mode, quotes) {
    return {
      me,
      partner: other(me),
      mode,
      screen: 'inicio',
      from: 'biblioteca',
      bookKey: 'tokio',
      sheet: null,
      sheetData: {},
      banner: false,
      toast: null,
      libFilter: 'dos',
      quoteFilter: 'todas',
      page: clone(START_PAGES),
      readToday: false,
      savedPages: 0,
      session: null,
      partnerLive: true,
      jointDone: null,
      goodnight: false,
      quotes: quotes ? clone(quotes) : clone(BASE_QUOTES),
      opened: [],
      ratings: { el: { klara: null }, ella: { klara: 5 } },
      readBook: CURRENT[me],
    }
  }
  const findReading = (id, key) => READINGS[id].find((r) => r.b === key)
  const myReadingKeys = (st) => READINGS[st.me].filter((r) => r.s === 'reading').map((r) => r.b)
  const partnerBook = (st) => CURRENT[st.partner]

  function elapsed(st) {
    const s = st.session
    if (!s) return 0
    if (s.frozen) return s.offset
    const now = s.pausedAt ?? Date.now()
    return Math.max(0, (now - s.startedAt - s.pausedMs) / 1000 + s.offset)
  }
  const storyNow = (st) => addMinutes(STORY.now, elapsed(st) / 60)
  /** The partner turns a page every two minutes while reading live. */
  function partnerLivePage(st) {
    const base = st.page[st.partner][partnerBook(st)] + Math.floor(STORY.liveMin / 2)
    return base + (st.session ? Math.floor(elapsed(st) / 120) : 0)
  }
  function isLocked(q, st) {
    if (q.by === st.me || q.safe || st.opened.includes(q.id)) return false
    const r = findReading(st.me, q.b)
    if (!r || r.s === 'done') return false
    return (st.page[st.me][q.b] ?? 0) < q.page
  }
  function dayState(code, st) {
    if (code === 't') return { me: st.readToday, partner: true, free: false, today: true }
    const ella = code === 'b' || code === 'h' || code === 'fh'
    const el = code === 'b' || code === 'm' || code === 'fm'
    return { me: st.me === 'el' ? el : ella, partner: st.me === 'el' ? ella : el, free: code.startsWith('f'), today: false }
  }
  function streaks(st) {
    const days = CAL.flat().map((code) => dayState(code, st))
    const both = (d) => (d.me && d.partner) || d.free
    const run = (ok) => {
      let i = days.length - 1
      if (!ok(days[i])) i--
      let n = 0
      while (i >= 0 && ok(days[i])) {
        n++
        i--
      }
      return n
    }
    let best = 0
    let current = 0
    for (const d of days) {
      current = both(d) ? current + 1 : 0
      best = Math.max(best, current)
    }
    const nov = days.slice(-8)
    return {
      shared: run(both),
      best,
      me: run((d) => d.me),
      partner: run((d) => d.partner),
      todayDone: both(days[days.length - 1]),
      novBoth: nov.filter((d) => d.me && d.partner).length,
    }
  }

  function startSession(st, kind, opts = {}) {
    const book = opts.book ?? st.readBook ?? CURRENT[st.me]
    const startPage = st.page[st.me][book]
    st.session = {
      kind,
      book,
      startPage,
      page: startPage,
      startedAt: Date.now(),
      pausedAt: null,
      pausedMs: 0,
      offset: opts.offset ?? 0,
      frozen: false,
      joinedAt: STORY.now,
      partnerStart: partnerLivePage(st),
      feed: [],
    }
    if (kind === 'juntos') initFeed(st)
    st.screen = kind === 'juntos' ? 'juntos' : 'leer'
    st.sheet = null
    st.banner = false
  }
  function initFeed(st) {
    const s = st.session
    s.feed = st.quotes
      .filter((q) => q.by === st.partner && q.t <= 30)
      .map((q) => ({ t: addMinutes(STORY.now, -q.t), text: `${name(st.partner)} guardó una cita · p. ${q.page}`, act: 'tab', to: 'citas' }))
    s.feed.push({ t: s.joinedAt, text: `Te has unido. ${name(st.partner)} llevaba ${STORY.liveMin} min.` })
  }
  function toJoint(st) {
    const s = st.session
    if (!s) return startSession(st, 'juntos')
    s.kind = 'juntos'
    s.joinedAt = storyNow(st)
    s.partnerStart = partnerLivePage(st)
    initFeed(st)
    st.screen = 'juntos'
    st.sheet = null
  }
  function suggestedPage(st) {
    const s = st.session
    const guess = s.startPage + Math.max(1, Math.round(elapsed(st) / 150))
    return clamp(Math.max(s.page, guess), s.startPage, BOOKS[s.book].p)
  }
  function demoTicket(st) {
    const myBook = CURRENT[st.me]
    const pBook = partnerBook(st)
    const myFrom = st.page[st.me][myBook]
    const pFrom = partnerLivePage(st)
    st.jointDone = { minutes: 47, start: STORY.now, end: addMinutes(STORY.now, 47), myBook, myFrom, myTo: myFrom + 19, pBook, pFrom, pTo: pFrom + 23, note: '' }
    st.page[st.me][myBook] = myFrom + 19
    st.page[st.partner][pBook] = pFrom + 23 - Math.floor(STORY.liveMin / 2)
    st.savedPages = 19
    st.readToday = true
    st.partnerLive = false
    st.screen = 'ticket'
  }
  function openSheetOn(st, sheet, data = {}) {
    st.sheet = sheet
    st.sheetData = data
  }

  // ───────────── Components ─────────────
  function avatar(id, size = 40, opts = {}) {
    const p = PEOPLE[id]
    const label = opts.label ? `role="img" aria-label="${esc(opts.label)}"` : 'aria-hidden="true"'
    return `<span class="av ${p.cls}${opts.live ? ' av--live' : ''}" style="--s:${size}px;font-size:${Math.max(12, Math.round(size * 0.46))}px" ${label}>${p.name.charAt(0)}${opts.live ? '<span class="av__dot"></span>' : ''}</span>`
  }
  function cover(key, w, opts = {}) {
    const b = BOOKS[key]
    const size = w < 56 ? ' cover--sm' : w < 96 ? ' cover--md' : ''
    const ribbons = (opts.ribbons ?? []).map((id) => `<i class="ribbon ${PEOPLE[id].cls}"></i>`).join('')
    const label = opts.label ? `role="img" aria-label="${esc(opts.label)}"` : 'aria-hidden="true"'
    return `<span class="cover${size}" style="--w:${w}px;--cloth:${b.cloth};--fg:${b.fg}" ${label}>${ribbons ? `<span class="ribbons">${ribbons}</span>` : ''}<span class="cover__t">${esc(b.t)}</span><span class="cover__a">${esc(b.a)}</span><span class="cover__m">${MOTIFS[b.motif]}</span></span>`
  }
  const bar = (v) => `<span class="bar"><i style="--v:${(clamp(v, 0, 1) * 100).toFixed(1)}%"></i></span>`
  function pairBars(st, key) {
    const total = BOOKS[key].p
    return `<span class="pair-bars"><span class="${PEOPLE[st.partner].cls}">${bar(st.page[st.partner][key] / total)}</span><span class="${PEOPLE[st.me].cls}">${bar(st.page[st.me][key] / total)}</span></span>`
  }
  function stamp(d, st, opts) {
    let cls
    let text
    let inner = opts.num ?? ''
    if (d.me && d.partner) {
      cls = 'stamp--both'
      text = 'leísteis los dos'
      if (opts.num == null) inner = ic('heart', 16, { fill: true })
    } else if (d.free) {
      cls = 'stamp--free'
      text = d.me ? 'comodín: solo leíste tú' : `comodín: solo leyó ${name(st.partner)}`
      inner = ic('moon', 15, { fill: true })
    } else if (d.partner) {
      cls = `stamp--one ${PEOPLE[st.partner].cls}`
      text = `solo leyó ${name(st.partner)}`
    } else if (d.me) {
      cls = `stamp--one ${PEOPLE[st.me].cls}`
      text = 'solo leíste tú'
    } else {
      cls = 'stamp--none'
      text = 'no leyó nadie'
    }
    if (d.today && !(d.me && d.partner)) {
      cls += ' stamp--pending'
      text += '; falta tu parte'
    }
    if (d.today && d.me && d.partner && opts.fresh) cls += ' stamp--new'
    return `<span class="stamp ${cls}" style="--rot:${opts.rot ?? -5}deg" role="img" aria-label="${esc(`${opts.label}: ${text}`)}">${inner}</span>`
  }
  function weekStrip(st, fresh) {
    const week = CAL[CAL.length - 1]
    return `<div class="week">${week
      .map((code, i) => {
        const d = dayState(code, st)
        const date = new Date(2026, 10, 2 + i)
        const label = date.toLocaleDateString('es', { weekday: 'long', day: 'numeric' })
        return `<div class="week__d${d.today ? ' week__d--today' : ''}">${stamp(d, st, { label, rot: [-6, 4, -3, 6, -5, 3, -4][i], fresh })}<span aria-hidden="true">${WEEKDAYS[i]}</span></div>`
      })
      .join('')}</div>`
  }
  function quoteCard(q, st, opts = {}) {
    const by = PEOPLE[q.by]
    const mine = q.by === st.me
    const book = BOOKS[q.b]
    const who = mine ? 'Tú' : by.name
    const meta = `${avatar(q.by, 30)}<span><b>${who}</b> · ${esc(book.t)} · p. ${q.page}<br>${esc(q.ago)}${q.private ? ' · solo tú la ves' : ''}</span>`
    if (isLocked(q, st)) {
      const left = q.page - st.page[st.me][q.b]
      return `<article class="qcard qcard--locked ${by.cls}" aria-label="${esc(`${by.name} te dejó algo en la página ${q.page}`)}">
        <span class="qcard__mark" aria-hidden="true"></span>
        <div class="qcard__meta">${meta}</div>
        <div class="locked"><p class="locked__head">${ic('lock', 18)} Se abre en la p. ${q.page}</p>
          <p class="muted small">Vas por la ${st.page[st.me][q.b]}: te faltan ${plural(left, 'página', 'páginas')}. ${by.name} te lo dejó para cuando llegues.</p>
          <span class="locked__ghost" aria-hidden="true"></span><span class="locked__ghost" aria-hidden="true"></span></div>
        <div class="qcard__foot"><button class="link" data-act="sheet" data-sheet="abrir" data-id="${q.id}">${ic('unlock', 18)} Abrir igualmente</button></div>
      </article>`
    }
    const liked = q.hearts.includes(st.me)
    const partnerLiked = q.hearts.includes(st.partner)
    const heart = mine
      ? `<span class="heart-count${partnerLiked ? '' : ' muted'}">${ic('heart', 18, { fill: partnerLiked })} ${partnerLiked ? `Le gusta a ${name(st.partner)}` : 'Aún sin corazón'}</span>`
      : `<button class="heart-btn${opts.justLiked === q.id ? ' just' : ''}" data-act="heart" data-id="${q.id}" aria-pressed="${liked}">${ic('heart', 20, { fill: liked })}${liked ? 'Te gusta' : 'Me gusta'}</button>`
    const replies = opts.compact
      ? ''
      : q.replies.map((r) => `<p class="qcard__reply ${PEOPLE[r.by].cls}">${avatar(r.by, 22)}<span>${esc(r.text)}</span></p>`).join('')
    const text = q.kind === 'cita' ? `«${esc(q.text)}»` : esc(q.text)
    return `<article class="qcard qcard--${q.kind} ${by.cls}">
      <span class="qcard__mark" aria-hidden="true"></span>
      <div class="qcard__meta">${meta}${q.fresh && !mine ? '<span class="badge-new">Nueva</span>' : ''}</div>
      <p class="qcard__text">${text}</p>
      ${q.note ? `<p class="qcard__note">${esc(q.note)}</p>` : ''}
      ${replies}
      <div class="qcard__foot">${heart}<button class="link" data-act="sheet" data-sheet="responder" data-id="${q.id}">${ic('reply', 18)} Responder</button></div>
    </article>`
  }
  function shelf(st, items, label) {
    return `<div class="shelf" role="group" aria-label="${esc(label)}">${items
      .map((it) => {
        const b = BOOKS[it.b]
        const w = clamp(22 + Math.round(b.p / 45), 26, 44)
        const h = 120 + ((b.t.length * 7) % 38)
        const who = it.who.map((id) => (id === st.me ? 'ti' : name(id))).join(' y ')
        return `<button class="spine" style="--sw:${w}px;--sh:${h}px;--cloth:${b.cloth};--fg:${b.fg}" data-act="book" data-book="${it.b}" aria-label="${esc(`${b.t}, leído por ${who}`)}"><span class="spine__who">${it.who.map((id) => `<i class="${PEOPLE[id].cls}"></i>`).join('')}</span><span class="spine__t">${esc(b.t)}</span></button>`
      })
      .join('')}</div>`
  }
  function lampArt() {
    return `<div class="lamp-art" aria-hidden="true"><svg width="104" height="120" viewBox="0 0 104 120">
      <path d="M24 50h56l18 58H6z" fill="var(--lamp-strong)" opacity=".55"/>
      <rect x="49" y="50" width="6" height="48" rx="3" fill="var(--plum)"/>
      <rect x="28" y="96" width="48" height="10" rx="5" fill="var(--plum)"/>
      <path d="M32 16h40l14 36H18z" fill="var(--honey)" stroke="var(--honey-ink)" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M40 24h24" stroke="var(--card)" stroke-width="3" stroke-linecap="round" opacity=".55"/>
    </svg></div>`
  }
  function stepper(uid, field, value, min, max, labelledby, small) {
    const size = small ? 16 : 22
    return `<div class="stepper" role="group" aria-labelledby="${labelledby}">
      <button class="btn btn--soft" data-act="step" data-field="${field}" data-d="-1" aria-label="Una página menos">${ic('minus', size)}</button>
      <input id="${uid}-${field}" class="num" type="number" inputmode="numeric" min="${min}" max="${max}" value="${value}" data-input="${field}" aria-labelledby="${labelledby}">
      <button class="btn btn--soft" data-act="step" data-field="${field}" data-d="1" aria-label="Una página más">${ic('plus', size)}</button>
    </div>`
  }
  const back = (to, label) => `<button class="back" data-act="go" data-to="${to}">${ic('back', 20)} ${label}</button>`

  // ───────────── Screens ─────────────
  function scrInicio(st, ctx) {
    const me = st.me
    const pa = st.partner
    const s = streaks(st)
    const latest = [...st.quotes].filter((q) => q.by === pa).sort((a, b) => a.t - b.t)[0]
    const weekNights = TOTALS.weekNights + (st.jointDone ? 1 : 0)
    const weekMin = TOTALS.weekMinutes + (st.jointDone ? st.jointDone.minutes : 0)
    const today = st.readToday
      ? `<p class="hello__today hello__today--done">${ic('heart', 18, { fill: true })} Hoy habéis leído los dos. ${plural(s.shared, 'día seguido', 'días seguidos')}.</p>`
      : `<p class="hello__today">${ic('lamp', 18)} ${name(pa)} ya ha leído hoy. Falta tu ratito para la racha de los dos.</p>`
    return `
      <header class="hello">
        <div class="hello__row"><p class="hello__date">${STORY.date}</p>
          <button class="pair" data-act="toast" data-msg="Aquí irá tu perfil: tu color, los avisos y el modo noche automático." aria-label="Perfil y ajustes">${avatar(me, 32)}${avatar(pa, 32)}</button></div>
        <h1 class="display ${PEOPLE[me].cls}">Buenas noches,<br><span class="display__name">${name(me)}</span></h1>
        ${today}
      </header>
      ${liveCard(st)}
      <section class="block" aria-labelledby="${ctx.uid}-tu">
        <h2 class="h2" id="${ctx.uid}-tu">Tu lectura</h2>
        ${currentCard(st, CURRENT[me])}
        ${duoRow(st)}
      </section>
      <section class="block" aria-labelledby="${ctx.uid}-racha">
        <div class="block__head"><h2 class="h2" id="${ctx.uid}-racha">Racha de los dos</h2>
          <button class="pill" data-act="go" data-to="racha" aria-label="Ver la racha: ${s.shared} días">${ic('lamp', 16)} ${plural(s.shared, 'día', 'días')} ${ic('chev', 16)}</button></div>
        ${weekStrip(st, ctx.fresh.screen)}
      </section>
      ${
        latest
          ? `<section class="block" aria-labelledby="${ctx.uid}-de"><div class="block__head"><h2 class="h2" id="${ctx.uid}-de">De ${name(pa)}</h2><button class="link" data-act="tab" data-to="citas">Ver todas</button></div>${quoteCard(latest, st, { compact: true, justLiked: ctx.justLiked })}</section>`
          : ''
      }
      <p class="foot">${ic('cup', 18)} <span>Esta semana, a la vez: <b>${weekNights} noches · ${minutesLabel(weekMin)}</b></span></p>`
  }
  function liveCard(st) {
    const pa = st.partner
    if (st.session) {
      const s = st.session
      const joint = s.kind === 'juntos'
      return `<section class="card card--lamp live" aria-label="Sesión en marcha">
        <div class="live__who">${joint ? avatar(pa, 44, { live: true }) : ''}${avatar(st.me, 44, { live: true })}
          <div class="live__txt"><p class="live__title b">${joint ? 'Estáis leyendo juntos' : 'Tienes una sesión en marcha'}</p>
            <p class="live__meta"><span class="dot" aria-hidden="true"></span><span class="num" data-tick="clock">${clock(elapsed(st))}</span> · ${esc(BOOKS[s.book].t)}</p></div></div>
        <div class="row"><button class="btn btn--primary btn--grow" data-act="go" data-to="${joint ? 'juntos' : 'leer'}">Volver a la sesión</button>
          ${!joint && st.partnerLive ? `<button class="btn btn--soft" data-act="to-joint">Con ${name(pa)}</button>` : ''}</div>
      </section>`
    }
    if (st.jointDone) {
      const j = st.jointDone
      return `<section class="card card--lamp live" aria-label="Esta noche">
        <div class="live__who">${avatar(pa, 44)}${avatar(st.me, 44)}
          <div class="live__txt"><p class="live__title b">Esta noche habéis leído juntos ${minutesLabel(j.minutes)}</p><p class="live__meta">${j.start} – ${j.end} · ticket guardado</p></div></div>
        <div class="row"><button class="btn btn--primary btn--grow" data-act="goodnight" ${st.goodnight ? 'disabled' : ''}>${st.goodnight ? `${ic('check', 18)} Buenas noches enviadas` : `${ic('moon', 18, { fill: true })} Darle las buenas noches`}</button>
          <button class="btn btn--soft btn--icon" data-act="go" data-to="ticket" aria-label="Ver el ticket de esta noche">${ic('chev')}</button></div>
      </section>`
    }
    if (!st.partnerLive) return ''
    const key = partnerBook(st)
    return `<section class="card card--lamp live" aria-label="${name(pa)} está leyendo ahora">
      <div class="live__who">${avatar(pa, 52, { live: true })}
        <div class="live__txt"><p class="live__title"><b>${name(pa)}</b> está leyendo</p><p class="b">${esc(BOOKS[key].t)}</p>
          <p class="live__meta"><span class="dot" aria-hidden="true"></span><span>p. ${partnerLivePage(st)} · lleva ${STORY.liveMin} min</span></p></div>
        ${cover(key, 44, { ribbons: [pa] })}</div>
      <div class="row"><button class="btn btn--primary btn--grow" data-act="join">${ic('open', 18)} Unirme a su lectura</button>
        <button class="btn btn--soft btn--icon" data-act="beat" aria-label="Mandarle un latido">${ic('heart', 20, { fill: true, cls: 'rose' })}</button></div>
    </section>`
  }
  function currentCard(st, key) {
    const b = BOOKS[key]
    const pg = st.page[st.me][key]
    const v = pg / b.p
    const days = Math.ceil((b.p - pg) / PACE[st.me])
    const finish = new Date(2026, 10, 8 + days).toLocaleDateString('es', { day: 'numeric', month: 'long' })
    return `<article class="card current ${PEOPLE[st.me].cls}">
      <button data-act="book" data-book="${key}" aria-label="Abrir ${esc(b.t)}">${cover(key, 88, { ribbons: [st.me] })}</button>
      <div class="current__info"><h3 class="title">${esc(b.t)}</h3><p class="muted small">${esc(b.a)}</p>
        <p class="folio num">p. ${pg} <span>de ${b.p}</span></p>${bar(v)}
        <p class="muted small">${Math.round(v * 100)} % · a tu ritmo, lo acabas hacia el ${finish}</p></div>
      ${bookActions(key)}
    </article>`
  }
  const bookActions = (key) => `<div class="current__actions">
      <button class="btn btn--primary" data-act="read" data-book="${key}">${ic('play', 16, { fill: true })} Leer</button>
      <button class="btn btn--soft" data-act="sheet" data-sheet="apuntar" data-book="${key}">${ic('plus', 18)} Página</button>
      <button class="btn btn--soft" data-act="sheet" data-sheet="cita" data-book="${key}">${ic('quote', 18)} Cita</button>
    </div>`
  function duoRow(st) {
    const b = BOOKS.tokio
    return `<button class="duo-row" data-act="book" data-book="tokio">${cover('tokio', 44, { ribbons: [st.partner, st.me] })}
      <span class="duo-row__t"><b>${esc(b.t)} · a dúo</b>${pairBars(st, 'tokio')}
        <span class="muted small">Tú p. ${st.page[st.me].tokio} · ${name(st.partner)} p. ${st.page[st.partner].tokio}</span></span>${ic('chev')}</button>`
  }

  function scrLeer(st, ctx) {
    const s = st.session
    const b = BOOKS[s.book]
    const paused = s.pausedAt != null && !s.frozen
    return `<div class="session">
      <div class="session__top"><button class="close" data-act="go" data-to="inicio" aria-label="Minimizar la sesión">${ic('down', 22)}</button>
        <p class="session__title">Leyendo<small>${esc(b.t)}</small></p>
        <button class="close" data-act="sheet" data-sheet="cita" data-book="${s.book}" aria-label="Guardar una cita">${ic('quote', 20)}</button></div>
      <div class="solo-book">${cover(s.book, 104, { ribbons: [st.me] })}</div>
      <div><p class="timer" role="timer" data-tick="clock">${clock(elapsed(st))}</p><p class="timer-sub">${paused ? 'En pausa' : `Empezaste en la p. ${s.startPage}`}</p></div>
      <div class="field"><span class="field__label" id="${ctx.uid}-pg">Voy por la página</span>${stepper(ctx.uid, 'page', s.page, s.startPage, b.p, `${ctx.uid}-pg`)}</div>
      ${
        st.partnerLive
          ? `<button class="partner-pill" data-act="to-joint">${avatar(st.partner, 36, { live: true })}<span class="partner-pill__t"><b>${name(st.partner)}</b> también está leyendo</span><span class="btn btn--primary btn--sm" aria-hidden="true">Leer juntos</span></button>`
          : ''
      }
      <div class="session__end"><div class="row">
        <button class="btn btn--soft btn--grow" data-act="${paused ? 'resume' : 'pause'}">${ic(paused ? 'play' : 'pause', 18, { fill: paused })} ${paused ? 'Seguir' : 'Pausa'}</button>
        <button class="btn btn--primary btn--grow" data-act="sheet" data-sheet="terminar">Terminar</button></div></div>
    </div>`
  }
  function scrJuntos(st) {
    const s = st.session
    const paused = s.pausedAt != null && !s.frozen
    const me = st.me
    const pa = st.partner
    const color = (id) => (id === 'ella' ? 'var(--her)' : 'var(--him)')
    const feed = [...s.feed]
      .reverse()
      .slice(0, 3)
      .map((it) =>
        it.act
          ? `<button class="feed__item" data-act="${it.act}" data-to="${it.to}"><time>${it.t}</time><span>${esc(it.text)}</span>${ic('chev', 18)}</button>`
          : `<p class="feed__item"><time>${it.t}</time><span>${esc(it.text)}</span></p>`,
      )
      .join('')
    return `<div class="session">
      <div class="session__top"><button class="close" data-act="go" data-to="inicio" aria-label="Minimizar la sesión">${ic('down', 22)}</button>
        <p class="session__title">Leyendo juntos<small>desde las ${s.joinedAt}</small></p>
        <button class="close" data-act="sheet" data-sheet="cita" data-book="${s.book}" aria-label="Guardar una cita">${ic('quote', 20)}</button></div>
      <div class="readers" style="--left:${color(pa)};--right:${color(me)}">
        <div class="reader ${PEOPLE[pa].cls}">${avatar(pa, 64, { live: true })}<p class="reader__name">${name(pa)}</p><p class="reader__book">${esc(BOOKS[partnerBook(st)].t)}</p>
          <p class="reader__page num">p. <span data-tick="ppage">${partnerLivePage(st)}</span></p><p class="reader__page"><small>empezó en la ${s.partnerStart}</small></p></div>
        <div class="thread" aria-hidden="true"><span class="thread__heart">${ic('heart', 18, { fill: true })}</span></div>
        <div class="reader ${PEOPLE[me].cls}">${avatar(me, 64, { live: true })}<p class="reader__name">Tú</p><p class="reader__book">${esc(BOOKS[s.book].t)}</p>
          <div class="mini-stepper" role="group" aria-label="Tu página">
            <button class="btn btn--soft" data-act="step" data-field="page" data-d="-1" aria-label="Una página menos">${ic('minus', 16)}</button>
            <p class="reader__page num">p. <span data-live-page>${s.page}</span></p>
            <button class="btn btn--soft" data-act="step" data-field="page" data-d="1" aria-label="Una página más">${ic('plus', 16)}</button></div></div>
      </div>
      <div><p class="timer" role="timer" data-tick="clock">${clock(elapsed(st))}</p><p class="timer-sub">${paused ? 'Tu parte, en pausa' : 'leyendo a la vez'}</p></div>
      <div class="feed" aria-label="Lo último de la sesión">${feed}</div>
      <div class="actions">
        <button class="action action--heart" data-act="beat">${ic('heart', 24, { fill: true })}Latido</button>
        <button class="action" data-act="sheet" data-sheet="cita" data-book="${s.book}">${ic('quote', 24)}Cita</button>
        <button class="action" data-act="${paused ? 'resume' : 'pause'}">${ic(paused ? 'play' : 'pause', 24, { fill: paused })}${paused ? 'Seguir' : 'Pausa'}</button></div>
      <div class="session__end"><button class="btn btn--primary btn--block" data-act="sheet" data-sheet="terminar">Terminar mi parte</button>
        <p>Cuando terminéis los dos, se guarda como una sesión juntos.</p></div>
    </div>`
  }
  function scrTicket(st, ctx) {
    const j = st.jointDone
    if (!j) return scrInicio(st, ctx)
    const s = streaks(st)
    const me = st.me
    const pa = st.partner
    const night = TOTALS.novNights + 1
    return `<div class="session">
      <div class="session__top"><span style="width:44px" aria-hidden="true"></span><p class="session__title">Guardado</p>
        <button class="close" data-act="ticket-done" aria-label="Cerrar">${ic('x', 20)}</button></div>
      <article class="ticket" aria-labelledby="${ctx.uid}-tk">
        <span class="seal" aria-hidden="true">Noche<b>nº ${night}</b>de nov.</span>
        <div style="padding-right:104px;display:grid;gap:6px">
          <p class="ticket__kicker" id="${ctx.uid}-tk">Lectura a la vez</p>
          <p class="ticket__big num">${minutesLabel(j.minutes)}</p>
          <p class="muted small">${STORY.dateShort} · ${j.start} – ${j.end}</p></div>
        <div class="ticket__cut" aria-hidden="true"></div>
        <div class="ticket__parts">
          <div class="ticket__part ${PEOPLE[pa].cls}"><b>${name(pa)}</b><span>${esc(BOOKS[j.pBook].t)}</span><span class="num">+${j.pTo - j.pFrom} págs.</span><span class="muted">p. ${j.pFrom} → ${j.pTo}</span></div>
          <div class="ticket__part ${PEOPLE[me].cls}"><b>Tú</b><span>${esc(BOOKS[j.myBook].t)}</span><span class="num">+${j.myTo - j.myFrom} págs.</span><span class="muted">p. ${j.myFrom} → ${j.myTo}</span></div>
        </div>
        <div class="ticket__cut" aria-hidden="true"></div>
        <p class="row small">${ic('lamp', 20, { cls: 'honey' })}<span>Racha de los dos: <b>${plural(s.shared, 'día', 'días')}</b> · Reto de noviembre: <b>${night} de 10</b> noches</span></p>
      </article>
      <div class="field"><label for="${ctx.uid}-memo">Una línea para recordarla (opcional)</label>
        <input id="${ctx.uid}-memo" class="input textarea--hand" data-input="memo" placeholder="Con té y tus pies fríos" value="${esc(j.note)}"></div>
      <div class="session__end"><button class="btn btn--primary btn--block" data-act="ticket-done">Listo</button></div>
    </div>`
  }

  function scrBiblioteca(st, ctx) {
    const me = st.me
    const pa = st.partner
    const f = st.libFilter
    const who = f === 'mia' ? [me] : f === 'suya' ? [pa] : [pa, me]
    const tiles = [{ b: 'tokio', duo: true }]
    for (const id of who) for (const r of READINGS[id]) if (r.s === 'reading' && !r.duo) tiles.push({ b: r.b, who: id })
    const tile = (t) => {
      const b = BOOKS[t.b]
      if (t.duo)
        return `<button class="book-tile" data-act="book" data-book="${t.b}">${cover(t.b, 112, { ribbons: [pa, me] })}<span class="book-tile__t">${esc(b.t)}</span>${pairBars(st, t.b)}<span class="book-tile__m">A dúo · tú p. ${st.page[me][t.b]}, ${name(pa)} p. ${st.page[pa][t.b]}</span></button>`
      const live = t.who === pa && st.partnerLive && t.b === partnerBook(st)
      const pg = live ? partnerLivePage(st) : st.page[t.who][t.b]
      return `<button class="book-tile ${PEOPLE[t.who].cls}" data-act="book" data-book="${t.b}">${cover(t.b, 112, { ribbons: [t.who] })}<span class="book-tile__t">${esc(b.t)}</span>${bar(pg / b.p)}<span class="book-tile__m">${t.who === me ? 'Tú' : name(t.who)} · p. ${pg}${live ? ' · leyendo ahora' : ''}</span></button>`
    }
    const mine = st.ratings[me].klara
    const theirs = st.ratings[pa].klara
    const klaraTag =
      mine != null && theirs != null
        ? `<span class="tag">${ic('star', 12, { fill: true })} Tú ${rating(mine)} · ${name(pa)} ${rating(theirs)}</span>`
        : mine == null
          ? `<span class="pill">${ic('star', 14, { fill: true })} Valorad a ciegas</span>`
          : `<span class="pill pill--soft">Esperando la nota de ${name(pa)}</span>`
    const gift = READINGS[me].find((r) => r.s === 'want' && r.gift)
    const given = READINGS[pa].find((r) => r.s === 'want' && r.gift === me)
    const shelfItems = SHELF.filter((it) => it.who.some((id) => who.includes(id)))
    const seg = (id, label) => `<button data-act="lib" data-filter="${id}" aria-pressed="${f === id}">${label}</button>`
    return `
      <header class="lib-head"><h1 class="display">Biblioteca</h1>
        <div class="row"><button class="close" data-act="toast" data-msg="Buscar y añadir sigue como ahora: por título, autor o código de barras." aria-label="Buscar un libro">${ic('search', 20)}</button>
          <button class="close" data-act="toast" data-msg="Buscar y añadir sigue como ahora: por título, autor o código de barras." aria-label="Añadir un libro">${ic('plus', 20)}</button></div></header>
      <div class="seg" role="group" aria-label="Qué libros ver">${seg('dos', 'Los dos')}${seg('mia', 'Míos')}${seg('suya', `De ${name(pa)}`)}</div>
      <section class="block" aria-labelledby="${ctx.uid}-now"><h2 class="h2" id="${ctx.uid}-now">Leyendo ahora</h2><div class="shelf-row">${tiles.map(tile).join('')}</div></section>
      <section class="block" aria-labelledby="${ctx.uid}-duo"><h2 class="h2" id="${ctx.uid}-duo">A dúo</h2><div>
        <button class="list-row" data-act="book" data-book="tokio">${cover('tokio', 48, { ribbons: [pa, me] })}<span class="list-row__t"><b>Tokio blues</b><span>Desde el 20 de octubre · en curso</span></span>${ic('chev')}</button>
        <button class="list-row" data-act="${mine != null && theirs != null ? 'book' : 'sheet'}" data-sheet="valorar" data-book="klara">${cover('klara', 48, { ribbons: [pa, me] })}<span class="list-row__t"><b>Klara y el Sol</b><span>Terminado por los dos</span>${klaraTag}</span>${ic('chev')}</button>
      </div></section>
      ${
        f !== 'suya' && gift
          ? `<section class="block" aria-labelledby="${ctx.uid}-gift"><h2 class="h2" id="${ctx.uid}-gift">Un regalo para ti</h2>
        <article class="card gift ${PEOPLE[gift.gift].cls}">${cover(gift.b, 70)}<div class="block" style="gap:8px"><p><b>${esc(BOOKS[gift.b].t)}</b><br><span class="muted small">De ${name(gift.gift)}, con dedicatoria</span></p><p class="gift__words">«${esc(gift.words)}»</p>
          <button class="btn btn--primary btn--sm" data-act="book" data-book="${gift.b}" style="justify-self:start">Abrirlo</button></div></article>
        ${given ? `<p class="foot">${ic('gift', 18)} <span>Tú le regalaste <b>${esc(BOOKS[given.b].t)}</b>. Aún no lo ha empezado.</span></p>` : ''}</section>`
          : ''
      }
      ${
        f === 'dos'
          ? `<section class="block" aria-labelledby="${ctx.uid}-jun"><h2 class="h2" id="${ctx.uid}-jun">Queremos leer juntos</h2><div>${TOGETHER_LIST.map(
              (t) =>
                `<div class="list-row">${cover(t.b, 48)}<span class="list-row__t"><b>${esc(BOOKS[t.b].t)}</b><span>Lo propuso ${t.by === me ? 'tú' : name(t.by)}: ${esc(t.why)}</span></span></div>`,
            ).join('')}</div></section>`
          : ''
      }
      <section class="block" aria-labelledby="${ctx.uid}-2026"><h2 class="h2" id="${ctx.uid}-2026">Leídos en 2026</h2>${shelf(st, shelfItems, 'Libros leídos en 2026')}
        <p class="legend"><span class="${PEOPLE[pa].cls}"><i></i>${name(pa)}</span><span class="${PEOPLE[me].cls}"><i></i>Tú</span></p></section>`
  }

  function scrLibro(st, ctx) {
    const key = st.bookKey
    const b = BOOKS[key]
    const me = st.me
    const pa = st.partner
    const mr = findReading(me, key)
    const pr = findReading(pa, key)
    const ribbons = [pr && pr.s !== 'want' ? pa : null, mr && mr.s !== 'want' ? me : null].filter(Boolean)
    const labels = { inicio: 'Inicio', citas: 'Citas', nosotros: 'Nosotros', racha: 'Racha', biblioteca: 'Biblioteca' }
    const quotes = st.quotes.filter((q) => q.b === key).sort((x, y) => x.page - y.page)
    let body = ''
    if (key === 'tokio') body = duoBody(st, ctx)
    else if (mr && mr.s === 'reading') body = ownBody(st, ctx, key)
    else if (pr && pr.s === 'reading') body = partnerBody(st, key)
    else if (mr && mr.s === 'want' && mr.gift) body = giftBody(st, mr)
    else body = doneBody(st, key, mr, pr)
    return `${back(st.from, labels[st.from] ?? 'Biblioteca')}
      <header class="book-hero">${cover(key, 112, { ribbons })}<div class="block" style="gap:6px"><h1 class="display">${esc(b.t)}</h1><p class="muted">${esc(b.a)} · ${b.p} páginas</p></div></header>
      ${body}
      <section class="block" aria-labelledby="${ctx.uid}-qs"><h2 class="h2" id="${ctx.uid}-qs">Citas y notas</h2>${
        quotes.length ? quotes.map((q) => quoteCard(q, st, { justLiked: ctx.justLiked })).join('') : '<p class="muted">Aún no hay ninguna en este libro.</p>'
      }</section>`
  }
  function duoBody(st, ctx) {
    const b = BOOKS.tokio
    const m = st.page[st.me].tokio
    const p = st.page[st.partner].tokio
    const pct = (n) => `${((n / b.p) * 100).toFixed(1)}%`
    const marks = st.quotes.filter((q) => q.b === 'tokio')
    const rows = DUO_SESSIONS.map((s) =>
      s.joint
        ? `<div class="tl"><time>${s.when}</time><div class="tl__who"><span class="tag">${ic('heart', 12, { fill: true })} A la vez · ${s.min} min</span><span>Tú +${s[st.me]} · ${name(st.partner)} +${s[st.partner]}</span></div></div>`
        : `<div class="tl"><time>${s.when}</time><div class="tl__who">${avatar(s.who, 22)}<span>${s.who === st.me ? 'Tú' : name(s.who)} · ${s.min} min · +${s[s.who]} págs.</span></div></div>`,
    ).join('')
    return `<p class="pill" style="align-self:flex-start">${ic('heart', 14, { fill: true, cls: 'rose' })} A dúo con ${name(st.partner)} desde el 20 de octubre</p>
      <div class="duo" role="img" aria-label="${esc(`Tú vas por la página ${m} y ${name(st.partner)} por la ${p}, de ${b.p}. Hay ${marks.length} citas marcadas en su página.`)}">
        <span class="duo__flag duo__flag--a ${PEOPLE[st.partner].cls}" style="--v:${pct(p)}">${name(st.partner)} · p. ${p}</span>
        <div class="duo__rail"><span class="duo__fill duo__fill--a ${PEOPLE[st.partner].cls}" style="--v:${pct(p)}"></span><span class="duo__fill duo__fill--b ${PEOPLE[st.me].cls}" style="--v:${pct(m)}"></span>
          ${marks.map((q) => `<span class="duo__mark${isLocked(q, st) ? ' duo__mark--locked' : ''} ${PEOPLE[q.by].cls}" style="--v:${pct(q.page)}"></span>`).join('')}</div>
        <span class="duo__flag duo__flag--b ${PEOPLE[st.me].cls}" style="--v:${pct(m)}">Tú · p. ${m}</span>
      </div>
      ${bookActions('tokio')}
      <section class="block" aria-labelledby="${ctx.uid}-ses"><h2 class="h2" id="${ctx.uid}-ses">Sesiones</h2><div class="timeline">${rows}</div></section>
      <p class="hint">${ic('star', 16)} Cuando terminéis los dos: valoración a ciegas y vuestra charla del libro.</p>`
  }
  function ownBody(st, ctx, key) {
    const b = BOOKS[key]
    const pg = st.page[st.me][key]
    const partnerHas = findReading(st.partner, key)
    return `<div class="block ${PEOPLE[st.me].cls}" style="gap:8px"><p class="folio num" style="margin:0">p. ${pg} <span>de ${b.p}</span></p>${bar(pg / b.p)}
        <p class="muted small">Desde el ${findReading(st.me, key).since}</p></div>
      ${bookActions(key)}
      <section class="block" aria-labelledby="${ctx.uid}-ses"><h2 class="h2" id="${ctx.uid}-ses">Tus sesiones</h2><div class="timeline">${OWN_SESSIONS.map(
        (s) => `<div class="tl"><time>${s.when}</time><div class="tl__who">${avatar(st.me, 22)}<span>${s.min} min · +${s.pages} págs.</span></div></div>`,
      ).join('')}</div></section>
      ${partnerHas ? '' : `<button class="btn btn--soft btn--block" data-act="toast" data-msg="Se lo regalarías con una dedicatoria y le aparecería envuelto en su biblioteca.">${ic('gift', 18)} Regalárselo a ${name(st.partner)}</button>`}`
  }
  function partnerBody(st, key) {
    const b = BOOKS[key]
    const live = st.partnerLive && key === partnerBook(st)
    const pg = live ? partnerLivePage(st) : st.page[st.partner][key]
    return `<div class="card ${PEOPLE[st.partner].cls}" style="display:grid;gap:8px"><p class="b">La lectura de ${name(st.partner)}</p>
        <p class="folio num" style="margin:0">p. ${pg} <span>de ${b.p}</span></p>${bar(pg / b.p)}
        <p class="muted small">${live ? `Leyendo ahora mismo, desde las ${STORY.start}` : `Desde el ${findReading(st.partner, key).since}`}</p></div>
      <div class="row"><button class="btn btn--primary btn--grow" data-act="toast" data-msg="Lo añadiríais a «Queremos leer juntos», con un motivo.">Queremos leerlo juntos</button>
        <button class="btn btn--soft btn--icon" data-act="beat" aria-label="Mandarle un latido">${ic('heart', 20, { fill: true, cls: 'rose' })}</button></div>`
  }
  function giftBody(st, r) {
    return `<article class="card gift ${PEOPLE[r.gift].cls}"><span class="av-wrap">${avatar(r.gift, 44)}</span><div class="block" style="gap:6px"><p class="b">Dedicatoria de ${name(r.gift)}</p><p class="gift__words">«${esc(r.words)}»</p></div></article>
      <button class="btn btn--primary btn--block" data-act="toast" data-msg="Pasaría a «Leyendo» y a ${name(r.gift)} le llegaría un aviso: ¡has empezado su regalo!">${ic('play', 16, { fill: true })} Empezar a leerlo</button>`
  }
  function doneBody(st, key, mr, pr) {
    if (key === 'klara') {
      const mine = st.ratings[st.me].klara
      const theirs = st.ratings[st.partner].klara
      const done = mine != null && theirs != null
      return `<div class="card" style="display:grid;gap:10px"><p class="b">Lo habéis terminado los dos</p>
        ${done ? `<p>Tú le diste <b>${rating(mine)}</b> y ${name(st.partner)} <b>${rating(theirs)}</b>.</p>` : '<p class="muted">Las notas se destapan cuando las pongáis los dos.</p>'}
        <button class="btn ${done ? 'btn--soft' : 'btn--primary'}" data-act="sheet" data-sheet="valorar">${done ? 'Ver la valoración' : 'Valorar a ciegas'}</button></div>`
    }
    const r = mr && mr.s === 'done' ? mr : pr
    const who = r === mr ? 'Tú' : name(st.partner)
    return `<div class="card" style="display:grid;gap:6px"><p><b>${who}</b> lo terminó en ${r.when}${r.rating ? ` · ${rating(r.rating)} de 5` : ''}.</p>
      <p class="muted small">Aparece en vuestra estantería de 2026.</p></div>`
  }

  function scrCitas(st, ctx) {
    const f = st.quoteFilter
    const all = [...st.quotes].sort((a, b) => a.t - b.t)
    const list = all.filter(
      (q) => f === 'todas' || (f === 'suyas' && q.by === st.partner) || (f === 'mias' && q.by === st.me) || f === q.b,
    )
    const books = [...new Set(all.map((q) => q.b))].slice(0, 3)
    const chip = (id, label) => `<button class="chip" data-act="qfilter" data-filter="${id}" aria-pressed="${f === id}">${esc(label)}</button>`
    return `<header class="block" style="gap:6px"><div class="lib-head"><h1 class="display">Citas</h1>
        <button class="btn btn--primary btn--sm" data-act="sheet" data-sheet="cita">${ic('plus', 18)} Nueva</button></div>
        <p class="muted">Las frases y notas que os dejáis, cada una en su página.</p></header>
      <div class="chips" role="group" aria-label="Filtrar citas">${chip('todas', 'Todas')}${chip('suyas', `De ${name(st.partner)}`)}${chip('mias', 'Mías')}${books.map((k) => chip(k, BOOKS[k].t)).join('')}</div>
      <div class="block">${list.map((q) => quoteCard(q, st, { justLiked: ctx.justLiked })).join('') || '<p class="empty-note">Nada por aquí todavía.</p>'}</div>`
  }

  function scrRacha(st, ctx) {
    const s = streaks(st)
    const cells = CAL.flat()
      .map((code, i) => {
        const d = dayState(code, st)
        const date = new Date(CAL_START.getTime() + i * 86400000)
        const label = date.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
        return stamp(d, st, { label, num: d.free ? null : String(date.getDate()), rot: ((i * 37) % 11) - 5, fresh: ctx.fresh.screen })
      })
      .join('')
    return `${back('nosotros', 'Nosotros')}
      <header class="streak-hero">${lampArt()}<div><p class="streak-num num">${s.shared} <small>${s.shared === 1 ? 'día' : 'días'}</small></p><h1 class="h2">leyendo los dos</h1></div></header>
      <p>${s.todayDone ? 'Hoy ya habéis leído los dos: la lámpara sigue encendida.' : `${name(st.partner)} ya ha leído hoy. Con un ratito tuyo, la racha sube a ${s.shared + 1}.`}</p>
      <div class="facts">
        <div class="fact"><b class="num">${s.best}</b><span>días, vuestra mejor racha (1–20 oct)</span></div>
        <div class="fact"><b class="num">${s.novBoth} de 8</b><span>días de noviembre leyendo los dos</span></div>
        <div class="fact"><b class="num">1 de 2</b><span>comodines usados este mes</span></div>
      </div>
      <section class="block" aria-labelledby="${ctx.uid}-cal"><h2 class="h2" id="${ctx.uid}-cal">Últimas seis semanas</h2>
        <div class="cal">${WEEKDAYS.map((w) => `<span class="cal__h" aria-hidden="true">${w}</span>`).join('')}${cells}</div>
        <p class="legend"><span class="rose">${ic('heart', 12, { fill: true })} Los dos</span><span class="${PEOPLE[st.partner].cls}"><i></i>Solo ${name(st.partner)}</span><span class="${PEOPLE[st.me].cls}"><i></i>Solo tú</span><span class="honey">${ic('moon', 12, { fill: true })} Comodín</span></p>
      </section>
      <section class="block" aria-labelledby="${ctx.uid}-sep"><h2 class="h2" id="${ctx.uid}-sep">Cada uno</h2>
        <div class="duo-streaks"><div class="card">${avatar(st.partner, 36)}<p><b class="num">${plural(s.partner, 'día', 'días')}</b><br><span class="muted small">${name(st.partner)}</span></p></div>
          <div class="card">${avatar(st.me, 36)}<p><b class="num">${plural(s.me, 'día', 'días')}</b><br><span class="muted small">Tú</span></p></div></div></section>
      <details class="rules"><summary>Cómo funciona ${ic('down', 18)}</summary><ul>
        <li>Un día cuenta si cada uno lee al menos 5 minutos o una página, según su hora.</li>
        <li>Tenéis 2 comodines al mes: si un día solo lee uno, se usa solo y la racha sigue.</li>
        <li>Si un día no lee ninguno, la racha vuelve a empezar. La mejor se queda guardada.</li>
        <li>A las 22:30, si falta uno, le llega un aviso suave. Se puede quitar.</li>
      </ul></details>`
  }

  function scrNosotros(st, ctx) {
    const s = streaks(st)
    const me = st.me
    const pa = st.partner
    const joint = st.jointDone
    const hours = TOTALS.yearHours + (joint ? joint.minutes / 60 : 0)
    const nights = TOTALS.novNights + (joint ? 1 : 0)
    const pages = TOTALS.novPages + st.savedPages + (joint ? joint.pTo - joint.pFrom : 0)
    const notes = st.quotes.filter((q) => q.t < 8 * 1440).length
    const loved = [...st.quotes].sort((a, b) => b.hearts.length + b.replies.length - (a.hearts.length + a.replies.length) || b.t - a.t)[0]
    return `
      <header class="exlibris"><p class="exlibris__k">Ex libris</p>
        <p class="exlibris__mono" aria-hidden="true"><span class="p-her">L</span><span class="amp">&amp;</span><span class="p-him">J</span></p>
        <h1 class="h2">${name('ella')} y ${name('el')}</h1><p class="exlibris__sub">Leyendo juntos desde marzo de 2026</p></header>
      <section class="card hero-stat" aria-label="Horas leyendo a la vez"><p class="hero-stat__n num">${Math.floor(hours)} <small>horas</small></p>
        <p class="b">leyendo a la vez en 2026</p><p class="muted">Más de dos días y medio, cada uno con su libro y el otro al lado.</p></section>
      <section class="card block" aria-labelledby="${ctx.uid}-rc"><div class="block__head"><h2 class="h2" id="${ctx.uid}-rc">Racha de los dos</h2>
        <button class="pill" data-act="go" data-to="racha" aria-label="Ver la racha: ${s.shared} días">${ic('lamp', 16)} ${plural(s.shared, 'día', 'días')} ${ic('chev', 16)}</button></div>${weekStrip(st, false)}</section>
      <section class="block" aria-labelledby="${ctx.uid}-nov"><h2 class="h2" id="${ctx.uid}-nov">Noviembre, de momento</h2><div class="facts">
        <div class="fact"><b class="num">${nights}</b><span>noches leyendo a la vez</span></div>
        <div class="fact"><b class="num">${pages}</b><span>páginas entre los dos</span></div>
        <div class="fact"><b class="num">${notes}</b><span>citas y notas compartidas</span></div></div></section>
      <section class="block" aria-labelledby="${ctx.uid}-est"><h2 class="h2" id="${ctx.uid}-est">Vuestra estantería de 2026</h2>${shelf(st, SHELF, 'Estantería de 2026')}
        <p class="legend"><span class="${PEOPLE[pa].cls}"><i></i>${name(pa)}</span><span class="${PEOPLE[me].cls}"><i></i>Tú</span><span>9 lecturas, 8 libros</span></p></section>
      <section class="block" aria-labelledby="${ctx.uid}-lov"><h2 class="h2" id="${ctx.uid}-lov">La cita más querida</h2>${quoteCard(loved, st, { compact: true, justLiked: ctx.justLiked })}</section>
      <section class="card goal" aria-labelledby="${ctx.uid}-goal"><div class="block__head"><h2 class="h2" id="${ctx.uid}-goal">Reto de noviembre</h2><span class="pill">${nights} de 10</span></div>
        <p class="muted small">Leer a la vez 10 noches. Vale cualquier noche en la que os juntéis, aunque sea un rato.</p>
        <div class="goal__track" style="--n:10" role="img" aria-label="${nights} de 10 noches">${Array.from({ length: 10 }, (_, i) => `<i class="${i < nights ? 'on' : ''}"></i>`).join('')}</div></section>
      <section class="block" aria-labelledby="${ctx.uid}-hit"><h2 class="h2" id="${ctx.uid}-hit">Hitos</h2><div class="badges">${MILESTONES.map(
        (m, i) =>
          `<div class="badge${m.on ? '' : ' badge--locked'}"><span class="badge__seal" style="--rot:${[-8, 6, -4, 7, 0, 0][i]}deg">${ic(m.on ? m.icon : 'lock', 26, { fill: m.on && m.icon === 'heart' })}</span>${esc(m.t)}<small>${esc(m.d)}</small></div>`,
      ).join('')}</div></section>
      <section class="card"><button class="letter-btn" data-act="sheet" data-sheet="carta"><span class="envelope" aria-hidden="true"></span>
        <span class="option__t"><b>Vuestra carta de octubre</b><span>27 días leyendo los dos, 9 noches a la vez y la cita que más os gustó.</span></span>${ic('chev')}</button></section>
      <section class="block" aria-labelledby="${ctx.uid}-jl"><h2 class="h2" id="${ctx.uid}-jl">Queremos leer juntos</h2><div>${TOGETHER_LIST.map(
        (t) => `<div class="list-row">${cover(t.b, 48)}<span class="list-row__t"><b>${esc(BOOKS[t.b].t)}</b><span>Lo propuso ${t.by === me ? 'tú' : name(t.by)}: ${esc(t.why)}</span></span></div>`,
      ).join('')}</div></section>`
  }

  // ───────────── Sheets ─────────────
  function sheetWrap(uid, title, body) {
    return `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="${uid}-sh"><div class="sheet__grab" aria-hidden="true"></div>
      <div class="sheet__head"><h2 class="h2" id="${uid}-sh">${title}</h2><button class="close" data-act="close-sheet" aria-label="Cerrar">${ic('x', 20)}</button></div>${body}</div>`
  }
  function sheetUnirse(st, ctx) {
    const pa = st.partner
    return sheetWrap(
      ctx.uid,
      '¿Cómo te apetece leer?',
      `<button class="option option--lamp" data-act="join">${avatar(pa, 46, { live: true })}<span class="option__t"><b>Leer con ${name(pa)}</b><span>Lleva ${STORY.liveMin} min con «${esc(BOOKS[partnerBook(st)].t)}». Compartís cronómetro y os veis la página.</span></span>${ic('chev')}</button>
      <button class="option" data-act="read">${ic('open', 26)}<span class="option__t"><b>Leer por mi cuenta</b><span>Un cronómetro solo para ti.</span></span>${ic('chev')}</button>
      <button class="option" data-act="sheet" data-sheet="apuntar">${ic('pen', 24)}<span class="option__t"><b>Apuntar lo que ya leí</b><span>Página y rato, sin cronómetro.</span></span>${ic('chev')}</button>
      <div class="switch-row"><span>Tu libro: <b>${esc(BOOKS[st.readBook].t)}</b></span><button class="link" data-act="swap-book">Cambiar</button></div>`,
    )
  }
  function sheetTerminar(st, ctx) {
    const s = st.session
    const b = BOOKS[s.book]
    const value = st.sheetData.finish ?? suggestedPage(st)
    return sheetWrap(
      ctx.uid,
      s.kind === 'juntos' ? 'Terminar tu parte' : 'Guardar la sesión',
      `<p class="muted">${minutesLabel(elapsed(st) / 60)} con «${esc(b.t)}». Empezaste en la p. ${s.startPage}.</p>
      <div class="field"><span class="field__label" id="${ctx.uid}-fin">¿Por qué página vas?</span>${stepper(ctx.uid, 'finish', value, s.startPage, b.p, `${ctx.uid}-fin`)}</div>
      ${s.kind === 'juntos' ? `<p class="hint">${ic('heart', 16, { fill: true, cls: 'rose' })} ${name(st.partner)} termina contigo: se guarda como sesión juntos.</p>` : ''}
      <button class="btn btn--primary btn--block" data-act="save-session">Guardar</button>
      <button class="btn btn--soft btn--block" data-act="close-sheet">Seguir leyendo</button>`,
    )
  }
  function sheetApuntar(st, ctx) {
    const d = st.sheetData
    const key = d.book ?? CURRENT[st.me]
    const b = BOOKS[key]
    const cur = st.page[st.me][key]
    const value = d.page ?? Math.min(b.p, cur + 12)
    const mins = d.minutes ?? 20
    const day = d.day ?? 'hoy'
    return sheetWrap(
      ctx.uid,
      'Apuntar lectura',
      `<div class="chips" role="group" aria-label="Libro">${myReadingKeys(st)
        .map((k) => `<button class="chip" data-act="ap-book" data-book="${k}" aria-pressed="${k === key}">${esc(BOOKS[k].t)}</button>`)
        .join('')}</div>
      <div class="field"><span class="field__label" id="${ctx.uid}-ap">Voy por la página (antes, la ${cur})</span>${stepper(ctx.uid, 'apage', value, cur, b.p, `${ctx.uid}-ap`)}</div>
      <div class="field"><span class="field__label" id="${ctx.uid}-min">¿Cuánto rato, más o menos?</span><div class="chips" role="group" aria-labelledby="${ctx.uid}-min">${[10, 20, 30, 45, 60]
        .map((m) => `<button class="chip" data-act="ap-min" data-min="${m}" aria-pressed="${m === mins}">${m} min</button>`)
        .join('')}</div></div>
      <div class="field"><span class="field__label" id="${ctx.uid}-day">¿Cuándo?</span><div class="seg" role="group" aria-labelledby="${ctx.uid}-day">${['hoy', 'ayer']
        .map((v) => `<button data-act="ap-day" data-day="${v}" aria-pressed="${v === day}">${v === 'hoy' ? 'Hoy' : 'Ayer'}</button>`)
        .join('')}</div></div>
      <button class="btn btn--primary btn--block" data-act="save-apuntar">Guardar</button>`,
    )
  }
  function citaInfo(st) {
    const d = st.sheetData
    const key = d.book ?? st.session?.book ?? CURRENT[st.me]
    const page = Number(d.page ?? (st.session && st.session.book === key ? st.session.page : st.page[st.me][key]))
    const share = d.share ?? true
    const pr = findReading(st.partner, key)
    const pPage = st.page[st.partner][key]
    if (!share) return `${ic('lock', 16)} Solo la verás tú.`
    if (pr && pr.s === 'reading' && pPage < page)
      return `${ic('lock', 16)} ${name(st.partner)} va por la p. ${pPage}: la verá al llegar a la ${page}, sin spoilers.`
    return `${ic('heart', 16, { fill: true, cls: 'rose' })} ${name(st.partner)} la verá en su muro y le llegará un aviso suave.`
  }
  function sheetCita(st, ctx) {
    const d = st.sheetData
    const key = d.book ?? st.session?.book ?? CURRENT[st.me]
    const b = BOOKS[key]
    const page = d.page ?? (st.session && st.session.book === key ? st.session.page : st.page[st.me][key])
    const kind = d.kind ?? 'cita'
    const share = d.share ?? true
    const kinds = [
      ['cita', 'Cita del libro'],
      ['nota', 'Nota mía'],
    ]
    return sheetWrap(
      ctx.uid,
      kind === 'cita' ? 'Nueva cita' : 'Nueva nota',
      `<div class="seg" role="group" aria-label="Tipo">${kinds.map(([k, label]) => `<button data-act="q-kind" data-kind="${k}" aria-pressed="${k === kind}">${label}</button>`).join('')}</div>
      <div class="chips" role="group" aria-label="Libro">${myReadingKeys(st)
        .map((k) => `<button class="chip" data-act="q-book" data-book="${k}" aria-pressed="${k === key}">${esc(BOOKS[k].t)}</button>`)
        .join('')}</div>
      <div class="field"><label for="${ctx.uid}-qt">${kind === 'cita' ? 'La frase' : 'Lo que quieres dejar aquí'}</label>
        <textarea id="${ctx.uid}-qt" class="textarea${kind === 'nota' ? ' textarea--hand' : ''}" data-input="qtext" placeholder="${kind === 'cita' ? 'Escríbela o cópiala de la página' : 'Algo que quieras que lea al llegar aquí'}">${esc(d.text ?? '')}</textarea>
        ${d.error ? `<p class="hint rose" role="alert">${esc(d.error)}</p>` : ''}
        ${kind === 'cita' ? `<p class="hint">${ic('camera', 16)} En el iPhone puedes copiarla de la página con la cámara (Texto en vivo).</p>` : ''}</div>
      <div class="row" style="gap:12px;align-items:flex-end"><div class="field" style="width:104px;flex:none"><label for="${ctx.uid}-qp">Página</label>
        <input id="${ctx.uid}-qp" class="input num" type="number" inputmode="numeric" min="0" max="${b.p}" value="${page}" data-input="qpage"></div>
        ${kind === 'cita' ? `<div class="field" style="flex:1"><label for="${ctx.uid}-qn">Tu comentario (opcional)</label><input id="${ctx.uid}-qn" class="input textarea--hand" data-input="qnote" placeholder="Por qué te la guardas" value="${esc(d.note ?? '')}"></div>` : ''}</div>
      <div class="switch-row"><span id="${ctx.uid}-qs">Que la vea ${name(st.partner)}</span><button class="switch" role="switch" aria-checked="${share}" aria-labelledby="${ctx.uid}-qs" data-act="q-share"></button></div>
      <p class="hint" data-qinfo>${citaInfo(st)}</p>
      <button class="btn btn--primary btn--block" data-act="save-quote">Guardar ${kind}</button>`,
    )
  }
  function sheetValorar(st, ctx) {
    const me = st.me
    const pa = st.partner
    const mine = st.ratings[me].klara
    const theirs = st.ratings[pa].klara
    if (mine != null && theirs != null) {
      const diff = Math.abs(mine - theirs)
      const verdict =
        diff === 0 ? 'El mismo número: os ha gustado igual.' : diff <= 0.5 ? 'Casi de acuerdo: medio punto de diferencia.' : 'No pensáis igual: tenéis de qué hablar.'
      return sheetWrap(
        ctx.uid,
        'Klara y el Sol',
        `<div class="reveal${ctx.fresh.reveal ? ' is-revealing' : ''}">
          <div class="reveal__card ${PEOPLE[pa].cls}">${avatar(pa, 40)}<span class="b">${name(pa)}</span><span class="reveal__n num">${rating(theirs)}</span><span class="muted small">de 5</span></div>
          <div class="reveal__card ${PEOPLE[me].cls}">${avatar(me, 40)}<span class="b">Tú</span><span class="reveal__n num">${rating(mine)}</span><span class="muted small">de 5</span></div></div>
        <p class="b" style="text-align:center">${verdict}</p>
        <button class="btn btn--primary btn--block" data-act="book" data-book="klara">Abrir la charla del libro</button>`,
      )
    }
    if (mine != null)
      return sheetWrap(
        ctx.uid,
        'Tu nota, en secreto',
        `<p>Has puesto tu nota a <b>Klara y el Sol</b>. ${name(pa)} aún no ha puesto la suya: cuando lo haga, se destapan las dos a la vez.</p>
        <button class="btn btn--primary btn--block" data-act="toast" data-msg="Le llegaría: «${name(me)} ya ha valorado Klara y el Sol. ¿Y tú?»">Recordárselo con cariño</button>`,
      )
    const draft = st.sheetData.r ?? 0
    return sheetWrap(
      ctx.uid,
      'Valorar a ciegas',
      `<p>Los dos habéis terminado <b>Klara y el Sol</b>. ${theirs != null ? `${name(pa)} ya ha puesto su nota, ` : ''}pon la tuya sin verla: se destapan a la vez.</p>
      <div class="stars" role="group" aria-label="Tu nota">${[1, 2, 3, 4, 5]
        .map((n) => {
          const clip = draft >= n ? 0 : draft === n - 0.5 ? 50 : 100
          return `<button class="star-btn" data-act="rate" data-r="${n}" aria-pressed="${draft >= n - 0.5}" aria-label="${n} ${n === 1 ? 'estrella' : 'estrellas'}"><span class="star-stack">${ic('star', 30)}<span class="star-fill" style="clip-path:inset(0 ${clip}% 0 0)">${ic('star', 30, { fill: true })}</span></span></button>`
        })
        .join('')}</div>
      <p class="muted small" style="text-align:center">${draft ? `Tu nota: <b class="num">${rating(draft)}</b> de 5. Toca otra vez la misma estrella para media.` : 'Toca una estrella; dos veces para media.'}</p>
      <button class="btn btn--primary btn--block" data-act="reveal" ${draft ? '' : 'disabled'}>Destapar a la vez</button>`,
    )
  }
  function sheetCarta(st, ctx) {
    return sheetWrap(
      ctx.uid,
      'Carta de octubre',
      `<article class="letter">
        <p>Querida ${name('ella')}, querido ${name('el')}:</p>
        <p>En octubre leísteis los dos 27 de sus 31 días. Hubo 9 noches en las que leísteis a la vez, casi siete horas en total. La más larga fue la del sábado 24: 1 h 32 min.</p>
        <p>${name('el')} terminó <i>Klara y el Sol</i>, el libro que ${name('ella')} le había recomendado, y empezó <i>Proyecto Hail Mary</i>. ${name('ella')} se metió en <i>La sombra del viento</i> y a final de mes ya iba por la mitad.</p>
        <p>El día 20 empezasteis <i>Tokio blues</i> a dúo.</p>
        <p>La cita que más os gustó: «Cada libro, cada tomo que ves, tiene alma».</p>
        <p>Que noviembre os pille con el mismo libro entre las manos.</p>
        <p class="letter__sign">Greenbook</p></article>
      <button class="btn btn--soft btn--block" data-act="toast" data-msg="En la app se guardaría como imagen para compartirla.">${ic('gift', 18)} Guardar como imagen</button>`,
    )
  }
  function sheetAbrir(st, ctx) {
    const q = st.quotes.find((x) => x.id === st.sheetData.id)
    if (!q) return ''
    const left = q.page - st.page[st.me][q.b]
    return sheetWrap(
      ctx.uid,
      '¿La abres ya?',
      `<p>${name(q.by)} la dejó en la p. ${q.page} de «${esc(BOOKS[q.b].t)}» para cuando llegues. Te faltan ${plural(left, 'página', 'páginas')}.</p>
      <p class="muted">Puede destriparte algo, y ${name(q.by)} verá que no pudiste esperar.</p>
      <button class="btn btn--primary btn--block" data-act="close-sheet">Mejor espero</button>
      <button class="btn btn--soft btn--block" data-act="open-now" data-id="${q.id}">Abrirla igualmente</button>`,
    )
  }
  function sheetResponder(st, ctx) {
    const q = st.quotes.find((x) => x.id === st.sheetData.id)
    if (!q) return ''
    return sheetWrap(
      ctx.uid,
      'Responder',
      `<p class="muted small">${q.by === st.me ? 'Tu' : `La de ${name(q.by)},`} p. ${q.page} de «${esc(BOOKS[q.b].t)}»</p>
      <div class="field"><label for="${ctx.uid}-rp">Tu respuesta</label><textarea id="${ctx.uid}-rp" class="textarea textarea--hand" data-input="reply" placeholder="Escribe algo bonito">${esc(st.sheetData.reply ?? '')}</textarea></div>
      <button class="btn btn--primary btn--block" data-act="save-reply" data-id="${q.id}">Enviar</button>`,
    )
  }
  const SHEETS = {
    unirse: sheetUnirse,
    terminar: sheetTerminar,
    apuntar: sheetApuntar,
    cita: sheetCita,
    valorar: sheetValorar,
    carta: sheetCarta,
    abrir: sheetAbrir,
    responder: sheetResponder,
  }
  const SCREENS = {
    inicio: scrInicio,
    biblioteca: scrBiblioteca,
    libro: scrLibro,
    citas: scrCitas,
    nosotros: scrNosotros,
    racha: scrRacha,
    leer: scrLeer,
    juntos: scrJuntos,
    ticket: scrTicket,
  }
  const FOCUS = new Set(['leer', 'juntos', 'ticket'])
  const TAB_OF = { inicio: 'inicio', biblioteca: 'biblioteca', libro: 'biblioteca', citas: 'citas', nosotros: 'nosotros', racha: 'nosotros' }

  function tabbar(st) {
    const cur = TAB_OF[st.screen]
    const tab = (id, label, icon) =>
      `<button class="tab" data-act="tab" data-to="${id}" ${cur === id ? 'aria-current="page"' : ''}>${ic(icon, 24)}<span>${label}</span></button>`
    const live = st.partnerLive && !st.session
    const s = st.session
    const label = s ? `Volver a tu sesión, ${clock(elapsed(st))}` : live ? `Leer. ${name(st.partner)} está leyendo ahora` : 'Leer'
    return `<nav class="tabbar" aria-label="Secciones">${tab('inicio', 'Inicio', 'home')}${tab('biblioteca', 'Biblioteca', 'books')}
      <button class="tab tab--read${live ? ' is-live' : ''}" data-act="read-main" aria-label="${esc(label)}"><span class="fab">${ic('open', 26)}</span><span class="num" ${s ? 'data-tick="clock"' : ''}>${s ? clock(elapsed(st)) : 'Leer'}</span></button>
      ${tab('citas', 'Citas', 'quote')}${tab('nosotros', 'Nosotros', 'heart')}</nav>`
  }
  function bannerEl(st, ctx) {
    return `<div class="banner${ctx.fresh.banner ? ' is-entering' : ''}" role="status"><button class="banner__main" data-act="banner"><span class="banner__icon" aria-hidden="true">G</span>
      <span class="banner__txt"><small>Greenbook · ahora</small><span><b>${name(st.partner)}</b> se ha puesto a leer «${esc(BOOKS[partnerBook(st)].t)}». ¿Te unes?</span></span></button>
      <button class="close" data-act="dismiss-banner" aria-label="Cerrar el aviso">${ic('x', 18)}</button></div>`
  }

  /** The whole phone for a state; `ctx.static` renders the frozen copies of the overview. */
  function renderApp(st, ctx) {
    const night = FOCUS.has(st.screen)
    const body = SCREENS[st.screen](st, ctx)
    const sheet = st.sheet ? SHEETS[st.sheet](st, ctx) : ''
    return `<div class="screen${night ? ' night' : ''}${ctx.fresh.screen ? ' is-fresh' : ''}"><div class="scroll" data-scroll>${body}</div></div>
      ${night ? '' : tabbar(st)}
      ${st.banner ? bannerEl(st, ctx) : ''}
      ${sheet ? `<div class="layer${ctx.fresh.sheet ? ' is-entering' : ''}${night ? ' night' : ''}"><div class="layer__scrim" data-act="close-sheet"></div>${sheet}</div>` : ''}
      ${st.toast ? `<div class="toast${ctx.fresh.toast ? ' is-entering' : ''}${night && !sheet ? ' toast--low night' : ''}" role="status">${ic('heart', 18, { fill: true })}<span>${esc(st.toast.text)}</span></div>` : ''}`
  }

  // ───────────── Live prototype ─────────────
  const appEl = document.getElementById('app')
  let state = freshState('el', initialMode())
  let prev = { screen: '', sheet: '', toast: 0, banner: false, reveal: false }
  let justLiked = null
  let toastTimer = 0
  let beatTimer = 0

  const KEY_ATTRS = ['act', 'to', 'book', 'id', 'sheet', 'field', 'd', 'kind', 'min', 'day', 'filter', 'input', 'r']
  const keyOf = (el) => (el && el !== document.body && appEl.contains(el) ? KEY_ATTRS.map((k) => el.dataset[k] ?? '').join('|') : null)

  function render() {
    const st = state
    const screenKey = `${st.me}|${st.screen}|${st.bookKey}`
    const sheetKey = st.sheet ?? ''
    const reveal = st.ratings[st.me].klara != null && st.ratings[st.partner].klara != null
    const fresh = {
      screen: screenKey !== prev.screen,
      sheet: !!sheetKey && sheetKey !== prev.sheet,
      toast: !!st.toast && st.toast.id !== prev.toast,
      banner: st.banner && !prev.banner,
      reveal: reveal && !prev.reveal,
    }
    const scroller = appEl.querySelector('[data-scroll]')
    const top = !fresh.screen && scroller ? scroller.scrollTop : 0
    const sheetEl = appEl.querySelector('.sheet')
    const sheetTop = !fresh.sheet && sheetEl ? sheetEl.scrollTop : 0
    const focusKey = keyOf(document.activeElement)
    appEl.dataset.mode = st.mode
    appEl.innerHTML = renderApp(st, { uid: 'a', static: false, fresh, justLiked })
    justLiked = null
    const nextScroller = appEl.querySelector('[data-scroll]')
    if (nextScroller) nextScroller.scrollTop = top
    const nextSheet = appEl.querySelector('.sheet')
    if (nextSheet) nextSheet.scrollTop = sheetTop
    if (fresh.sheet) appEl.querySelector('.sheet .close')?.focus({ preventScroll: true })
    else if (focusKey) {
      const match = [...appEl.querySelectorAll('[data-act],[data-input]')].find((el) => keyOf(el) === focusKey)
      match?.focus({ preventScroll: true })
    }
    prev = { screen: screenKey, sheet: sheetKey, toast: st.toast?.id ?? 0, banner: st.banner, reveal }
    syncShell()
  }

  function showToast(text) {
    const id = Date.now() + Math.random()
    state.toast = { id, text }
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      if (state.toast?.id === id) {
        state.toast = null
        render()
      }
    }, 3400)
  }
  function go(screen) {
    state.screen = screen
    state.sheet = null
    state.sheetData = {}
    state.banner = false
    render()
  }
  function openSheet(sheet, data = {}) {
    state.sheet = sheet
    state.sheetData = data
    render()
  }
  function closeSheet() {
    state.sheet = null
    state.sheetData = {}
    render()
  }


  /** A heart crossing from one reader to the other along the thread. */
  function flyHeart(fromMe) {
    const readers = appEl.querySelector('.readers')
    if (!readers) return
    const avatars = readers.querySelectorAll('.reader .av')
    if (avatars.length < 2) return
    const [left, right] = avatars
    const src = fromMe ? right : left
    const dst = fromMe ? left : right
    const center = (el) => [el.offsetLeft + el.offsetWidth / 2, el.offsetTop + el.offsetHeight / 2]
    const [sx, sy] = center(src)
    const [dx] = center(dst)
    const flyer = document.createElement('span')
    flyer.className = 'flyer'
    flyer.innerHTML = ic('heart', 26, { fill: true })
    flyer.style.left = `${sx - 13}px`
    flyer.style.top = `${sy - 13}px`
    flyer.style.setProperty('--dx', `${dx - sx}px`)
    readers.appendChild(flyer)
    const heart = readers.querySelector('.thread__heart')
    heart?.classList.remove('is-beat')
    void heart?.offsetWidth
    heart?.classList.add('is-beat')
    setTimeout(() => flyer.remove(), 1200)
  }
  function scheduleIncomingBeat() {
    clearTimeout(beatTimer)
    beatTimer = setTimeout(() => {
      const s = state.session
      if (!s || s.kind !== 'juntos') return
      s.feed.push({ t: storyNow(state), text: `${name(state.partner)} te ha mandado un latido` })
      showToast(`${name(state.partner)} te ha mandado un latido`)
      render()
      if (state.screen === 'juntos') flyHeart(false)
    }, 7000)
  }

  function updatePageInputs(field, value) {
    appEl.querySelectorAll(`[data-input="${field}"]`).forEach((el) => {
      el.value = value
    })
    if (field === 'page') appEl.querySelectorAll('[data-live-page]').forEach((el) => (el.textContent = value))
  }

  function onClick(event) {
    const el = event.target.closest('[data-act]')
    if (!el || !appEl.contains(el)) return
    const st = state
    const act = el.dataset.act
    const d = el.dataset
    switch (act) {
      case 'tab':
        st.from = d.to
        return go(d.to)
      case 'go':
        if (d.to === 'leer' || d.to === 'juntos') {
          if (!st.session) return go('inicio')
        }
        if (d.to === 'ticket' && !st.jointDone) return go('inicio')
        return go(d.to)
      case 'book':
        st.from = TAB_OF[st.screen] === 'biblioteca' && st.screen === 'libro' ? st.from : st.screen === 'racha' ? 'racha' : TAB_OF[st.screen] ?? 'inicio'
        st.bookKey = d.book
        return go('libro')
      case 'read-main':
        if (st.session) return go(st.session.kind === 'juntos' ? 'juntos' : 'leer')
        if (st.partnerLive) return openSheet('unirse')
        startSession(st, 'solo')
        return render()
      case 'read':
        if (st.session) return go(st.session.kind === 'juntos' ? 'juntos' : 'leer')
        startSession(st, 'solo', { book: d.book ?? st.readBook })
        return render()
      case 'join':
        if (st.session) toJoint(st)
        else startSession(st, 'juntos')
        render()
        return scheduleIncomingBeat()
      case 'to-joint':
        toJoint(st)
        render()
        return scheduleIncomingBeat()
      case 'banner':
        st.banner = false
        return openSheet('unirse')
      case 'dismiss-banner':
        st.banner = false
        return render()
      case 'swap-book': {
        const keys = myReadingKeys(st)
        st.readBook = keys[(keys.indexOf(st.readBook) + 1) % keys.length]
        return render()
      }
      case 'sheet': {
        const data = {}
        if (d.book) data.book = d.book
        if (d.id) data.id = d.id
        if (d.sheet === 'terminar') data.finish = suggestedPage(st)
        return openSheet(d.sheet, data)
      }
      case 'close-sheet':
        return closeSheet()
      case 'toast':
        showToast(d.msg)
        return render()
      case 'beat':
        if (st.screen === 'juntos') flyHeart(true)
        else {
          const svg = el.querySelector('.ic')
          svg?.classList.remove('is-beat')
          void svg?.getBoundingClientRect()
          svg?.classList.add('is-beat')
        }
        if (st.session?.kind === 'juntos') st.session.feed.push({ t: storyNow(st), text: `Le has mandado un latido a ${name(st.partner)}` })
        showToast(`Latido enviado. A ${name(st.partner)} le vibrará el móvil, suave.`)
        return render()
      case 'pause':
        if (st.session && st.session.pausedAt == null) st.session.pausedAt = Date.now()
        return render()
      case 'resume':
        if (st.session && st.session.pausedAt != null) {
          st.session.pausedMs += Date.now() - st.session.pausedAt
          st.session.pausedAt = null
        }
        return render()
      case 'step': {
        const delta = Number(d.d)
        if (d.field === 'page' && st.session) {
          const s = st.session
          s.page = clamp(s.page + delta, s.startPage, BOOKS[s.book].p)
          return updatePageInputs('page', s.page)
        }
        if (d.field === 'finish' && st.session) {
          const s = st.session
          st.sheetData.finish = clamp((st.sheetData.finish ?? suggestedPage(st)) + delta, s.startPage, BOOKS[s.book].p)
          return updatePageInputs('finish', st.sheetData.finish)
        }
        if (d.field === 'apage') {
          const key = st.sheetData.book ?? CURRENT[st.me]
          const cur = st.page[st.me][key]
          st.sheetData.page = clamp((st.sheetData.page ?? Math.min(BOOKS[key].p, cur + 12)) + delta, cur, BOOKS[key].p)
          return updatePageInputs('apage', st.sheetData.page)
        }
        return undefined
      }
      case 'save-session':
        return saveSession()
      case 'ap-book':
        st.sheetData = { ...st.sheetData, book: d.book, page: undefined }
        return render()
      case 'ap-min':
        st.sheetData.minutes = Number(d.min)
        return render()
      case 'ap-day':
        st.sheetData.day = d.day
        return render()
      case 'save-apuntar':
        return saveApuntar()
      case 'q-kind':
        st.sheetData.kind = d.kind
        return render()
      case 'q-book':
        st.sheetData = { ...st.sheetData, book: d.book, page: undefined }
        return render()
      case 'q-share':
        st.sheetData.share = !(st.sheetData.share ?? true)
        return render()
      case 'save-quote':
        return saveQuote()
      case 'heart': {
        const q = st.quotes.find((x) => x.id === d.id)
        if (!q) return undefined
        const i = q.hearts.indexOf(st.me)
        if (i >= 0) q.hearts.splice(i, 1)
        else {
          q.hearts.push(st.me)
          justLiked = q.id
          showToast(`A ${name(st.partner)} le llega tu corazón.`)
        }
        return render()
      }
      case 'open-now':
        st.opened.push(d.id)
        st.sheet = null
        showToast(`Abierta. ${name(st.partner)} sabrá que no pudiste esperar.`)
        return render()
      case 'save-reply': {
        const q = st.quotes.find((x) => x.id === d.id)
        const text = (st.sheetData.reply ?? '').trim()
        if (!q || !text) return undefined
        q.replies.push({ by: st.me, text })
        st.sheet = null
        showToast(`Respuesta enviada a ${name(st.partner)}.`)
        return render()
      }
      case 'rate': {
        const n = Number(d.r)
        const cur = st.sheetData.r ?? 0
        st.sheetData.r = cur === n ? n - 0.5 : n
        return render()
      }
      case 'reveal':
        if (!st.sheetData.r) return undefined
        st.ratings[st.me].klara = st.sheetData.r
        if (st.ratings[st.partner].klara == null) showToast(`Guardada en secreto. Se destapa cuando ${name(st.partner)} ponga la suya.`)
        return render()
      case 'lib':
        st.libFilter = d.filter
        return render()
      case 'qfilter':
        st.quoteFilter = d.filter
        return render()
      case 'goodnight':
        st.goodnight = true
        showToast(`Buenas noches enviadas. ${name(st.partner)} las verá al despertar.`)
        return render()
      case 'ticket-done':
        st.from = 'inicio'
        return go('inicio')
      default:
        return undefined
    }
  }

  function saveSession() {
    const st = state
    const s = st.session
    if (!s) return
    const page = clamp(Number(st.sheetData.finish ?? suggestedPage(st)) || s.startPage, s.startPage, BOOKS[s.book].p)
    const minutes = Math.max(1, Math.round(elapsed(st) / 60))
    const delta = page - s.startPage
    const wasDone = st.readToday
    st.page[st.me][s.book] = page
    st.savedPages += delta
    st.readToday = true
    clearTimeout(beatTimer)
    if (s.kind === 'juntos') {
      const pEnd = partnerLivePage(st)
      st.jointDone = {
        minutes,
        start: s.joinedAt,
        end: storyNow(st),
        myBook: s.book,
        myFrom: s.startPage,
        myTo: page,
        pBook: partnerBook(st),
        pFrom: s.partnerStart,
        pTo: pEnd,
        note: '',
      }
      st.page[st.partner][partnerBook(st)] = pEnd - Math.floor(STORY.liveMin / 2)
      st.partnerLive = false
      st.session = null
      return go('ticket')
    }
    st.session = null
    showToast(wasDone ? `Guardado: +${plural(delta, 'página', 'páginas')}.` : `Guardado: +${plural(delta, 'página', 'páginas')}. Hoy habéis leído los dos.`)
    return go('inicio')
  }
  function saveApuntar() {
    const st = state
    const d = st.sheetData
    const key = d.book ?? CURRENT[st.me]
    const cur = st.page[st.me][key]
    const page = clamp(Number(d.page ?? Math.min(BOOKS[key].p, cur + 12)) || cur, cur, BOOKS[key].p)
    const delta = page - cur
    st.page[st.me][key] = page
    st.savedPages += delta
    const wasDone = st.readToday
    if ((d.day ?? 'hoy') === 'hoy') st.readToday = true
    st.sheet = null
    st.sheetData = {}
    showToast(
      (d.day ?? 'hoy') === 'ayer'
        ? `Apuntado en ayer: +${plural(delta, 'página', 'páginas')}, ${d.minutes ?? 20} min.`
        : wasDone
          ? `Apuntado: +${plural(delta, 'página', 'páginas')}, ${d.minutes ?? 20} min.`
          : `Apuntado: +${plural(delta, 'página', 'páginas')}. Hoy habéis leído los dos.`,
    )
    render()
  }
  function saveQuote() {
    const st = state
    const d = st.sheetData
    const text = (d.text ?? '').trim()
    if (!text) {
      d.error = d.kind === 'nota' ? 'Escribe la nota antes de guardarla.' : 'Escribe la frase antes de guardarla.'
      render()
      appEl.querySelector('[data-input="qtext"]')?.focus()
      return
    }
    const key = d.book ?? st.session?.book ?? CURRENT[st.me]
    const fallback = st.session && st.session.book === key ? st.session.page : st.page[st.me][key]
    const page = clamp(Number(d.page ?? fallback) || 0, 0, BOOKS[key].p)
    const share = d.share ?? true
    st.quotes.push({
      id: `u${Date.now()}`,
      by: st.me,
      b: key,
      page,
      kind: d.kind ?? 'cita',
      text,
      note: (d.note ?? '').trim(),
      ago: 'ahora',
      t: -1,
      hearts: [],
      replies: [],
      private: !share,
    })
    st.sheet = null
    st.sheetData = {}
    if (st.session) {
      if (st.session.kind === 'juntos') st.session.feed.push({ t: storyNow(st), text: `Has guardado una cita · p. ${page}` })
      showToast(share ? `Guardada. ${name(st.partner)} la verá ${st.session.kind === 'juntos' ? 'ahora mismo' : 'en su muro'}.` : 'Guardada solo para ti.')
      return render()
    }
    showToast(share ? `Guardada. ${name(st.partner)} la verá en su muro.` : 'Guardada solo para ti.')
    st.quoteFilter = 'todas'
    return go('citas')
  }

  function onInput(event) {
    const el = event.target.closest('[data-input]')
    if (!el) return
    const st = state
    const v = el.value
    switch (el.dataset.input) {
      case 'page':
        if (st.session && v !== '') st.session.page = clamp(Number(v), st.session.startPage, BOOKS[st.session.book].p)
        break
      case 'finish':
        st.sheetData.finish = Number(v)
        break
      case 'apage':
        st.sheetData.page = Number(v)
        break
      case 'qtext':
        st.sheetData.text = v
        if (st.sheetData.error && v.trim()) {
          st.sheetData.error = ''
          appEl.querySelector('.sheet [role="alert"]')?.remove()
        }
        break
      case 'qnote':
        st.sheetData.note = v
        break
      case 'qpage': {
        st.sheetData.page = v
        const info = appEl.querySelector('[data-qinfo]')
        if (info) info.innerHTML = citaInfo(st)
        break
      }
      case 'reply':
        st.sheetData.reply = v
        break
      case 'memo':
        if (st.jointDone) st.jointDone.note = v
        break
      default:
    }
  }

  appEl.addEventListener('click', onClick)
  appEl.addEventListener('input', onInput)
  appEl.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.sheet) closeSheet()
  })
  setInterval(() => {
    const s = state.session
    if (!s || s.pausedAt != null) return
    const value = clock(elapsed(state))
    appEl.querySelectorAll('[data-tick="clock"]').forEach((el) => (el.textContent = value))
    const page = String(partnerLivePage(state))
    appEl.querySelectorAll('[data-tick="ppage"]').forEach((el) => (el.textContent = page))
  }, 1000)

  // ───────────── Guide: steps, notes and overview ─────────────
  const STEPS = [
    {
      id: 'aviso',
      group: 'Leer juntos',
      title: '{p} se pone a leer',
      notes: [
        'Cuando {p} empieza su cronómetro te llega un aviso suave: como mucho uno por noche, y se puede apagar.',
        'Tocarlo te lleva a leer a la vez. Si no te apetece, no pasa nada: no hay «visto» ni nada pendiente.',
      ],
      apply: (st) => {
        st.banner = true
      },
    },
    {
      id: 'inicio',
      group: 'Leer juntos',
      title: 'Inicio: los dos de un vistazo',
      notes: [
        'Arriba, lo que pasa ahora mismo: si {p} está leyendo, se ve con la luz de su lámpara y te unes en un toque.',
        'Tu libro con lo que más haces: Leer, + Página y Cita. Debajo, el libro que leéis a dúo.',
        'La racha de los dos con la semana en sellos, y lo último que te ha dejado {p}.',
      ],
      apply: () => {},
    },
    {
      id: 'unirse',
      group: 'Leer juntos',
      title: 'El botón Leer sabe si {p} lee',
      notes: [
        'Si {p} está leyendo, el botón central brilla y te ofrece leer a la vez o por tu cuenta. Si no, abre la lectura directamente.',
        'Cada uno lee su libro. Si es el mismo, lo que aún sería spoiler espera a que llegues.',
      ],
      apply: (st) => openSheetOn(st, 'unirse'),
    },
    {
      id: 'juntos',
      group: 'Leer juntos',
      title: 'Leyendo a la vez',
      notes: [
        'Un cronómetro compartido y la página del otro en directo, con un hilo que os une en pantalla.',
        'Latido: un toque que cruza la pantalla y hace vibrar su móvil. Sin tener que escribir nada.',
        'Las citas que guardáis aparecen al momento. Cada uno pausa o termina su parte cuando quiere.',
      ],
      apply: (st) => {
        startSession(st, 'juntos', { offset: 27 * 60 + 41 })
        st.session.page = st.session.startPage + 9
        st.session.feed.push({ t: '23:14', text: `${name(st.partner)} te ha mandado un latido` })
      },
    },
    {
      id: 'ticket',
      group: 'Leer juntos',
      title: 'Vuestro ticket',
      notes: [
        'La sesión se guarda como un ticket: hora, minutos y páginas de cada uno.',
        'Suma un día a la racha de los dos y una noche al reto del mes. Podéis escribir una línea para recordarla.',
      ],
      apply: demoTicket,
    },
    {
      id: 'leer',
      group: 'Leer y apuntar',
      title: 'Leer por tu cuenta',
      notes: [
        'Pantalla en penumbra para no deslumbrar. La página se cambia con − y + o tecleándola.',
        'Si {p} se pone a leer mientras tanto, aparece «Leer juntos» y la sesión pasa a ser de los dos sin perder el tiempo.',
      ],
      apply: (st) => {
        startSession(st, 'solo', { offset: 18 * 60 + 12 })
        st.session.page = st.session.startPage + 6
      },
    },
    {
      id: 'apuntar',
      group: 'Leer y apuntar',
      title: 'Apuntar sin cronómetro',
      notes: [
        'Para lo que leíste sin la app: página, rato aproximado y día. Tres toques y guardado.',
        'Cuenta igual para la racha y para vuestro resumen.',
      ],
      apply: (st) => openSheetOn(st, 'apuntar'),
    },
    {
      id: 'cita',
      group: 'Citas',
      title: 'Guardar una cita',
      notes: [
        'La página ya viene puesta. En el iPhone puedes copiar la frase de la página con la cámara (Texto en vivo).',
        'Por defecto la ve {p}. Si va por detrás en ese libro, la verá al llegar a esa página.',
        'Cita del libro, en letra de libro, o nota tuya, a mano. Con un comentario si quieres.',
      ],
      apply: (st) => {
        st.screen = 'citas'
        openSheetOn(st, 'cita', { book: 'tokio', note: 'Me ha recordado a nosotros' })
      },
    },
    {
      id: 'citas',
      group: 'Citas',
      title: 'Vuestras citas',
      notes: [
        'Todas las frases y notas de los dos en un muro, con corazón, respuestas y filtros por persona o libro.',
        'Lo que aún sería spoiler sale cerrado, con las páginas que te faltan. Puedes abrirlo igualmente.',
        'Sustituye a las huellas: el mismo cariño en una sola idea, algo que dejas en una página.',
      ],
      apply: (st) => {
        st.screen = 'citas'
      },
    },
    {
      id: 'biblioteca',
      group: 'Biblioteca',
      title: 'La biblioteca de los dos',
      notes: [
        'Vuestros libros juntos o por separado. Cada persona es una cinta de color en la portada.',
        'A dúo, regalos con dedicatoria, Queremos leer juntos y la estantería del año.',
      ],
      apply: (st) => {
        st.screen = 'biblioteca'
      },
    },
    {
      id: 'libro',
      group: 'Biblioteca',
      title: 'Un libro a dúo',
      notes: [
        'Las dos cintas sobre el mismo libro, con cada cita marcada en su página.',
        'Las sesiones de los dos, con las que hicisteis a la vez destacadas.',
      ],
      apply: (st) => {
        st.screen = 'libro'
        st.bookKey = 'tokio'
        st.from = 'biblioteca'
      },
    },
    {
      id: 'ciegas',
      group: 'Biblioteca',
      title: 'Valorar a ciegas',
      notes: [
        'Cuando los dos terminéis un libro, cada uno pone su nota sin ver la del otro.',
        'Se destapan a la vez y desde ahí se abre la charla del libro.',
      ],
      apply: (st) => {
        st.screen = 'biblioteca'
        openSheetOn(st, 'valorar', { r: 4.5 })
      },
    },
    {
      id: 'racha',
      group: 'Lo vuestro',
      title: 'La racha de los dos',
      notes: [
        'Cuenta los días en que habéis leído los dos, con las reglas a la vista.',
        'Dos comodines al mes: si un día solo lee uno, la lámpara no se apaga.',
        'Cada uno ve también su racha, sin comparar quién va mejor.',
      ],
      apply: (st) => {
        st.screen = 'racha'
      },
    },
    {
      id: 'nosotros',
      group: 'Lo vuestro',
      title: 'Nosotros',
      notes: [
        'No son estadísticas: horas a la vez, noches juntos, vuestra estantería del año y la cita más querida.',
        'Un reto del mes que suma a los dos, hitos con sellos y vuestra lista para leer juntos.',
      ],
      apply: (st) => {
        st.screen = 'nosotros'
      },
    },
    {
      id: 'carta',
      group: 'Lo vuestro',
      title: 'Carta del mes',
      notes: [
        'Cada mes, una carta con lo que habéis vivido leyendo: días, noches juntos, libros y vuestra cita favorita.',
        'Se queda guardada en Nosotros y se puede compartir como imagen.',
      ],
      apply: (st) => {
        st.screen = 'nosotros'
        openSheetOn(st, 'carta')
      },
    },
  ]
  const fill = (text) => text.replaceAll('{p}', name(state.partner))
  let currentStep = 'aviso'

  function stepFor(st) {
    if (st.banner) return 'aviso'
    switch (st.sheet) {
      case 'unirse':
        return 'unirse'
      case 'apuntar':
        return 'apuntar'
      case 'cita':
        return 'cita'
      case 'valorar':
        return 'ciegas'
      case 'carta':
        return 'carta'
      default:
    }
    const map = { inicio: 'inicio', juntos: 'juntos', ticket: 'ticket', leer: 'leer', citas: 'citas', biblioteca: 'biblioteca', libro: 'libro', racha: 'racha', nosotros: 'nosotros' }
    if (st.screen === 'libro' && st.bookKey !== 'tokio') return currentStep
    return map[st.screen] ?? currentStep
  }

  const shell = document.getElementById('shell')
  const stepsEl = document.getElementById('steps')
  const notesEls = [document.getElementById('notes'), document.getElementById('notes-in-guide')]
  const mapEl = document.getElementById('map')

  function renderSteps() {
    let group = ''
    stepsEl.innerHTML = STEPS.map((s, i) => {
      const head = s.group !== group ? `<li class="steps__group" aria-hidden="true">${s.group}</li>` : ''
      group = s.group
      return `${head}<li><button class="step" data-step="${s.id}" ${s.id === currentStep ? 'aria-current="step"' : ''}><span class="step__n">${i + 1}</span>${esc(fill(s.title))}</button></li>`
    }).join('')
  }
  function renderNotes() {
    const i = STEPS.findIndex((s) => s.id === currentStep)
    const s = STEPS[i]
    const demo = state.session
      ? `<div class="note__demo"><p>Para probar sin esperar: el cronómetro y la página de ${name(state.partner)} avanzan como si pasara el tiempo.</p><button class="note__btn" data-demo="skip">Adelantar 15 minutos</button></div>`
      : ''
    const html = `<p class="note__kicker">Paso ${i + 1} de ${STEPS.length} · ${esc(s.group)}</p>
      <h2 class="note__title">${esc(fill(s.title))}</h2>
      <ul class="note__list">${s.notes.map((n) => `<li>${esc(fill(n))}</li>`).join('')}</ul>${demo}
      <div class="note__nav"><button data-nav="-1" ${i === 0 ? 'disabled' : ''}>Anterior</button><button data-nav="1" ${i === STEPS.length - 1 ? 'disabled' : ''}>Siguiente</button></div>`
    for (const el of notesEls) if (el) el.innerHTML = html
  }
  function syncShell() {
    const next = stepFor(state)
    const changed = next !== currentStep
    currentStep = next
    if (changed) renderSteps()
    renderNotes()
  }
  function goStep(id, opts = {}) {
    const step = STEPS.find((s) => s.id === id)
    if (!step) return
    clearTimeout(beatTimer)
    const userQuotes = state.quotes.filter((q) => q.id.startsWith('u'))
    state = freshState(state.me, state.mode, [...BASE_QUOTES, ...userQuotes])
    step.apply(state)
    if (state.session?.kind === 'juntos') scheduleIncomingBeat()
    currentStep = id
    prev = { screen: '', sheet: '', toast: 0, banner: false, reveal: false }
    render()
    renderSteps()
    if (opts.hash !== false && location.hash !== `#${id}`) {
      try {
        history.replaceState(null, '', `#${id}`)
      } catch {
        /* The viewer may not allow it. */
      }
    }
  }

  function snapshot(step) {
    const st = freshState(state.me, state.mode)
    step.apply(st)
    if (st.session) st.session.frozen = true
    return st
  }
  function renderMap() {
    const groups = [...new Set(STEPS.map((s) => s.group))]
    mapEl.innerHTML = groups
      .map(
        (g) => `<section class="map__group"><h2>${esc(g)}</h2><div class="map__row">${STEPS.filter((s) => s.group === g)
          .map((s) => {
            const i = STEPS.indexOf(s)
            const st = snapshot(s)
            const fresh = { screen: false, sheet: false, toast: false, banner: false, reveal: false }
            return `<div class="mini" data-step="${s.id}"><div class="mini__frame"><div class="mini__scale"><div class="app is-static" data-mode="${st.mode}" inert>${renderApp(st, { uid: `m${i}`, static: true, fresh })}</div></div></div>
              <button class="mini__cap" data-step="${s.id}"><span>${i + 1}</span>${esc(fill(s.title))}</button></div>`
          })
          .join('')}</div></section>`,
      )
      .join('')
  }

  function setView(view) {
    const map = view === 'mapa'
    shell.classList.toggle('is-map', map)
    mapEl.hidden = !map
    if (map) renderMap()
  }
  function fit() {
    const wrap = document.getElementById('device-wrap')
    if (window.innerWidth <= 760) return wrap.style.removeProperty('--s')
    const s = clamp((window.innerHeight - 48) / 868, 0.62, 1)
    wrap.style.setProperty('--s', s.toFixed(3))
  }

  shell.addEventListener('click', (event) => {
    const stepBtn = event.target.closest('[data-step]')
    if (stepBtn && !appEl.contains(stepBtn)) {
      if (shell.classList.contains('is-map')) {
        document.querySelector('input[name="vista"][value="proto"]').checked = true
        setView('proto')
      }
      shell.classList.remove('is-open')
      return goStep(stepBtn.dataset.step)
    }
    const nav = event.target.closest('[data-nav]')
    if (nav) {
      const i = STEPS.findIndex((s) => s.id === currentStep) + Number(nav.dataset.nav)
      if (STEPS[i]) goStep(STEPS[i].id)
      return undefined
    }
    if (event.target.closest('[data-demo="skip"]') && state.session) {
      state.session.offset += 15 * 60
      return render()
    }
    if (event.target.closest('[data-menu]')) {
      const open = shell.classList.toggle('is-open')
      event.target.closest('[data-menu]').setAttribute('aria-expanded', String(open))
    }
    return undefined
  })
  shell.addEventListener('change', (event) => {
    const input = event.target
    if (input.name === 'como') {
      const userQuotes = state.quotes.filter((q) => q.id.startsWith('u'))
      state = freshState(input.value, state.mode, [...BASE_QUOTES, ...userQuotes])
      const step = STEPS.find((s) => s.id === currentStep)
      step?.apply(state)
      prev = { screen: '', sheet: '', toast: 0, banner: false, reveal: false }
      render()
      renderSteps()
      if (!mapEl.hidden) renderMap()
    }
    if (input.name === 'ambiente') {
      state.mode = input.value
      render()
      if (!mapEl.hidden) renderMap()
    }
    if (input.name === 'vista') setView(input.value === 'mapa' ? 'mapa' : 'proto')
  })
  window.addEventListener('resize', fit)
  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1)
    if (id && id !== currentStep && STEPS.some((s) => s.id === id)) goStep(id, { hash: false })
  })

  // Boot
  document.querySelector(`input[name="ambiente"][value="${state.mode}"]`).checked = true
  fit()
  const fromHash = location.hash.slice(1)
  goStep(STEPS.some((s) => s.id === fromHash) ? fromHash : 'aviso', { hash: false })
})()
