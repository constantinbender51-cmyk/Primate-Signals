import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': 'http://localhost:3000',
      '/live_matrix': 'http://localhost:3000',
      '/signal_history': 'http://localhost:3000',
      '/create-checkout-session': 'http://localhost:3000',
      '/create-portal-session': 'http://localhost:3000',
      '/legal': 'http://localhost:3000', // Add proxy for legal documents
      '/api-docs': 'http://localhost:3000' // Add proxy for API docs
    }
  }
})
