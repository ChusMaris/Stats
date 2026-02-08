import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 'base' establece la ruta base pública. 
  // './' permite que la app funcione en cualquier subdirectorio (ej: usuario.github.io/repo)
  // en lugar de asumir que está en la raíz del dominio.
  base: './',
  optimizeDeps: {
    include: ['recharts', 'echarts', 'zrender'],
  },
})