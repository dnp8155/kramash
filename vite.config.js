import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

// Stamps public/sw.js (copied into the build output) with this build's id and full asset list.
// The id is a hash of the hashed asset file names, so it changes exactly when the app changes —
// that makes every deploy produce a different sw.js, which is how browsers detect an update and
// how the "new version available" banner appears. See the header comment in public/sw.js.
function serviceWorkerStamp() {
  let outDir = ''
  let assets = []
  return {
    name: 'kramasha-sw-stamp',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    generateBundle(_options, bundle) {
      assets = Object.keys(bundle)
        .filter((file) => file !== 'index.html' && !file.endsWith('.map'))
        .map((file) => `/${file}`)
        .sort()
    },
    closeBundle() {
      const swPath = path.join(outDir, 'sw.js')
      if (!fs.existsSync(swPath)) return
      const buildId = crypto.createHash('sha1').update(assets.join('|')).digest('hex').slice(0, 12)
      const stamped = fs
        .readFileSync(swPath, 'utf8')
        .replace('__BUILD_ID__', buildId)
        .replace('__PRECACHE_URLS__', JSON.stringify(assets))
      fs.writeFileSync(swPath, stamped)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Expose BASE44_* prefixed env vars to client-side code (in addition to VITE_).
  envPrefix: ['VITE_', 'BASE44_'],
  // Deduplicate React to prevent "Cannot read properties of null (reading 'useState')"
  // caused by multiple React copies loaded from different Vite dep cache versions.
  resolve: {
    alias: {
      '@': '/src'
    },
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
    react(),
    serviceWorkerStamp()
  ]
});
