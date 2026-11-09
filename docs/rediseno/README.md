# Rediseño · «Leer juntos» (noviembre 2026)

Propuesta para darle la vuelta a Greenbook: más cálida, más visual y con la pareja en el centro. La base de datos y lo
que ya funciona (cronómetro, cola sin conexión, búsqueda, avisos) se conserva; cambian la navegación, la forma de
interactuar entre los dos y el aspecto.

**Prototipo navegable:** [`mockup/index.html`](mockup/index.html). Ábrelo en el navegador (necesita internet solo para
las tipografías). Tiene 15 pasos guiados, «Ver como» Javier o Laura, ambiente de tarde o de noche y una vista con
todas las pantallas. Los datos son de ejemplo y no toca Supabase.

## 1. Principios

1. **Lo que pasa ahora, primero.** Si el otro está leyendo, se ve nada más abrir y te unes en un toque.
2. **Un toque para lo frecuente.** Leer, apuntar página, guardar una cita y unirse no pasan por menús.
3. **Compartir por defecto, con respeto.** Lo que guardas lo ve el otro; lo que sería spoiler espera a su página.
4. **Celebrar lo de los dos, nunca comparar.** Horas a la vez, noches juntos, una racha común. Sin rankings.
5. **Sin culpa.** Comodines en la racha, avisos suaves y apagables, nada «pendiente de responder».

## 2. Qué cambia

| Ahora | Propuesta |
| --- | --- |
| Hoy | **Inicio**: tarjeta «está leyendo» con luz de lámpara y *Unirme*, tu libro con Leer · + Página · Cita, el libro a dúo, la racha de los dos en sellos y lo último que te ha dejado. |
| Botón central Leer | Sabe si tu pareja está leyendo: te ofrece leer con ella, por tu cuenta o apuntar sin cronómetro. |
| Ratitos (invitaciones) | **Leer juntos en directo**: te unes a su sesión, cronómetro compartido, página del otro en vivo, latidos y un ticket al terminar. |
| Huellas, notas privadas y mensajes de sala | **Citas y notas en una página**: una sola idea. Compartidas por defecto, cerradas si serían spoiler, con corazón y respuestas. |
| Salas por libro | **Ficha a dúo**: las dos cintas sobre el libro, cada cita marcada en su página y las sesiones de los dos. |
| Estadísticas | **Nosotros**: horas a la vez, noches juntos, estantería del año, la cita más querida y carta del mes. Los números personales pasan a Perfil. |
| Racha individual | **Racha de los dos** con 2 comodines al mes, y la de cada uno al lado, sin comparar. |
| Queremos leer juntos | Se mantiene en Nosotros. |
| — | **Valorar a ciegas** cuando terminéis el mismo libro. |

Navegación: **Inicio · Biblioteca · (Leer) · Citas · Nosotros**. El perfil se abre desde los avatares de Inicio. Las
pantallas de sesión (leer, leer juntos, ticket) son modo foco, sin barra y siempre en penumbra para no deslumbrar.

## 3. Flujos

### 3.1 Leer juntos (el corazón de la app)

1. Ella pulsa Leer. Su presencia pasa a «leyendo ahora» y a ti te llega un aviso suave: *Laura se ha puesto a leer
   «La sombra del viento». ¿Te unes?* Como mucho uno por noche, y se puede apagar.
2. Tocas el aviso, la tarjeta de Inicio o el botón central y eliges **Leer con ella**.
3. Sesión juntos: un cronómetro desde que te unes; cada uno con su libro y su página; la página del otro avanza en
   directo. **Latido**: un toque que cruza la pantalla y hace vibrar su móvil. Las citas que guardáis aparecen al
   momento en la sesión. Cada uno puede pausar su parte.
4. Cada uno pulsa **Terminar mi parte** y confirma su página. Cuando terminan los dos se crea el **ticket**: minutos a la
   vez, páginas de cada uno, racha y reto del mes. Si uno sigue leyendo, el ticket se completa cuando termine.
5. Opcional: una línea para recordarla («Con té y tus pies fríos») y **darle las buenas noches**.

Casos límite: si alguien cierra la app, su cronómetro sigue guardado como ahora (localStorage) y la sesión conjunta
espera; a las 2 h sin actividad se pregunta si seguís leyendo; sin conexión, la sesión se guarda en la cola y se une al
ticket al sincronizar.

### 3.2 Leer por tu cuenta y apuntar

- **Leer**: cronómetro con pausa, página con − y + (mantener acelera) o tecleándola. Si ella empieza a leer mientras
  tanto aparece **Leer juntos** y la sesión pasa a ser de los dos sin perder el tiempo.
- **Apuntar sin cronómetro**: libro, página, rato aproximado (10 · 20 · 30 · 45 · 60 min) y hoy o ayer. Tres toques.

### 3.3 Citas

- Se crean desde Inicio, la ficha, la sesión o la pestaña Citas. **Cita del libro** (en letra de libro) o **nota mía**
  (a mano), libro, página ya rellenada y un comentario opcional.
