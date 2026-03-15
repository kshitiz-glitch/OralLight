import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './design-system.css'
import './index.css'
import App from './App'

import { ToastProvider } from './context/ToastContext'
import * as ort from 'onnxruntime-web'

// Configure ONNX Runtime environment
console.log('[ONNX] Configuring runtime environment...')
// Use CDN for WASM files - this is the recommended approach
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/'
ort.env.logLevel = 'warning'
console.log('[ONNX] Runtime configured with CDN WASM paths')




createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
)

// Week 5: Handle online/offline events for sync
window.addEventListener('online', async () => {
  console.log('[App] Connection restored, triggering sync...')

  // Notify service worker that we're online
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'ONLINE' })
  }

  // Also trigger immediate sync as fallback
  try {
    const { syncAllPending } = await import('./services/sync')
    const result = await syncAllPending()
    if (result.success > 0) {
      console.log(`[App] Synced ${result.success} cases after coming online`)
    }
  } catch (error) {
    console.error('[App] Failed to sync on online event:', error)
  }
})

window.addEventListener('offline', () => {
  console.log('[App] Connection lost - cases will sync when online')
})
