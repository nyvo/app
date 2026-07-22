import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { TooltipProvider } from '@/components/ui/tooltip'
import { initMonitoring } from '@/lib/monitoring'
import { installChunkReloadHandler } from '@/lib/chunk-reload'
// Self-hosted fonts — no Google CDN (GDPR + render-blocking). Imported here
// (not via CSS @import) so Vite's asset pipeline emits the woff2 files.
import '@fontsource-variable/inter/index.css'
import '@fontsource/open-sauce-one/500.css' // app headings are font-medium
import '@fontsource/open-sauce-one/600.css' // landing display headings
import '@fontsource-variable/geist-mono/index.css'
import './index.css'

// Wire error monitoring before the first render so early errors are captured.
// No-op unless VITE_SENTRY_DSN is set.
initMonitoring()

// A deploy invalidates old chunk URLs; open tabs would crash on their next
// navigation. Reload once to fetch the new build instead (see chunk-reload.ts).
installChunkReloadHandler()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TooltipProvider>
      <App />
    </TooltipProvider>
  </React.StrictMode>,
)
