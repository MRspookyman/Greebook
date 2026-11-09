import { appleSplashScreenSizes, defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#f8eee9' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#f8eee9' } },
    appleSplashScreens: {
      // The generator deduplicates shared resolutions. Keep light paper even in dark mode:
      // iOS does not reliably select dark startup images.
      sizes: Object.entries(appleSplashScreenSizes)
        .filter(([name]) => name.startsWith('iPhone') && name !== 'iPhone SE 4"')
        .map(([, size]) => ({
          ...size,
          padding: 0.75,
          resizeOptions: { background: '#f8eee9' },
        })),
    },
  },
  images: ['public/icon.svg'],
})
