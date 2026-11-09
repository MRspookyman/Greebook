# Greenbook

Diario de lectura para dos (PWA). Vite + React + TypeScript, Supabase y Cloudflare Workers.

Estética «Tarde de manta, noche de lámpara»: papel rosado, tinta ciruela y luz miel.
Young Serif para títulos, Nunito para interfaz, Literata para lectura y Caveat para palabras personales.
Tokens y reglas actuales en [`docs/estilo.md`](docs/estilo.md).

Formatos: **Papel** (páginas) y **Kindle** (porcentaje por defecto, o páginas si se conoce el total).
El tiempo de lectura registrado en cada sesión es independiente del progreso.

El rediseño «Leer juntos» ya está integrado; referencias de diseño y prototipo en
[`docs/rediseno`](docs/rediseno/README.md).

En Biblioteca → Leídos puedes alternar **Portadas / Lista** (se recuerda en el dispositivo).
Ambas vistas agrupan un libro por año y respetan los filtros de personas, búsqueda y formato.
La lista muestra las notas de ambos sin ocultarlas; en relecturas del mismo año cuenta la última
finalización de cada persona. Las medias y la ordenación usan solo las personas y formatos visibles.

En **Citas** puedes buscar por texto, comentario o libro y filtrar por cualquiera de los libros con citas.
Las citas y notas propias se pueden editar; también tus respuestas. Puedes adjuntar una foto de página
(JPEG comprimido, máximo 1600 px) sin escribir texto y compartir las citas abiertas como una imagen.
«Sin spoilers» permite ver una cita compartida sin esperar al progreso de lectura.
En Kindle sin número de páginas, una cita con página espera hasta terminar la lectura (o abrirla antes);
sin página o marcada «Sin spoilers» se ve directamente.

## Desarrollo

```bash
npm install
cp .env.example .env.local   # rellena las 4 variables (Project Settings → API)
npm run dev                  # http://localhost:5173
npm test                     # lógica pura (rachas, intensidad, agregados, spoilers)
npm run build                # typecheck + build de producción con service worker
```

Opcional, con Docker: `npx supabase start` levanta un Supabase local con las migraciones aplicadas
(`supabase/config.toml`). Crea los usuarios con la API admin o Studio y ejecuta `supabase/seed.sql`.

## Puesta en marcha (proyecto único `greenbook`; antes del regalo se vacían los datos de prueba)

1. **Supabase → SQL editor**: ejecuta `supabase/migrations/0001_init.sql`, `0003_drop_ebook.sql`,
   `0004_partner_notifications.sql`, `0005_pareja.sql`, `0006_notify_never_blocks.sql`, `0007_rincon.sql`,
   `0008_citas.sql`, `0009_leer_juntos.sql`, `0010_historico_ebook.sql`, `0011_avisos_privacidad.sql`,
   `0012_avisos.sql`, `0013_citas_fotos.sql`, `0014_libros_editables.sql`, `0015_etiquetas_recomendaciones.sql`,
   `0016_sesiones_hora.sql` y `0017_abandono.sql` en ese orden.
   La 0008 copia notas y huellas a las citas compartidas (no borra las tablas viejas).
   La 0010 se aplica manualmente también a proyectos existentes, después de la 0009:
   añade fechas de fin con precisión e histórico, convierte audiolibros a Kindle (%) y prepara el borrado de lecturas.
   Las citas compartidas y sus respuestas se conservan al borrar una lectura.
   La 0011 se aplica manualmente también a proyectos existentes, después de la 0010: vincula los avisos al
   usuario actual, oculta respuestas a citas bloqueadas y protege los participantes y el canal privado de Leer juntos.
   Después vuelve a desplegar la función con
   `npx supabase functions deploy notify-partner --project-ref <project-ref> --no-verify-jwt`
   (conserva los secretos existentes). Despliega también el cliente actualizado; al abrirlo con sesión iniciada
   recupera la suscripción de avisos del dispositivo para esa cuenta, sin volver a pedir permiso.
   La 0012 retira solo los triggers de avisos obsoletos (sin borrar tablas) e indexa las ráfagas de citas.
   Tras aplicarla, vuelve a desplegar `notify-partner`, `send-reminders` y el cliente actualizado.
   Configura los marcadores de URL y secretos de los avisos con el paso 5.
   La 0013 permite fotos privadas de páginas y citas sin texto si tienen foto, mantiene las fotos ocultas
   mientras haya spoilers y añade permisos para editar/borrar respuestas propias.
   Aplícala antes de desplegar el nuevo cliente y vuelve a desplegar `notify-partner`.
   Las fotos se guardan en el bucket privado `quote-photos` (2 MiB, JPEG/WebP); el cliente usa enlaces firmados
   de una hora. Al borrar una cita o quitar su foto se intenta eliminar el archivo asociado.
   La 0014 deja que los dos editéis los datos de un libro y crea el bucket público `book-covers` para portadas propias.
   La 0015 añade etiquetas compartidas por libro (`book_tags`) y recomendaciones entre vosotros (`recommendations`,
   con aviso); vuelve a desplegar `notify-partner`. La 0016 guarda la hora de inicio de cada sesión (`started_at`)
   para «A qué hora leéis»; solo rellena las antiguas cuando la estimación cae en su mismo día.
   La 0017 añade el motivo al dejar un libro y la función `edit_reading_units`, que cambia formato/unidad de una
   lectura convirtiendo sus sesiones en una sola transacción. Aplícalas antes de desplegar el cliente.
