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

// ✏️ cambia este texto
export const WELCOME = {
  title: 'Una historia para nosotros',
  message:
    'Este pequeño rincón es para ti: para las historias que te emocionan, las páginas que quieres recordar y todos los ratitos de lectura que nos quedan por compartir. Feliz cumpleaños, mi amor.',
  signature: 'Con todo mi cariño, tu compañero de historias',
}

export const SURPRISES: Surprise[] = [
  // ✏️ cambia este texto
  {
    key: 'books-1',
    trigger: { type: 'booksFinished', count: 1 },
    title: 'La primera de muchas historias',
    message: 'Un libro terminado y un nuevo recuerdo en este rincón nuestro. Me encanta acompañarte, página a página.',
  },
  // ✏️ cambia este texto
  {
    key: 'primer-kindle',
    trigger: { type: 'firstFinishedFormat', format: 'ebook' },
    title: 'Tu primera historia en Kindle',
    message: 'El primer viaje con tu Kindle ya tiene un lugar aquí. Que te acompañe en mil historias más, y yo contigo.',
  },
  // ✏️ cambia este texto
  {
    key: 'books-5',
    trigger: { type: 'booksFinished', count: 5 },
    title: 'Cinco mundos contigo',
    message: 'Ya has viajado por cinco historias. Mi lugar favorito sigue siendo a tu lado.',
  },
  // ✏️ cambia este texto
  {
    key: 'books-10',
    trigger: { type: 'booksFinished', count: 10 },
    title: 'Diez historias que son tuyas',
    message: 'Qué bonito ver crecer tu biblioteca de recuerdos. Que nunca nos falten historias que contarnos.',
  },
  // ✏️ cambia este texto
  {
    key: 'books-25',
    trigger: { type: 'booksFinished', count: 25 },
    title: 'Una biblioteca de aventuras',
    message:
      'Veinticinco libros, tantos mundos y tantas emociones. Gracias por compartir un pedacito de ellos conmigo.',
  },
  // ✏️ cambia este texto
  {
    key: 'streak-7',
    trigger: { type: 'streak', days: 7 },
    title: 'Una semana para ti',
    message: 'Siete días encontrando un ratito para leer. Ojalá este pequeño refugio te siga haciendo sonreír.',
  },
  // ✏️ cambia este texto
  {
    key: 'streak-30',
    trigger: { type: 'streak', days: 30 },
    title: 'Treinta días de historias',
    message: 'Un mes de páginas y pequeños momentos tuyos. Me hace feliz verte disfrutar de lo que te gusta.',
  },
  // ✏️ cambia este texto
  {
    key: 'yearly-goal',
    trigger: { type: 'goalReached' },
    title: 'Lo has conseguido',
    message: 'Tu objetivo del año ya es una realidad. Celebremos las historias vividas, sin prisas por la siguiente.',
  },
  // ✏️ cambia este texto
  {
    key: 'valentines',
    trigger: { type: 'date', monthDay: '02-14' },
    title: 'Mi historia favorita',
    message: 'Entre todos los libros del mundo, nuestra historia sigue siendo mi favorita. Feliz San Valentín, amor.',
  },
  // ✏️ cambia este texto
  {
    key: 'new-year',
    trigger: { type: 'date', monthDay: '01-01' },
    title: 'Un nuevo capítulo',
    message: 'Otro año para leer, descubrir y seguir escribiendo nuestra historia. Qué suerte empezarlo contigo.',
  },
  // ✏️ cambia este texto y MM-DD por vuestra fecha de aniversario
  // { key: 'anniversary', trigger: { type: 'date', monthDay: 'MM-DD' }, title: 'Otro capítulo juntos', message: 'Volvería a elegir nuestra historia una y mil veces.' },
  // ✏️ cambia este texto y MM-DD por su cumpleaños
  // { key: 'birthday', trigger: { type: 'date', monthDay: 'MM-DD' }, title: 'Feliz cumpleaños, amor', message: 'Que este nuevo año tuyo esté lleno de historias bonitas. Yo quiero estar a tu lado para vivirlas.' },
]
