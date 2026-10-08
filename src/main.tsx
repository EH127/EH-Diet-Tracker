import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/heebo'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { captureInstallPrompt } from './lib/install'

registerSW({ immediate: true })
captureInstallPrompt()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