2. **Authentication → Users → Add user** (marca *Auto Confirm User*) para ella y para ti.
   Copia sus UUID en `supabase/seed.sql`, ajusta los nombres y ejecútalo.
3. **Authentication → Providers → Email**: desactiva *Allow new users to sign up*.
4. **Google Books**: crea una API key en Google Cloud (Books API) restringida por HTTP referrer a
   `https://<tu-dominio>/*` y `http://localhost:5173/*`. Sin key funciona, pero la cuota compartida
   suele dar 429 y la búsqueda cae a Open Library.
5. **Avisos push**: las claves VAPID y los secretos están en `secretos.local`
   (no versionado; si lo pierdes, crea uno igual con `npx web-push generate-vapid-keys` y dos cadenas aleatorias).
   - `npx supabase login`
   - `node scripts/configurar-avisos.mjs <project-ref>`: sube los secretos, despliega `send-reminders` y
     `notify-partner` y genera `avisos-sql.local` (0002 + 0004 + 0006: cron cada 15 min y webhook
     de pareja que nunca bloquea escrituras, con los secretos ya puestos): pégalo entero en el SQL editor.
     No hace falta crear «Database Webhooks». Después de configurar el webhook, aplica también 0012:
     conserva libros terminados, inicio de lectura (una vez por día), unión a la lectura en vivo,
     citas/notas compartidas, respuestas, desbloqueos y propuestas/aceptaciones/inicios de leer juntos.
     Las citas del mismo autor y libro en 30 minutos sustituyen el mismo aviso, sin volver a alertar
     y sin revelar textos bloqueados. El recordatorio diario usa la «Racha de los dos», incluidos
     los comodines; no hay horas de silencio ni avisos de ratitos, retos, mensajes o corazones.
     Los latidos de Leer juntos siguen siendo solo Realtime, sin push ni entrega garantizada en segundo plano.
     Vibran en navegadores compatibles; iOS Safari/PWA no implementa vibración y conserva el pulso visual.
6. **Cloudflare Workers**: conecta el repositorio (build `npm run build`, deploy `npx wrangler deploy`;
   `wrangler.jsonc` sirve `dist` como SPA) y añade como *build variables* `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`, `VITE_GOOGLE_BOOKS_KEY`, `VITE_VAPID_PUBLIC_KEY` y `NODE_VERSION=22`.
   El nombre del Worker **`greebook`** es intencional (commit `99c8db6`); no renombrarlo.
   Cada build usa SHA corto + timestamp como buster de la caché persistida; sin `.git` usa timestamp.

La bienvenida solo configura nombre, objetivo anual y recordatorio; no muestra mensajes personales.

## Personalizar el regalo

- Icono y arranque iOS: `public/icon.svg` y `pwa-assets.config.ts`, después `npm run icons`.
  El generador ya es una devDependency. Genera las resoluciones iPhone deduplicadas (SE a 17/Air);
  los enlaces de `index.html` cubren vertical y horizontal, siempre sobre papel claro `#f8eee9`.
  Si cambian las resoluciones, actualiza también esos enlaces.

## Instalar en el iPhone

Safari → abre la URL de producción → Compartir → *Añadir a pantalla de inicio*. Los avisos solo
funcionan desde el icono instalado (iOS 16.4 o superior): Perfil → Avisos → *Activar avisos en este dispositivo*.

## Seguridad de los datos

`.env.local` puede apuntar a producción: para probar escrituras usa un proyecto separado.
**NUNCA ejecutar `supabase/demo.sql` ni `supabase/reset.sql` en producción después de entregar
el regalo**: son destructivos; el reset también elimina suscripciones push y reinicia la bienvenida.