- En el iPhone, *Texto en vivo* permite copiar la frase de la página con la cámara desde el propio campo de texto, sin
  programar nada. Hay que comprobar en su iPhone que el botón aparece también en campos de una web instalada.
- **Que la vea ella** viene activado. Si ella tiene ese libro en curso y va por detrás de esa página, le aparece
  cerrada con «se abre en la p. 205 · te faltan 18 páginas»; puede **abrirla igualmente** y tú lo ves.
- Corazón, respuestas y filtros (todas, de ella, mías, por libro). El aviso a la pareja se agrupa para no saturar.

### 3.4 Biblioteca

Una tarjeta por libro (en Leídos, una por libro y año), con el estado de cada uno. Arriba: buscador que filtra todas las
pestañas, un avatar por persona para mostrar u ocultar sus libros, y pestañas Leyendo · Pendientes · Leídos · Dejados con
contador de libros. Leyendo es una lista con una barra de progreso por persona; el resto, rejillas de portadas con puntos de
color de quién lo tiene (Leídos con filtros de año y Papel/Kindle). Un libro a dúo se ve con las dos cintas en la portada,
sin sección aparte. Al tocarlo se abre tu ficha, o la suya si tú no lo tienes.

### 3.5 Racha de los dos

- Un día cuenta si cada uno lee al menos 5 minutos o una página, según su fecha local (`read_on`).
- **Racha de los dos**: días seguidos leyendo los dos. **2 comodines al mes** que se gastan solos el día que solo lee
  uno. Si no lee ninguno, vuelve a empezar; la mejor queda guardada.
- Cada uno ve también su racha, sin comparar. A las 22:30, si falta uno, le llega un aviso suave (apagable).
- Las reglas están a la vista en la pantalla de racha, antes de perderla.

### 3.6 Nosotros

Ex libris con vuestras iniciales (L & J), horas leyendo a la vez en el año, racha, el mes en curso (noches juntos, páginas entre
los dos, citas), estantería del año, la cita más querida, la carta del mes y la lista para leer juntos. Sin hitos ni retos:
se retiraron porque repetían datos de la misma pantalla. Nada de gráficas de rendimiento.

### 3.7 Valorar a ciegas

Cuando los dos terminéis el mismo libro, cada uno pone su nota sin ver la del otro. Se destapan a la vez («Casi de
acuerdo: medio punto de diferencia») y desde ahí se abre la charla del libro (sus citas y respuestas).

## 4. Ideas, por prioridad

**Imprescindibles (fases 1 a 4):** leer juntos en directo con latidos y ticket · citas compartidas con protección de
spoilers · racha de los dos con comodines · Nosotros · nueva Inicio y Biblioteca.

**Muy recomendables:** valorar a ciegas · carta del mes ·
modo noche automático a partir de las 22:00 · «darle las buenas noches».

**Para más adelante:** cita como imagen para compartir · «Hace un año estabais leyendo…» · «Te leo yo» (uno lee en voz
alta y suman los dos) · lugares donde leéis (opcional) · widget de pantalla de bloqueo (requiere app nativa, una PWA no
puede).

Lo que se ha mirado esta vez (además de [`../estudio-ux.md`](../estudio-ux.md)):

