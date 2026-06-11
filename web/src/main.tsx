import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { LOGO_DATA_URL } from './lib/logo'
import './index.css'

// Favicon con el logo embebido (no hay archivos binarios en el repo)
const favicon = document.createElement('link')
favicon.rel = 'icon'
favicon.type = 'image/png'
favicon.href = LOGO_DATA_URL
document.head.appendChild(favicon)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
