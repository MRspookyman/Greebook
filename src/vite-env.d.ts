/// <reference types="vite/client" />

declare const __APP_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_GOOGLE_BOOKS_KEY?: string
  readonly VITE_VAPID_PUBLIC_KEY?: string
}

interface Navigator {
  /** iOS Safari: true when launched from the home screen. */
  readonly standalone?: boolean
}
