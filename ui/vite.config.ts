import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from "vite-plugin-singlefile"
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  server:{
    port: 3011,
    proxy: {
      '/api/all': {
        target: 'http://localhost:3010/api/__profile/api/all',
        changeOrigin: true
      }
    }
  }
})
