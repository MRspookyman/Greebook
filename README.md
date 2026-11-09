# Greenbook

Diario de lectura para dos (PWA). Vite + React + TypeScript, Supabase y Cloudflare Workers.

Estética «Tarde de manta, noche de lámpara»: papel rosado, tinta ciruela y luz miel.
Young Serif para títulos, Nunito para interfaz, Literata para lectura y Caveat para palabras personales.
Tokens y reglas actuales en [`docs/estilo.md`](docs/estilo.md).

Formatos: **Papel** (páginas) y **Kindle** (porcentaje por defecto, o páginas si se conoce el total).
El tiempo de lectura registrado en cada sesión es independiente del progreso.

El rediseño «Leer juntos» ya está integrado; referencias de diseño y prototipo en
[`docs/rediseno`](docs/rediseno/README.md).

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
   `0008_citas.sql`, `0009_leer_juntos.sql`, `0010_historico_ebook.sql` y `0011_avisos_privacidad.sql` en ese orden.
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
   Configura los marcadores de URL y secretos de los avisos con el paso 5.
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
     Conserva los triggers de 0007, 0008 y 0009. Tras cada una, vuelve a desplegar `notify-partner` (avisa de citas, respuestas, de que el otro se ha puesto a leer, como mucho una vez por noche, y de que se ha unido a tu lectura). No hace falta crear «Database Webhooks». Solo se avisa de citas,
     respuestas, desbloqueos, ratitos, propuestas para leer juntos, retos propuestos y libros terminados;
     no de sesiones, corazones ni presencia. El recordatorio diario propio es independiente y neutral.
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
