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

// Links shared with clients and crew (quotation, invoice, portals...) used to show the generic Kramasha card
// (logo + marketing text) when pasted into WhatsApp or iMessage, because those apps only read the tags in
// index.html and never run the app. For each of these pages the build writes a copy of index.html with neutral tags
// instead (a plain title, a plain pastel card (page icon + title, small grey monochrome Kramasha mark bottom-right) from public/share/ (kept small, WhatsApp skips big images), no marketing text, not for search engines). vercel.json sends each route to its
// copy. The copy still loads the normal app, so visitors see no difference.
const SITE = "https://www.kramasha.com";
const SHARE_PAGES = {
  quotation: { title: "Quotation", description: "Open to view and respond.", image: "quotation" },
  invoice: { title: "Invoice", description: "Open to view your invoice.", image: "invoice" },
  portal: { title: "Client Portal", description: "Open to view your project.", image: "portal" },
  tracking: { title: "Event Progress", description: "Open to see the latest update.", image: "tracking" },
  jobsheet: { title: "Job Sheet", description: "Open to view the job sheet.", image: "jobsheet" },
  team: { title: "Team Portal", description: "Open to view your assignments.", image: "team" },
  // Public business page: meant to be found, so (unlike the private links) it is NOT marked noindex. The page itself
  // still sets the business-specific title, description and image for search engines once it loads.
  profile: { title: "Business Profile", description: "View our work, services and contact details.", image: "profile", index: true },
};
// Keep the routes in vercel.json in step with this list.

// The public site pages (About, Terms, Privacy, Contact, FAQ) share one picture (public/share/landing.jpg, the same as the home page). They are meant to be found and shared, so unlike the private
// links above they keep all their search tags and only get their own preview title, text, address and picture. The home
// page needs no copy: its preview is the default in index.html.
const PUBLIC_PAGES = {
  about: { path: "/about", title: "About Kramasha", description: "The story behind Kramasha and who it is built for.", image: "landing" },
  terms: { path: "/terms", title: "Terms of Service", description: "The terms for using Kramasha.", image: "landing" },
  privacy: { path: "/privacy", title: "Privacy Policy", description: "How Kramasha handles and protects your data.", image: "landing" },
  contact: { path: "/contact", title: "Contact Kramasha", description: "Get in touch with the Kramasha team.", image: "landing" },
  faq: { path: "/faq", title: "FAQ", description: "Answers to common questions about Kramasha.", image: "landing" },
};
// Replaces a whole <meta> tag (they can span lines) whose name or property is `key`, or adds it if it is missing.
function setMetaTag(html, key, content) {
  const tag = `<meta ${key.startsWith("og:") ? "property" : "name"}="${key}" content="${content}" />`;
  const re = new RegExp(`<meta\\s+(?:name|property)="${key.replace(":", "\\:")}"[\\s\\S]*?/>`, "i");
  return re.test(html) ? html.replace(re, tag) : html.replace("</head>", `    ${tag}\n  </head>`);
}
function sharePreviewPages() {
  let outDir = ""
  return {
    name: "kramasha-share-preview-pages",
    apply: "build",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const indexPath = path.join(outDir, "index.html")
      if (!fs.existsSync(indexPath)) return
      const base = fs.readFileSync(indexPath, "utf8")
        .replace(/<title>[\s\S]*?<\/title>/i, "")
        .replace(/<link\b[^>]*rel="canonical"[^>]*>/gi, "")
        .replace(/<script\b[^>]*application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<meta\b[^>]*?(?:name|property)="(?:og:|twitter:|article:|description|keywords|robots|author|audience)[^"]*"[^>]*?>/gi, "")
      for (const [kind, page] of Object.entries(SHARE_PAGES)) {
        const tags = [
          `<title>${page.title}</title>`,
          `<meta name="description" content="${page.description}" />`,
          page.index ? "" : `<meta name="robots" content="noindex, nofollow" />`,
          `<meta property="og:type" content="website" />`,
          `<meta property="og:title" content="${page.title}" />`,
          `<meta property="og:description" content="${page.description}" />`,
          `<meta property="og:image" content="${SITE}/share/${page.image}.jpg" />`,
          `<meta property="og:image:width" content="1200" />`,
          `<meta property="og:image:height" content="630" />`,
          `<meta name="twitter:card" content="summary_large_image" />`,
          `<meta name="twitter:image" content="${SITE}/share/${page.image}.jpg" />`,
          `<meta name="twitter:title" content="${page.title}" />`,
          `<meta name="twitter:description" content="${page.description}" />`,
        ].filter(Boolean).join("\n    ")
        fs.writeFileSync(path.join(outDir, `share-${kind}.html`), base.replace("</head>", `    ${tags}\n  </head>`))
      }
      const full = fs.readFileSync(indexPath, "utf8")
      for (const [kind, page] of Object.entries(PUBLIC_PAGES)) {
        const url = `${SITE}${page.path}`
        const image = `${SITE}/share/${page.image}.jpg`
        let html = full.replace(/<title>[\s\S]*?<\/title>/i, `<title>${page.title}</title>`)
          .replace(/<link\b[^>]*rel="canonical"[^>]*>/i, `<link rel="canonical" href="${url}" />`)
        const values = {
          description: page.description, "og:title": page.title, "og:description": page.description, "og:url": url,
          "og:image": image, "og:image:width": "1200", "og:image:height": "630", "og:image:alt": page.title,
          "twitter:title": page.title, "twitter:description": page.description, "twitter:url": url,
          "twitter:image": image, "twitter:image:alt": page.title, "twitter:card": "summary_large_image",
        }
        for (const [key, value] of Object.entries(values)) html = setMetaTag(html, key, value)
        fs.writeFileSync(path.join(outDir, `share-${kind}.html`), html)
      }
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
    include: ['@supabase/supabase-js', '@tanstack/react-query', '@tanstack/react-query-persist-client', '@tanstack/query-async-storage-persister', 'idb-keyval'],
    entries: ['index.html', 'src/**/*.js', 'src/**/*.jsx', 'src/**/*.ts', 'src/**/*.tsx']
  },
  server: {
    watch: {
      ignored: ['**/supabase/functions/**', '**/supabase/.bundled/**', '**/supabase/.temp/**']
    }
  },
  plugins: [
    react(),
    serviceWorkerStamp(),
    sharePreviewPages()
  ]
});
