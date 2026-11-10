# Greenbook · Visión

> **Greenbook es una repisa con dos velas y una estantería debajo: enciendes tu vela cuando lees,
> ves la suya cuando lee, y lo que os dejáis entre las páginas espera a que el otro llegue.**

Este documento es el plan de la reinvención. Está escrito antes de tocar el código y se ejecuta por rondas.

---

## 1. Diagnóstico

Leí todo: 17.000 líneas de app, 20 migraciones, dos funciones y los 45 commits (cuatro días de trabajo
intensísimo antes de un regalo). No pude arrancar la app antigua contra vuestro Supabase, porque en este
entorno no hay credenciales, así que el diagnóstico sale del código y del historial, no de usarla de verdad.
Lo digo para que lo leáis con ese matiz.

### Lo que el historial dice que os importa

El `git log` es muy claro si se lee como una lista de deseos:

- **La presencia del otro.** Es lo que más veces se ha rehecho: presencia, toques, «leyendo ahora», leer
  juntos en directo, el latido que vibra, el aviso de «se ha puesto a leer».
- **Dejarse cosas en el libro.** Notas → huellas con bloqueo de spoilers → citas en su página → respuestas.
  Cuatro reescrituras de la misma idea: *un papel que el otro encuentra al llegar*.
- **Que quede recuerdo.** El histórico, el diario de los dos, «hace un año», el año en libros, la estantería
  por años.
- **Los dos a la vez.** La racha de los dos importa; la individual casi nunca aparece.

### Lo que emociona

- El bloqueo de spoilers hecho de verdad en el servidor. Es la mejor idea de la app y estaba enterrada en
  una pestaña llamada «Citas».
- «La lámpara»: la pantalla de leer ya quería ser un sitio y no un formulario.
- Leer a la vez y mandarse un latido.

### Lo que es ruido

- **Cuatro pestañas, doce rutas, tres hojas de filtros.** Para dos personas y, siendo generosos, cuarenta
  libros al año.
- **Estadísticas:** gráfico de páginas, patrones por hora, velocidad, comparativa de pareja, «tus números».
  Nadie se enamora de un histograma. Además compara a dos personas que se quieren.
- **Catorce conceptos para lo mismo:** notas, citas, huellas, mensajes, salas, respuestas, reacciones,
  recomendaciones, dedicatorias, opiniones a ciegas, invitaciones, retos, toques, pings.
- **Cosas nacidas y muertas en días:** retos, hitos, duelo, sorpresas, club. El historial tiene tantos
  «fuera X» como «nuevo X». Es la señal de que faltaba un concepto que dijera qué entra y qué no.
- **El recordatorio diario.** Una app que te regaña a las 21:30 es una herramienta, no un objeto íntimo.

### Lo que está sobrediseñado

- 20 migraciones, 22 tablas (9 ya muertas), 30 funciones SQL, webhooks con `pg_net` + Vault + cron, un
  script que genera SQL con secretos dentro.
- Kindle/papel × páginas/porcentaje × precisión de fecha × lectura retroactiva: un producto cartesiano que
  se filtra a cada pantalla.
- Sin conexión solo funcionaban las sesiones. Todo lo demás (una cita, terminar un libro) pedía red.
- Cuatro familias tipográficas, escáner de códigos con WASM, fotos de páginas, exportar a imagen.

### Lo que falta

- **Un gesto.** Nada en la app se *hace*; todo se *rellena*.
- **Un sitio.** No hay un lugar al que entrar; hay un panel.
- **Tiempo largo.** La app sabe todo lo que habéis leído y casi nunca os lo devuelve.

---

## 2. El concepto

Greenbook deja de ser un tracker con pestañas y pasa a ser **una habitación**. Una sola pantalla, de arriba
abajo:

1. **La repisa.** Dos velas, la tuya y la suya. Si está leyendo, su vela está encendida. Ahí se ve todo lo
   que hay que saber del *ahora*.
2. **La mesilla.** Los libros que tenéis abiertos, cada uno con sus marcapáginas.
3. **La estantería.** Los lomos de todo lo leído, por años. Es la memoria y es la única estadística.

Y tres cosas que se *hacen*, no se rellenan:

### La vela (leer)

Leer es **encender tu vela** manteniendo el dedo sobre ella. No hay «iniciar cronómetro». La vela arde
mientras lees; el otro la ve encendida en su repisa y recibe un aviso suave: *«Laura ha encendido su vela»*.
Si las dos están encendidas, las llamas se inclinan la una hacia la otra y podéis mandaros un guiño (la llama
del otro tiembla y su móvil vibra). Al terminar **la apagas** y dices por qué página vas. Eso es una *velada*.

Sustituye a: cronómetro, pausa, presencia, «leyendo ahora», leer juntos en directo, latido y sesiones.

### Entre páginas (encontrarse)

Mientras lees puedes **dejar un papel en una página**: una frase del libro o unas palabras tuyas. Si el otro
lee el mismo libro, el papel queda doblado hasta que llegue a esa página; entonces, al apagar su vela, *cae
del libro*. Tú ves cuándo lo encontró. Una sola cosa (el papel) sustituye a citas, notas, huellas, respuestas,
dedicatorias y corazones.

