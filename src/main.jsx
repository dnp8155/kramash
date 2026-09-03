import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Apply saved theme before React renders to prevent flash.
if (typeof window !== "undefined") {
  const savedTheme = localStorage.getItem("app-theme");
  if (savedTheme === "Night") {
    document.documentElement.classList.add("dark");
  }
}

// Register service worker for PWA (production only to avoid dev HMR conflicts).
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    // Dev: unregister any stale SW and clear caches so old cached JS chunks
    // (which may reference a broken/null React module) don't break HMR.
    window.addEventListener('load', () => {
      navigator.serviceWorker.getRegistrations()
        .then((regs) => regs.forEach((reg) => reg.unregister()))
        .catch(() => {});
      if ('caches' in window) {
        caches.keys()
          .then((keys) => keys.forEach((key) => caches.delete(key)))
          .catch(() => {});
      }
    });
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)