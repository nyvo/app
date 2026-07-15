import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { TooltipProvider } from '@/components/ui/tooltip'
import { initMonitoring } from '@/lib/monitoring'
// Self-hosted fonts — no Google CDN (GDPR + render-blocking). Imported here
// (not via CSS @import) so Vite's asset pipeline emits the woff2 files.
import '@fontsource-variable/geist/index.css'
import '@fontsource-variable/geist-mono/index.css'
import './index.css'

// Wire error monitoring before the first render so early errors are captured.
// No-op unless VITE_SENTRY_DSN is set.
initMonitoring()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TooltipProvider>
      <App />
    </TooltipProvider>
  </React.StrictMode>,
)