- Presencia en tiempo real para leer «en paralelo», como una hoguera virtual: [BookBuds](https://apps.apple.com/us/app/bookbuds-read-with-friends/id6755941845).
- Rachas de pareja con comodín, calendario de los dos y reglas visibles antes de perderla: [ejemplos de rachas](https://screensdesign.com/articles/mobile-app-streak-design-examples/) · [Twin Flame Widget](https://apps.apple.com/bb/app/twin-flame-widget/id6748699818).
- Citas diseñadas para compartir: [Basmo](https://appgoblin.info/apps/com.underline.booktracker).
- Texto en vivo desde un campo de texto de Safari: [Gadget Hacks](https://ios.gadgethacks.com/how-to/enter-text-from-real-world-into-any-search-field-ios-15-0384737/).

## 5. Dirección visual: «tarde de manta, noche de lámpara»

Sustituye a la de [`../estilo.md`](../estilo.md) cuando se implemente. Lo que se mantiene: 44 px de zona táctil, texto
de 12 px como mínimo, contraste medido, movimiento reducido respetado y nada de emojis como controles.

| Token | Tarde | Noche | Uso |
| --- | --- | --- | --- |
| `paper` | `#F8EEE9` | `#1E1520` | Fondo, papel rosado / ciruela |
| `card` | `#FFFAF7` | `#2A1F2B` | Tarjetas y hojas |
| `ink` | `#33202C` | `#F6E8E4` | Texto (13,3:1 / 14,9:1) |
| `soft` | `#735D69` | `#C3AEB8` | Texto secundario (5,3:1 / 8,5:1) |
| `plum` → acción | `#5B2B4C` | `#F2B865` | Botón principal; de noche es la luz de la lámpara |
| `honey` | `#E7A33E` | `#F2B865` | Lámpara, presencia, racha (texto: `#8A5A12`, 5,2:1) |
| `rose` | `#B8354F` | `#F08DA3` | Corazones, sellos, lo compartido (5,0:1 / 7,6:1) |
| `her` / `him` | `#3C5CB8` / `#2A7049` | `#A3B5F2` / `#8DCBA6` | Cada persona (≥ 4,8:1 en todas las superficies) |

- **Tipografía:** Young Serif para títulos y números (cálida, de portada antigua), Nunito para la interfaz (terminaciones
  redondas), Literata en cursiva para las citas (hecha para leer en pantalla) y Caveat solo para lo que escribe la
  pareja (notas, comentarios).
- **Motivos:** cinta de color por persona (portadas, citas, progreso); lámpara para la presencia y la racha; sellos para
  los días leídos juntos y los hitos; ticket con troquel para la sesión juntos; ex libris en Nosotros; estantería para
  el año. Las portadas reales de Google Books se mantienen; las de tela son para los libros sin imagen (y para el
  prototipo, que no puede cargar imágenes externas).
- **Forma:** tarjetas suaves de 22 px, botones píldora, sombras cálidas con un toque ciruela, grano de papel muy sutil.
- **Movimiento:** entradas suaves, la hoja que sube, el latido que cruza, el sello que cae al guardar el ticket.
  «Respirar» solo para lo que pasa en directo.

## 6. Cambios de datos (borrador para la migración 0008 y siguientes)

- **Presencia:** canal de Supabase Realtime Presence por pareja con `{ reading_id, page, since }`, en lugar de leer
  `profiles.reading_now_*`. Esas columnas se quedan para el aviso de «se ha puesto a leer» (uno por noche).
- **Sesión juntos:** tabla `read_together (id, started_at, ended_at, created_by, joined_by, ambience, note)` y
  `sessions.together_id`. Un RPC `join_reading()` crea o reutiliza la sesión abierta de la pareja.
- **Latidos:** mensajes *broadcast* del canal (efímeros) más un push con vibración; se cuentan en el ticket.
- **Citas:** tabla `quotes (id, user_id, book_id, reading_id, page, kind 'cita'|'nota', body, comment, visibility
  'shared'|'private', safe, created_at)` con vista `quotes_visible` que reutiliza la lógica de `message_locked`,
  `quote_replies` y reacciones con `target_type = 'quote'`. Migración: `notes` → citas privadas; `messages` de tipo
  `trace`/`room` → citas compartidas con su página; `reply` → `quote_replies`.
- **Racha:** cálculo en cliente sobre `sessions` (ya existe `src/lib/stats/streak.ts`) con la regla de los dos y los
  comodines aplicados de forma determinista (máximo 2 por mes, en orden). Sin tabla nueva salvo que haga falta en el
  servidor para el aviso de las 22:30.
- **Valorar a ciegas:** `readings.rating` más una vista que oculta la nota de la pareja hasta que existan las dos.
- **Regalos:** `gifts (book_id, from_user, to_user, dedication, opened_at)`, que evoluciona `together_items`.
- **Carta del mes e hitos:** se calculan en cliente con los datos existentes; sin tablas.
- **Avisos (`notify-partner`):** empieza a leer (uno por noche), cita compartida (agrupada), latido, ticket, regalo y
  valoración destapada. Se retiran los de huellas, ratitos y propuestas.

## 7. Fases

0. **Validar el prototipo** y decidir las preguntas de abajo.
1. **Base visual y navegación**: tokens, tipografías, componentes, Inicio y Biblioteca nuevas, sin tocar datos.
2. **Citas compartidas**: migración, muro, ficha a dúo y protección de spoilers.
3. **Leer juntos en directo**: presencia, sesión juntos, latidos, ticket y avisos.
4. **Racha de los dos y Nosotros**: comodines, hitos, carta del mes y valoración a ciegas.
5. **Extras**: cita como imagen, «Hace un año…».

Cada fase deja la app usable; se puede regalar al terminar la 3.

## 8. Estado

Las cuatro fases están aplicadas en la app (migraciones 0008 y 0009). La valoración a ciegas oculta la nota
de la pareja en la app hasta que existen las dos; en la base de datos las notas siguen siendo legibles por los dos.
Los ratitos y el reto propuesto pasan a ser «Unirme a su lectura» y el reto fijo de 10 noches a la vez.

## 9. Decisiones tomadas

- Ambiente aprobado: papel rosado de día, ciruela y lámpara de noche.
- Las citas y notas se comparten por defecto (se puede marcar una como privada al guardarla).
- Racha de los dos con 2 comodines al mes y 5 minutos o una página como mínimo.
- Aviso cuando el otro empieza a leer, como mucho uno por noche.
- Nombres: Laura (azul) y Javier (verde).
- Sin sonido de fondo en la sesión juntos.
