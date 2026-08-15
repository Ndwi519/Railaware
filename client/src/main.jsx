import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    // Unregister SW in development to prevent caching issues when starting dev server
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (let registration of registrations) {
        registration.unregister();
      }
    });
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
      console.log('SW registered: ', registration);

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          // If we already have a controller, this is an update.
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateNotification(newWorker);
          }
        });
      });
    }).catch((registrationError) => {
      console.log('SW registration failed: ', registrationError);
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('CONTROLLER CHANGE FIRED');
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
  }
}

function showUpdateNotification(newWorker) {
  if (document.getElementById('sw-update-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'sw-update-banner';
  banner.className = "fixed bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full shadow-2xl z-[99999] flex items-center gap-4 font-bold animate-in slide-in-from-bottom-5";
  banner.innerHTML = `
    <span>New version available</span>
    <button id="sw-update-btn" class="bg-white text-blue-600 px-4 py-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer">Refresh</button>
  `;
  document.body.appendChild(banner);

  document.getElementById('sw-update-btn').addEventListener('click', () => {
    newWorker.postMessage({ type: 'SKIP_WAITING' });
  });
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
