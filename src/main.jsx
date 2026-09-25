import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import '@/lib/apiConcurrency' // side-effect: patches base44 entities with concurrency limiting
import { applyThemeColor } from '@/lib/themeColor'

// Apply saved theme before React renders to prevent flash.
if (typeof window !== "undefined") {
  const savedTheme = localStorage.getItem("app-theme");
  const isDark = savedTheme === "Night";
  if (isDark) {
    document.documentElement.classList.add("dark");
  }
  applyThemeColor(isDark);

  // Disable the browser right-click context menu app-wide.
  window.addEventListener("contextmenu", (e) => e.preventDefault());
}

// Register service worker for PWA (production only to avoid dev HMR conflicts).
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    // Dev: immediately unregister any stale SW and clear caches so old cached
    // JS chunks (which may reference a broken/null React module) don't break HMR.
    // Runs ASAP — before load — so stale chunks are never served.
    navigator.serviceWorker.getRegistrations()
      .then((regs) => regs.forEach((reg) => reg.unregister()))
      .catch(() => {});
    if ('caches' in window) {
      caches.keys()
        .then((keys) => keys.forEach((key) => caches.delete(key)))
        .catch(() => {});
    }
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

// Remove the branded splash screen after 2 seconds so the logo is
// visible briefly. The logo image is preloaded via <link rel="preload">
// in index.html so it renders instantly in the splash.
setTimeout(() => {
  const splash = document.getElementById('app-splash');
  if (splash && splash.parentNode) {
    splash.parentNode.removeChild(splash);
  }
}, 2000);