### Una sola forma de escribir

Dentro de un libro solo se escribe una cosa: **la nota entre páginas**. Puede ser una frase copiada, lo que te ha
hecho sentir una página, algo para el otro o para ti, o lo que ha sido el libro entero. Va en su página (o en el
libro entero) y **la veis siempre los dos**: ya no hay papeles doblados, ni sobre, ni predicción, ni carta. Las
que se escribieron antes se siguen viendo como notas.

Lo demás **recuerda solo**: la estantería crece, y la repisa os devuelve de vez en cuando un momento («hoy
hace un año terminabais *Patria*»; «lleváis 37 noches leyendo los dos»).

---

## 3. Principios de diseño

1. **Un sitio, no un panel.** Una habitación con tres rincones (las velas, la mesilla, la estantería) y un
   menú abajo para ir de uno a otro sin tener que bajar con el dedo. Cada rincón cabe casi entero en la pantalla.
2. **Gestos, no formularios.** Encender, apagar, dejar una nota entre páginas. Cada gesto tiene como
   mucho una pregunta detrás.
3. **Tres cosas memorables.** La vela y la nota entre páginas. Todo lo que no sirva a una de las
   tres, o a la estantería que las guarda, no entra.
4. **Nunca regañar.** Sin rachas que se rompen, sin metas, sin recordatorios. Lo que se cuenta, se cuenta
   hacia arriba: *noches leyendo los dos*. La invitación a leer es la vela del otro.
5. **Nunca comparar.** Nada de quién lee más. Los dos colores conviven; no compiten.
6. **Privado por construcción.** Lo que está doblado está doblado en el servidor, no en la pantalla.
7. **Funciona a oscuras y sin red.** Todo se escribe primero en el móvil y se sincroniza después.
8. **Castellano de casa.** «Velada», «entre páginas», «la mesilla». Ninguna palabra de software.

### Identidad

- **Paleta:** verde botella de biblioteca, papel crema y luz de vela. De noche la habitación es verde
  profundo iluminada por las llamas; de día, papel con tinta verde. Sigue al sistema.
- **Cada persona es un color de cera** (salvia, miel, ciruela, cielo, coral, lavanda): su vela, sus
  marcapáginas y sus papeles.
- **Tipografía:** una sola voz, *Newsreader* (serif de lectura con cursiva de verdad), y *Caveat* solo para
  lo escrito a mano: los papeles y las cartas.
- **Movimiento:** la llama respira; el humo sube al apagar; los papeles se desdoblan; los lomos salen de la
  estantería. Todo se detiene con «reducir movimiento».
- **Iconos:** dibujados para la app (vela, papel, sobre), sin librería.
- **Sonido:** ninguno. Se lee en silencio, y a menudo con el otro dormido al lado.

---

## 4. Qué se queda, qué se va, qué nace

**Se queda (transformado)**

| Antes | Ahora |
| --- | --- |
| Sesión con cronómetro, «leyendo ahora», leer juntos en directo, latido | **La vela**, las dos velas y el guiño |
| Citas y notas con bloqueo de spoilers, respuestas, corazones | **Papeles entre páginas** |
| Opinión a ciegas, valoración | Una nota entre páginas, como cualquier otra |
| Estantería por años, diario, «hace un año», año en libros | **La estantería** de lomos y los recuerdos de la repisa |
| Racha de los dos | **Noches leyendo los dos** (solo suma) |
| Lugar de la sesión | Sigue, opcional, al apagar la vela |
| Kindle | Sigue: un libro puede ir en páginas o en % |
| Búsqueda de libros (Google Books / Open Library) y alta a mano | Sigue |
| Avisos push | Siguen, pero solo los que traen al otro: vela encendida, papel dejado, papel encontrado, libro terminado |
| Cuentas, emparejamiento, RLS, Cloudflare + Supabase | Siguen |

**Se va**

- Estadísticas, patrones, velocidad, comparativa, «tus números»: comparan y no emocionan.
- Meta anual, racha individual, comodines, recordatorio diario: regañan.
- Etiquetas, estados de ánimo, recomendaciones, «¿qué leo ahora?», lectura a suertes, lista «queremos leer
  juntos»: para dos personas, eso es una conversación en el sofá.
- Escáner de ISBN, foto de la página, portadas subidas, compartir como imagen: peso y terceros para poco uso.
- Pausa del cronómetro, fechas con precisión, sesiones retroactivas con calendario: se corrige el rato al
  apagar la vela y basta.
- Tema manual: sigue al sistema.
- TanStack Query, Dexie, zod, date-fns, lucide, zxing, tres familias tipográficas, `pg_cron`, `pg_net`,
  Vault, webhooks, Storage.

**Nace**

- La habitación de una sola pantalla.
- Encender y apagar con el dedo.
- El papel que cae del libro al llegar a su página, y «lo encontró el…» para quien lo dejó.
- Lomos generados para cada libro, con las cintas de quien lo ha leído.
- Todo sin conexión.
- Un «modo ensayo» sin servidor para probar la app en local con dos personas.

