import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // 0.0.0.0 нужен, чтобы сайт открывался и по IPv4 localhost, и с других устройств в сети
    host: '0.0.0.0',
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:3001',
      '/socket.io': {
        target: 'http://127.0.0.1:3001',
        ws: true,
      },
    },
  },
})
