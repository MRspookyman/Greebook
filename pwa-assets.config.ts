import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Icons are generated from public/icon.svg with `npm run icons`.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#0e1b15' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#0e1b15' } },
  },
  images: ['public/icon.svg'],
})
