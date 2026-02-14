import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // La ruta base debe coincidir con el nombre de tu repositorio en GitHub
  base: '/Stats/',
})