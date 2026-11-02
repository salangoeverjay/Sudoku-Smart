import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths, so the built dist/ works at a domain root or in a subfolder (GitHub Pages).
  base: './',
  plugins: [react(), tailwindcss()],
})
