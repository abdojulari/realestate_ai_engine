/**
 * Minimal scoped service worker for InstaConnect PWA installability.
 *
 * Intentionally NO caching — we just need a registered SW so that
 * Chrome/Edge fire `beforeinstallprompt` and the visitor can install
 * the agent's card to their home screen. iOS Safari shows
 * "Add to Home Screen" purely from the manifest <link>.
 *
 * Scoped to /connect/ so it never touches the rest of the app
 * (keeping it well clear of sw-crea-scheduler.js / sw-properties.js).
 */

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', () => {
  // pass-through; do not intercept
})
