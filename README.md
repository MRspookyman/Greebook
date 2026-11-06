# Greenbook

Diario de lectura para dos (PWA). Vite + React + TypeScript, Supabase y Cloudflare Pages.

## Desarrollo

```bash
npm install
cp .env.example .env.local   # rellena las 4 variables (proyecto greenbook-dev)
npm run dev                  # http://localhost:5173
npm test                     # lógica pura (rachas, intensidad, agregados, spoilers, sorpresas)
npm run build                # typecheck + build de producción con service worker
```

Opcional, con Docker: `npx supabase start` levanta un Supabase local con las migraciones aplicadas
(`supabase/config.toml`). Crea los usuarios con la API admin o Studio y ejecuta `supabase/seed.sql`.

## Puesta en marcha (una vez por proyecto: `greenbook-dev` y `greenbook`)

1. **Supabase → SQL editor**: ejecuta `supabase/migrations/0001_init.sql`.
2. **Authentication → Users → Add user** (marca *Auto Confirm User*) para ella y para ti.
   Copia sus UUID en `supabase/seed.sql`, ajusta los nombres y ejecútalo.
3. **Authentication → Providers → Email**: desactiva *Allow new users to sign up*.
4. **Google Books**: crea una API key en Google Cloud (Books API) restringida por HTTP referrer a
   `https://<tu-dominio>/*` y `http://localhost:5173/*`. Sin key funciona, pero la cuota compartida
   suele dar 429 y la búsqueda cae a Open Library.
5. **Avisos push** (solo en `greenbook`): las claves VAPID y los secretos están en `secretos.local`
   (no versionado; si lo pierdes, crea uno igual con `npx web-push generate-vapid-keys` y dos cadenas aleatorias).
   - `npx supabase login`
   - `node scripts/configurar-avisos.mjs <project-ref>`: sube los secretos, despliega `send-reminders` y
     `notify-partner` e imprime el SQL del cron (pégalo en el SQL editor) y los datos de los dos webhooks
     (**Database → Webhooks**: `readings` UPDATE y `reactions` INSERT).
6. **Cloudflare Pages**: conecta el repositorio; build `npm run build`, salida `dist`; variables
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GOOGLE_BOOKS_KEY`, `VITE_VAPID_PUBLIC_KEY`
   del proyecto `greenbook`. `public/_redirects` ya sirve la SPA.

## Personalizar el regalo

- Dedicatoria y mensajes sorpresa: `src/config/surprises.ts` (busca `✏️`). Añade las fechas reales de
  aniversario y cumpleaños (`'MM-DD'`).
- Icono: `public/icon.svg`, después `npm run icons`.

## Instalar en el iPhone

Safari → abre la URL de producción → Compartir → *Añadir a pantalla de inicio*. Los avisos solo
funcionan desde el icono instalado (iOS 16.4 o superior): Perfil → Avisos → *Activar avisos en este dispositivo*.
