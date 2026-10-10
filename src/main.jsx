import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import GlobalErrorBoundary from '@/components/common/GlobalErrorBoundary'
import '@/index.css'
import '@/lib/apiConcurrency' // side-effect: patches base44 entities with concurrency limiting
import { applySavedTheme } from '@/lib/theme'
import { initScrollbarAutoHide } from '@/lib/scrollbarAutoHide'
import { initInstallCapture } from '@/hooks/usePWA'

// Apply saved theme before React renders to prevent flash.
if (typeof window !== "undefined") {
  applySavedTheme();
  // Android browsers/WebViews often skip the backdrop blur, which leaves "glass" panels see-through.
  // This lets the CSS use a solid fill there (iOS keeps the frosted look).
  if (/Android/i.test(navigator.userAgent)) document.documentElement.classList.add("is-android");
  // iPhone only (iPadOS reports itself as a Mac, so it's deliberately not matched here).
  if (/iPhone|iPod/.test(navigator.userAgent)) document.documentElement.classList.add("is-ios");
  initScrollbarAutoHide();
  initInstallCapture(); // catch the browser's one-time install offer as early as possible

  // Disable the browser right-click context menu app-wide.
  window.addEventListener("contextmenu", (e) => e.preventDefault());
}

// Register service worker for PWA. We temporarily enable it in dev so Push Notifications can be tested.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<GlobalErrorBoundary><App /></GlobalErrorBoundary>);

// Remove the branded pre-mount splash right after React's first paint.
// The splash lives outside #root (see index.html) so it survives React's
// render instead of being wiped out mid-animation, and AppLoadingScreen is a
// pixel match for it — so by the time we remove it here, the identical-
// looking screen is already painted underneath and the swap is invisible.
// Double rAF waits for that paint to actually land before removing it.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const splash = document.getElementById('app-splash');
    if (splash && splash.parentNode) {
      splash.parentNode.removeChild(splash);
    }
  });
});