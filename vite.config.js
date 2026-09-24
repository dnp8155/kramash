import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Expose BASE44_* prefixed env vars to client-side code (in addition to VITE_).
  envPrefix: ['VITE_', 'BASE44_'],
  // Deduplicate React to prevent "Cannot read properties of null (reading 'useState')"
  // caused by multiple React copies loaded from different Vite dep cache versions.
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  optimizeDeps: {
    include: ['@supabase/supabase-js'],
    entries: ['index.html', 'src/**/*.js', 'src/**/*.jsx', 'src/**/*.ts', 'src/**/*.tsx']
  },
  server: {
    watch: {
      ignored: ['**/supabase/functions/**', '**/supabase/.bundled/**', '**/supabase/.temp/**']
    }
  },
  plugins: [
    base44({
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      analyticsTracker: true,
      visualEditAgent: true
    }),
    react()
  ]
});