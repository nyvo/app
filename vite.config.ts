/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  // Production builds must fail here rather than ship a bundle where every
  // paid checkout dead-ends on "Betaling er ikke tilgjengelig" (the
  // isStripeConfigured backstop in src/lib/stripe.ts). Dev/test builds only
  // warn — free-flow and non-checkout work shouldn't require the key.
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  if (!env.VITE_STRIPE_PUBLISHABLE_KEY) {
    if (mode === 'production') {
      throw new Error(
        'VITE_STRIPE_PUBLISHABLE_KEY is not set — a production build without it breaks all paid checkouts. Set it in the deploy environment (pk_live_… / pk_test_…).',
      )
    }
    console.warn(
      '[vite] VITE_STRIPE_PUBLISHABLE_KEY is not set — paid checkout will show "Betaling er ikke tilgjengelig". Add it to .env.local (see .env.example).',
    )
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    },
  }
})
