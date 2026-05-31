import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // 백엔드 없이 실행 — proxy 불필요
  },
  build: {
    outDir: 'dist',
  },
})
