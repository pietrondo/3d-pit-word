import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: './src',
  publicDir: '../public',
  
  // Configurazione del build
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: true,
    minify: 'terser',
    target: 'es2020',
    rollupOptions: {
      input: {
        main: './src/index.html'
      },
      output: {
        manualChunks: {
          // Separa Three.js in un chunk separato per il caching
          'three': ['three'],
          // Separa Cannon.js in un chunk separato
          'physics': ['cannon-es'],
          // Separa Socket.IO in un chunk separato
          'network': ['socket.io-client']
        }
      }
    },
    // Ottimizzazioni per le performance
    chunkSizeWarningLimit: 1000
  },

  // Configurazione del server di sviluppo
  server: {
    port: 3000,
    host: true,
    open: true,
    cors: true
  },

  // Configurazione delle dipendenze
  optimizeDeps: {
    include: [
      'three',
      'cannon-es',
      'socket.io-client'
    ],
    exclude: []
  },

  // Configurazione degli alias
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@core': resolve(__dirname, 'src/js/core'),
      '@world': resolve(__dirname, 'src/js/world'),
      '@player': resolve(__dirname, 'src/js/player'),
      '@input': resolve(__dirname, 'src/js/input'),
      '@ui': resolve(__dirname, 'src/js/ui'),
      '@audio': resolve(__dirname, 'src/js/audio'),
      '@network': resolve(__dirname, 'src/js/network'),
      '@config': resolve(__dirname, 'src/js/config')
    }
  },

  // Configurazione degli asset
  assetsInclude: [
    '**/*.svg',
    '**/*.png',
    '**/*.jpg',
    '**/*.jpeg',
    '**/*.gif',
    '**/*.webp',
    '**/*.mp3',
    '**/*.wav',
    '**/*.ogg',
    '**/*.glb',
    '**/*.gltf'
  ],

  // Configurazione per il preview
  preview: {
    port: 4173,
    host: true,
    cors: true
  },

  // Configurazione CSS
  css: {
    devSourcemap: true
  },

  // Configurazione per l'environment
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    __PROD__: JSON.stringify(process.env.NODE_ENV === 'production'),
    __VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0')
  }
});