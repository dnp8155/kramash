import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import '@/lib/apiConcurrency' // side-effect: patches base44 entities with concurrency limiting

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

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red', background: '#fee', zIndex: 99999, position: 'relative' }}>
          <h2>React Crashed!</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error?.toString()}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: '10px', fontSize: '12px' }}>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<ErrorBoundary><App /></ErrorBoundary>);

// Remove the branded splash screen once React has mounted (next animation
// frame). The logo image is preloaded via <link rel="preload"> in index.html
// so it renders instantly in the splash during that brief frame.
requestAnimationFrame(() => {
  setTimeout(() => {
    const splash = document.getElementById('app-splash');
    if (splash && splash.parentNode) {
      splash.parentNode.removeChild(splash);
    }
  }, 2000);
});