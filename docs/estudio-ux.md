# Estudio de diseño y usabilidad · noviembre 2026

Objetivo: que Greenbook sea más sencilla de usar (menos toques), que se vea igual de cuidada en todas las pantallas y que la relación con tu pareja lectora sea el centro: saber cómo va cada uno, leer a la vez y comentar sin spoilers.

## 1. Qué hacen otras apps (investigación)

- **Comentarios bloqueados por progreso** (StoryGraph, *buddy reads*): lo que escribe tu compañero o compañera queda oculto hasta que llegas a ese punto del libro, y cada comentario muestra su posición con una barra y el número de página. Los usuarios piden poder abrirlo igualmente y reaccionar con algo más ligero que una respuesta. [Roadmap StoryGraph](https://roadmap.thestorygraph.com/requests-ideas/posts/option-to-unlock-buddy-reads-comment-regardless-of-your-progress) · [Reacciones (shipped)](https://roadmap.thestorygraph.com/features)
- **Leer al propio ritmo con hitos** (Fable): salas por capítulo para no destriparse nada y un espacio final de reflexión al terminar. [Fable en la App Store](https://apps.apple.com/app/1488170618) · [Fable: buddy reading](https://fable.co/blog/the-benefits-of-buddy-reading)
- **Sesión de lectura** (Bookly): empezar con un botón bajo el libro, parar e indicar la página; la app calcula páginas por hora y estima cuánto falta. [Reseña en Book Riot](https://bookriot.com/bookly-review/)
- **Rachas sin culpa**: las rachas rígidas generan ansiedad y abandono; mejor marcas personales, recuperación y contar lo compartido en positivo («12 días juntos») que lo perdido. [Smashing Magazine](https://smashingmagazine.com/2026/02/designing-streak-system-ux-psychology/) · [Mobbin: 859 diseños de rachas](https://mobbin.com/blog/streaks-are-about-losing-a-study-of-859-streak-designs)
- **Apps de pareja**: presencia discreta (un punto, sin obligar a responder), un gesto sencillo cuando la otra persona aparece, y metas en las que suman los dos. [Habi: mejores apps de pareja](https://habi.app/insights/best-couple-apps/)
- **Registrar rápido**: la queja más repetida en StoryGraph es que actualizar el progreso cueste varios toques. [Roadmap StoryGraph](https://roadmap.thestorygraph.com/requests-ideas/posts/i-asked-a-gr-user-friend-what-s-stopping-them-from-switching-ove)

## 2. Diagnóstico de la app (auditoría pantalla a pantalla)

| Pantalla | Problema |
| --- | --- |
| Barra inferior | El «+» abría un menú con emojis y después otra hoja: dos pasos para lo más frecuente. |
| Hoy | Cabecera alta (marca + fecha + saludo); el cronómetro vivía dentro de un botón pequeño. |
| Registrar | Una hoja larga con selector, deslizador, chips, tiempo y fecha. |
| Nosotros | Larga y con muchos enlaces de texto; no respondía a «¿cómo vamos los dos?»; el propósito del mes, escondido. |
| Sala | Sin sensación de dónde estás en el libro respecto a las huellas. |
| Libro de la pareja | No decía de quién era la lectura ni enlazaba con la tuya. |
| Estadísticas | Solo datos propios. |
| Portadas sin imagen | Rectángulos claros iguales; en miniatura el título se partía («Pr oy ect»). |

## 3. Cambios aplicados

**Flujo (menos toques)**
- Botón central **Leer**: abre la pantalla de lectura en un toque; con el cronómetro en marcha muestra el tiempo. «Dejarle algo» y «Un ratito juntos» pasan a botones en Nosotros (mismo número de toques que antes).
- **Leer** en Hoy y en el libro arranca el cronómetro y abre la pantalla; **Apuntar páginas** la abre en modo páginas; aceptar un ratito «ahora» lleva directo a leer.
- Pantalla **Leer**: cronómetro con pausa, contador grande (mantener pulsado acelera), recuerda la página si sales, cambiar de libro conserva el tiempo, audiolibros avanzan solos.

**Pareja y seguimiento**
- **Cómo vamos** (Nosotros): los dos, lado a lado, con libro, progreso y lo de hoy; la semana en barras emparejadas y los días que habéis leído los dos.
- **Leyendo juntos**: cada sala con las dos barras y la página de cada uno.
- **Propósito del mes** como sección propia, con barra común (suman los dos).
- **Leer a la vez** en Hoy cuando tu pareja está leyendo: responde a su presencia sin mensajes.
- **Mapa de huellas** en la sala: cada huella marcada en su página sobre el progreso de los dos (abiertas rellenas, por abrir huecas).
- En la pantalla Leer: «Alcanzas a [pareja]», «te dejó algo en la p. 230 · te faltan 16» y «Al guardar se abrirá…»; al guardar, enlace directo a la huella desbloqueada.
- **Libro de la pareja**: «La lectura de [pareja]», enlace a tu lectura y «Dejarle algo aquí», o «Queremos leerlo juntos» si no lo tienes.
- **Estadísticas · Los dos**: páginas, días y libros de cada uno en el periodo y los días compartidos.
- **Biblioteca**: marca con la inicial de la pareja en los libros que también tiene.

**Visual**
- Lenguaje de movimiento con tokens (`--dur-tap`, `--dur-move`, `--dur-fill`), entradas escalonadas, números que ruedan, barras que se llenan y un único momento de celebración (el sello al guardar). Detalle en `docs/estilo.md`.
- Portadas de tela cuando no hay imagen, Hoy compacta y barra inferior con indicador deslizante.

## 4. Ideas para después (necesitan migración o más datos)

- Reaccionar con un corazón a una **sesión** de tu pareja (hoy las reacciones solo existen en mensajes).
- **Sala de reflexión** cuando los dos termináis el libro (como Fable), con valoración compartida.
- Hitos por capítulo cuando el libro los tenga (hoy solo hay páginas).
- Racha con **comodín** semanal para no castigar un mal día.
