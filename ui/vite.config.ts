import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from "vite-plugin-singlefile"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  server:{
    port: 3001,
    proxy: {
      '/__profile/api/all': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