---

## 5. Modelo de datos

Seis tablas. Todos los `id` se generan en el móvil; todas llevan `updated_at` (lo pone el servidor) y
`deleted_at` (borrado suave), que es lo único que necesita la sincronización.

```
profiles            quién eres: name, color, partner_id, timezone,
                    candle_lit_at, candle_reading_id   ← tu vela (presencia)
books               la estantería compartida: title, author, cover_url, pages, year, isbn, added_by
readings            tu marcapáginas en un libro: user_id, book_id, total, position, unit ('paginas'|'porcentaje'),
                    status ('pendiente'|'leyendo'|'terminado'|'dejado'), started_on, finished_on, rating
sessions            una velada: reading_id, user_id, day, started_at, minutes, from_pos, to_pos, place
slips               un papel: user_id, book_id, kind ('cita'|'nota'|'prediccion'|'carta'),
                    page, at (fracción 0–1 del libro), body, seen_at, loved
push_subscriptions  los móviles que reciben avisos
```

- **Leer el mismo libro** no es una entidad: es que los dos tenéis `reading` del mismo `book`.
- **`at`** es la fracción del libro donde está el papel (`página / total` de quien lo escribe). Así un papel
  dejado en la página 137 de una edición se abre en el 36 % del Kindle del otro.
- **«Noche»:** el día de una velada cambia a las 4 de la madrugada, no a las 12. Leer a las 00:30 cuenta
  para la noche anterior.

### Quién ve qué (RLS)

- `profiles`, `books`, `readings`, `sessions`: los ve la pareja; cada uno escribe solo lo suyo (los libros,
  cualquiera de los dos).
- `slips`: la tabla solo deja leer **los propios**. Los del otro llegan por `slips_for_me()`, que devuelve el
  papel **sin texto** mientras esté doblado. Las reglas:
  - *cita / nota:* doblada mientras tengas el libro abierto o pendiente y no hayas llegado a su punto.
  - *carta:* doblada mientras no hayas terminado el libro **y** escrito la tuya.
  - *predicción:* doblada hasta que los dos hayáis cerrado el libro.
- `seen_at` y `loved` solo los puede tocar quien recibe el papel, con `open_slip()`.
- Realtime: un único canal privado `pareja:<a>:<b>`; la política sobre `realtime.messages` solo admite a los
  dos.

La misma regla de doblado existe en TypeScript (`src/lib/lock.ts`, con tests) y en SQL
(`slip_locked()`), y `supabase/tests/rls.sql` comprueba contra un Postgres real que una tercera cuenta no ve
nada y que un papel doblado no suelta su texto.

---

## 6. Arquitectura

```
React 19 · Vite · Tailwind 4 · PWA (Workbox)           Cloudflare Workers (estáticos)
        │
   store local  ◄── la interfaz lee y escribe aquí, siempre, al instante
   (memoria + IndexedDB)
        │  cola de cambios
        ▼
   Remote ──► Supabase: Auth · Postgres + RLS · Realtime (broadcast) · 1 Edge Function (avisos)
        └──► Ensayo: un «servidor» de mentira en el navegador, para desarrollo y pruebas
```

- **Local primero.** La app carga de IndexedDB y pinta sin esperar a la red. Cada cambio se aplica en local y
  marca la fila como «por subir»; la cola se vacía cuando hay conexión. Como los `id` nacen en el móvil y
  todo son *upserts*, reintentar es inofensivo.
- **Bajar.** Se piden las filas con `updated_at` posterior al último cursor; los papeles se piden siempre
  enteros (pocos, y su estado de doblado cambia cuando avanzas tú, no cuando cambian ellos).
- **Tiempo real sin tablas publicadas.** Al subir cambios, el móvil dice «cambio» por el canal de la pareja y
  el otro baja. El guiño viaja por el mismo canal y no se guarda.
- **Avisos.** El móvil que hace algo llama a la función `avisar` con su sesión; la función comprueba quién es,
  lee la fila en el servidor y manda el push a la pareja. Sin triggers, sin webhooks, sin secretos en SQL.
- **Dependencias de ejecución:** `react`, `react-dom`, `react-router`, `@supabase/supabase-js`, `idb-keyval`,
  Workbox y dos fuentes. Nada más.

---

## 7. Rondas

Cada ronda deja la app usable, con `build`, `lint` y `test` en verde.

1. **La habitación y la vela.** Esquema nuevo, sincronización local primero, entrar, la repisa con las dos
   velas, encender/apagar, la mesilla, añadir libros, la estantería de lomos, la ficha del libro.
2. **Entre páginas y el sobre.** Papeles con doblado en servidor, el papel que cae al apagar la vela,
   «lo encontró el…», predicción y carta, cerrar un libro.
3. **Lo que vuelve.** Avisos push, el guiño, recuerdos en la repisa, noches leyendo los dos, ajustes,
   exportar, despliegue documentado.
