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

// Remove the branded splash screen from index.html once React has mounted.
// React replaces #root content on render, but we also explicitly remove the
// splash element as a safety net in case it persists due to timing.
requestAnimationFrame(() => {
  const splash = document.getElementById('app-splash');
  if (splash && splash.parentNode) {
    splash.parentNode.removeChild(splash);
  }
});