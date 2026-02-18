import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api-meteo': {
        target: 'https://public-api.meteofrance.fr/public/DPObs/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-meteo/, ''),
        secure: false,
      },
      '/api-meteo-paquet': {
        target: 'https://public-api.meteofrance.fr/public/DPPaquetObs/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-meteo-paquet/, ''),
        secure: false,
      },
      '/api-meteo-poste': {
        target: 'https://public-api.meteofrance.fr/public/DPAI01/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-meteo-poste/, ''),
        secure: false,
      },
      '/mf-token': {
        target: 'https://portail-api.meteofrance.fr/token',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mf-token/, ''),
        secure: false,
      },
      '/api-agate': {
        target: 'https://www.mwattest.fr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-agate/, ''),
        secure: false,
      },
      '/ORAGE': {
        target: 'https://www.mwattest.fr',
        changeOrigin: true,
        secure: false,
      },
      '/api-radar-mf': {
        target: 'https://public-api.meteofrance.fr/public/DPPaquetRadar/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-radar-mf/, ''),
        secure: false,
      }
    }
  }
})
