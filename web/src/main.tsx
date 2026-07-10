import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Registra el service worker (hace la app instalable como PWA).
// Solo en producción: en desarrollo interferiría con el hot reload.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* sin SW la app funciona igual, solo no es instalable */
    })
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
