/* Offline support + updates on the user's terms.
   The app always runs from the copy saved on the phone. A new version downloads quietly in the
   background and waits until the user taps "Update now" (the page sends 'skipWaiting').
   When you change any app file: bump VERSION and update NOTES (shown in the "Update available" box). */
const VERSION = 'vhl-1.3.1';
const NOTES = [
  'Meds tab is shorter: tap a medication to open it',
  'Fix a saved amount (it also fixes past entries)',
  'Rename a medication in Edit details',
  'Names saved with the amount in them (like "Naproxen - 500mg") are split into name and amount',
];
const FILES = ['./', 'index.html', 'app.js', 'manifest.webmanifest', 'jspdf.umd.min.js', 'qrcode.min.js', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
      // First install on this phone: start right away. Later versions wait for the user.
      .then(() => { if (!self.registration.active) return self.skipWaiting(); })
  );
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('vhl-') && k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.type === 'skipWaiting') self.skipWaiting();
  if (d.type === 'info' && e.ports[0]) e.ports[0].postMessage({ version: VERSION.replace(/^vhl-/, ''), notes: NOTES });
});
// Serve this version's saved copy; only go to the network for anything not saved.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSION)
      .then(c => c.match(e.request, { ignoreSearch: true }).then(hit => hit || (e.request.mode === 'navigate' ? c.match('index.html') : null)))
      .then(hit => hit || fetch(e.request))
  );
});
