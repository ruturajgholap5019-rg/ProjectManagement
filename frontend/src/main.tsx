import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Handle stale Vite dynamic chunks after new deployments on Vercel/CDN
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const reloadKey = 'vite_preload_reload';
  if (!sessionStorage.getItem(reloadKey)) {
    sessionStorage.setItem(reloadKey, 'true');
    window.location.reload();
  }
});

// Clear reload lock after successful boot
setTimeout(() => {
  sessionStorage.removeItem('vite_preload_reload');
  sessionStorage.removeItem('app_chunk_reload_lock');
}, 3000);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
