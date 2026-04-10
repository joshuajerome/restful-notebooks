import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// In Tauri production mode, the frontend is served from tauri:// protocol,
// so relative /api paths don't work. Fetch the backend port and set baseURL.
if ((window as any).__TAURI_INTERNALS__ && !import.meta.env.DEV) {
  import('@tauri-apps/api/core').then(({ invoke }) => {
    invoke<number>('get_backend_port').then((port) => {
      api.defaults.baseURL = `http://127.0.0.1:${port}/api`
    })
  })
}

export default api
