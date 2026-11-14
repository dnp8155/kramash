import { defineConfig } from 'vitest/config'


// Unit tests for the pure business logic (dates, plans, quotation sync). Kept separate from vite.config.js
// so the Base44 plugin and the service-worker stamp are not loaded while testing.
export default defineConfig({
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
  test: { environment: 'node', include: ['tests/**/*.test.js'], env: { TZ: 'Asia/Kolkata' } },
})
