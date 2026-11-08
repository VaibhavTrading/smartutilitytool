/**
 * MONU COMPUTERS - PWA & Offline Engine Controller (Background Caching Only)
 * Manages Service Worker registration and cache pre-warming silently in the background
 * without user-facing banners, badges, or install buttons.
 */

(function () {
  // Register Service Worker silently in the background
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('[PWA] Service Worker registered with scope:', registration.scope);
          })
          .catch((err) => {
            console.warn('[PWA] Service Worker registration failed:', err);
          });
      });
    }
  }

  registerServiceWorker();

  window.PWAController = {
    openOfflineModal: function() {}
  };
})();
