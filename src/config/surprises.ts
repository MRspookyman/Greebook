import type { Format } from '@/lib/types'

export type SurpriseTrigger =
  | { type: 'booksFinished'; count: number }
  | { type: 'streak'; days: number }
  | { type: 'goalReached' }
  | { type: 'firstFinishedFormat'; format: Format }
  | { type: 'date'; monthDay: `${string}-${string}` }

export interface Surprise {
  key: string
  trigger: SurpriseTrigger
  title: string
  message: string
}

// Textos de Javier para Laura. Las fechas son 'MM-DD' y salen cada año ese día.

export const WELCOME = {
  title: 'Feliz cumpleaños, gordita',
  message:
    'Empezamos con «De ratones y hombres» y no pienso parar. Este Kindle es para que te lleves todas tus historias a la cama, al sofá y a la playa de Almería, y esta app es nuestro rincón: aquí apuntas lo que lees, guardas las frases que te enamoran y yo voy viendo por dónde vas (y tú por dónde voy yo, que te conozco). Que nunca te falten libros, ni mantita, ni risketos del Mercadona.',
  signature: 'Te quiero, tu gordito Javier',
}

export const SURPRISES: Surprise[] = [
  {
    key: 'books-1',
    trigger: { type: 'booksFinished', count: 1 },
    title: '¡Primer libro terminado!',
    message:
      'El primero de muchos en nuestro rincón. Esto se celebra como se celebran las cosas importantes: con una bolsa de risketos para los dos.',
  },
  {
    key: 'primer-kindle',
    trigger: { type: 'firstFinishedFormat', format: 'ebook' },
    title: 'Tu primer libro en el Kindle',
    message:
      'Ya lo has estrenado como se merece. Ahora cabe una biblioteca entera en tu bolso, así que en Almería no hay excusa: toalla, sombrilla y Kindle.',
  },
  {
    key: 'books-5',
    trigger: { type: 'booksFinished', count: 5 },
    title: 'Cinco libros, gordita',
    message: 'Cinco historias ya. Voy a tener que ponerme las pilas, que me estás dejando atrás.',
  },
  {
    key: 'books-10',
    trigger: { type: 'booksFinished', count: 10 },
    title: 'Diez libros',
    message:
      'Diez historias desde que empezamos aquí. Me encanta verte desaparecer dentro de un libro… siempre que luego vuelvas a contármelo.',
  },
  {
    key: 'books-25',
    trigger: { type: 'booksFinished', count: 25 },
    title: 'Veinticinco. Lo tuyo ya es una biblioteca',
    message:
      'Veinticinco libros, gordita. Ni en Budapest había tantas cosas que ver como las que tú has leído. Estoy muy orgulloso de ti.',
  },
  {
    key: 'streak-7',
    trigger: { type: 'streak', days: 7 },
    title: 'Una semana seguida leyendo',
    message: 'Siete días sin fallar. Tu ratito de lectura ya es sagrado, y me encanta que lo sea.',
  },
  {
    key: 'streak-30',
    trigger: { type: 'streak', days: 30 },
    title: 'Un mes entero leyendo',
    message:
      'Treinta días seguidos. Esto merece premio: elige plan y yo invito. (Los risketos van aparte, eso ya lo sabes.)',
  },
  {
    key: 'yearly-goal',
    trigger: { type: 'goalReached' },
    title: '¡Objetivo del año cumplido!',
    message:
      'Lo has conseguido, gordita. Todos los libros que te propusiste este año, leídos. Lo que leas a partir de ahora es de regalo.',
  },
  {
    key: 'birthday',
    trigger: { type: 'date', monthDay: '12-16' },
    title: 'Feliz cumpleaños, gordita',
    message:
      'Un año más contigo, y ojalá muchos más leyendo uno al lado del otro. Hoy no se mira la racha: hoy es tu día. Te quiero.',
  },
  {
    key: 'anniversary',
    trigger: { type: 'date', monthDay: '10-20' },
    title: 'Feliz aniversario',
    message:
      'Otro 20 de octubre a tu lado. De todas las historias que hemos leído, la nuestra sigue siendo mi favorita. Te quiero, gordita.',
  },
  {
    key: 'valentines',
    trigger: { type: 'date', monthDay: '02-14' },
    title: 'San Valentín (y algo más)',
    message:
      'Feliz San Valentín, gordita. Y por si se te había olvidado: hoy también es el cumple de tu gordito. Un mensajito bonito, un risketo y quizás alguna cita subrayada me valen.',
  },
  {
    key: 'new-year',
    trigger: { type: 'date', monthDay: '01-01' },
    title: 'Año nuevo, libros nuevos',
    message: '¿Qué vamos a leer este año? Yo ya sé con quién quiero leerlo.',
  },
  {
    key: 'summer',
    trigger: { type: 'date', monthDay: '08-01' },
    title: 'Modo Almería activado',
    message: 'Playa, chill y un libro bueno. Mete el Kindle en la bolsa, que los risketos ya los llevo yo.',
  },
]
