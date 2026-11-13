import { createServer } from 'vite'

// Preview the real screens with the existing browser-only rehearsal data.
const server = await createServer({
  cacheDir: 'node_modules/.vite-visual-review',
  define: { 'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('') },
  server: { host: '127.0.0.1', port: 5176, strictPort: true },
})
await server.listen()
server.printUrls()
