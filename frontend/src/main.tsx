// Load Tauri adapter before anything else (maps window.electronAPI to Tauri APIs)
if ((window as any).__TAURI_INTERNALS__) {
  import('./tauriAdapter')
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
