import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 1. Fixes "Black Page" on reload for nested routes (e.g., /asset/BTC)
  base: '/', 
  server: {
    proxy: {
      // 2. Proxies the new API routes to your backend
      '/api': 'http://localhost:3000',
      
      // Existing proxies
      '/auth': 'http://localhost:3000',
      '/create-checkout-session': 'http://localhost:3000',
      '/create-portal-session': 'http://localhost:3000',
      
      // REMOVED: '/legal' proxy caused collision with frontend routes
      
      // Legacy/Cleanup (You can likely remove these if you updated APIDocs.jsx)
      '/live_matrix': 'http://localhost:3000',
      '/signal_history': 'http://localhost:3000',
    }
  }
})
