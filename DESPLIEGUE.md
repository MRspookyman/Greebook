# Desplegar Greenbook

Dos piezas: **Supabase** (cuentas, datos, tiempo real, avisos) y **Cloudflare** (la app, que son archivos
estáticos). Nada más.

## 1. Supabase

### Si ya teníais el Greenbook anterior

1. Supabase → **SQL Editor** → pega entero `supabase/migrations/0001_greenbook.sql` → **Run**. Después, igual,
   `supabase/migrations/0002_siguiente.sql`.
   - **Borra todos los datos anteriores** (libros, sesiones, citas…).
   - Conserva vuestras dos cuentas, los nombres, quién es pareja de quién y un color para cada uno.
2. Ya está. Entráis con el mismo email y contraseña.

Limpieza opcional de lo que ya no se usa (no molesta si se queda):

- Storage → borrar los buckets `book-covers` y `quote-photos`.
- Edge Functions → borrar `notify-partner` y `send-reminders`.
- Vault → borrar `greenbook_cron_secret` y `greenbook_webhook_secret`.

### Si es un proyecto nuevo

1. Authentication → Users → **Add user** dos veces (marca «Auto Confirm User»).
2. SQL Editor → pega y ejecuta `supabase/migrations/0001_greenbook.sql` y luego `supabase/migrations/0002_siguiente.sql`.
3. SQL Editor → abre `supabase/seed.sql`, cambia los dos emails y los dos nombres, ejecuta.

### Tiempo real

La app usa un único canal privado por pareja (Broadcast). No hay que publicar ninguna tabla. La migración
crea las políticas sobre `realtime.messages`; no hay nada que activar a mano.

### Avisos (push)

Una sola función, `avisar`. La app la llama con la sesión de quien hace algo; la función comprueba quién es,
lee la fila en el servidor y manda el aviso a su pareja. No hay cron, webhooks ni secretos dentro de SQL.

1. Genera un par de claves **una vez** (si ya teníais avisos, valen las mismas):

   ```bash
   npx web-push generate-vapid-keys
   ```

2. Guarda los secretos de la función (sustituye `<ref>` por el Reference ID del proyecto):

   ```bash
   npx supabase secrets set --project-ref <ref> VAPID_PUBLIC_KEY=<pública> VAPID_PRIVATE_KEY=<privada> VAPID_SUBJECT=mailto:<vuestro email>
   ```

3. Despliega la función. **Sin** `--no-verify-jwt`: tiene que exigir sesión.

   ```bash
   npx supabase functions deploy avisar --project-ref <ref> --use-api
   ```

4. Pon la clave pública en Cloudflare como `VITE_VAPID_PUBLIC_KEY` y vuelve a desplegar la app.
5. En cada móvil: avatar (arriba a la derecha) → **Avisarme en este móvil**. En iPhone hay que añadir antes
   Greenbook a la pantalla de inicio.

Avisa de cuatro cosas: el otro enciende su vela (como mucho una vez cada tres horas), deja un papel (si está
doblado para ti, el aviso no lleva su texto), encuentra uno tuyo, o termina un libro.

> La función no se ha podido ejecutar en el entorno donde se escribió (no había Deno ni un proyecto de
> Supabase). El texto de los avisos sí está cubierto por tests; el envío reutiliza el módulo que ya
> funcionaba en el Greenbook anterior. Probadla una vez tras desplegar.

## 2. Cloudflare

Igual que hasta ahora: el Worker `greebook` sirve la carpeta `dist` (ver `wrangler.jsonc`).

- **Build command:** `npm run build`
- **Variables de entorno del build** (Settings → Build → Variables):

  | Variable | Valor |
  | --- | --- |
  | `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` |
  | `VITE_SUPABASE_ANON_KEY` | la clave `anon` del proyecto |
  | `VITE_GOOGLE_BOOKS_KEY` | opcional; sin ella la búsqueda funciona con menos cuota |
  | `VITE_VAPID_PUBLIC_KEY` | la clave pública de los avisos (ver abajo) |

A mano, desde el portátil: `npm run build && npx wrangler deploy`.

> Sin `VITE_SUPABASE_URL` la app arranca en **modo ensayo**: un servidor de mentira dentro del navegador,
> para probarla (`npm run dev`) sin tocar nada real. Si en producción veis «Modo ensayo», falta esa variable.

## 3. Comprobar

- `npm test` · lógica (doblado de papeles, noches, estantería, sincronización).
- `npm run test:sql` · levanta un Postgres temporal y comprueba que una tercera cuenta no ve nada y que un
  papel doblado no suelta su texto. Necesita Postgres instalado en la máquina; no toca Supabase.
- `npm run lint` · `npm run build`.

**Datos de prueba** (solo en un proyecto de pruebas, nunca en el de verdad: borra todo lo que haya):
`supabase/demo.sql` (ya lleva los emails de Laura y Javier). Pégalo en el SQL Editor y ejecútalo; después, en cada móvil,
avatar → Salir y volver a entrar. La cabecera del archivo dice qué caso de la app prueba cada libro.
