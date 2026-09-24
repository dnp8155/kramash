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
    {
      // Vite scans all .ts files in the project, including supabase/functions/ (Deno
      // Edge Functions). These use Deno-specific npm: specifiers and Deno.env that Vite
      // can't resolve. Intercept the load hook and return an empty module for any file
      // in supabase/functions/ so Vite never parses their imports.
      name: 'stub-supabase-edge-functions',
      enforce: 'pre',
      load(id) {
        // id is an absolute path like /app/supabase/functions/_shared/supabaseClient.ts
        if (id.includes('/supabase/functions/') && (id.endsWith('.ts') || id.endsWith('.js'))) {
          return 'export default {};';
        }
        return null;
      }
    },
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