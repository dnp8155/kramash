import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Register service worker for PWA support.
// The SW caches the app shell for offline loading but never caches
// authenticated API responses.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed — app still works as a normal web page.
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)