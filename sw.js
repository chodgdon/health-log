/* Offline support + updates on the user's terms.
   The phone keeps a saved copy of the version the user is on ("current") and always shows that copy,
   even after a newer version has downloaded and even after the app is closed and reopened.
   Only "Update now" in the app (message 'apply') switches to the newer version.
   When you change any app file: bump VER here and APP_VERSION in app.js (same number), and update NOTES
   (shown in the "Update available" box). */
const VER = '1.3.3';
const CACHE = 'vhl-' + VER;
const META = 'vhl-meta';
/* Required updates: for a major fix, set REQUIRED_MIN to that version's number (e.g. '1.3.5').
   Phones on any older version then get it the next time the app opens, and see an Important update notice
   until then. Leave it set in later versions so phones that skipped it still get it. '' = nothing required. */
const REQUIRED_MIN = '';
const cmpV = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; };
const isRequired = cur => !!(REQUIRED_MIN && cur && cur !== VER && cmpV(cur, REQUIRED_MIN) < 0);
const NOTES = [
  'Updates now always wait for you to tap "Update now", even if you close and reopen the app',
  'Doctor / ER / VA visit: optional boxes for the doctor, follow-up, and what the doctor said',
];
const FILES = ['./', 'index.html', 'app.js', 'manifest.webmanifest', 'jspdf.umd.min.js', 'qrcode.min.js', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

// Which version the user is on. Stored on the phone in a tiny cache entry.
let currentP = null;
function getCurrent() {
  if (!currentP) currentP = caches.open(META)
    .then(c => c.match('current'))
    .then(r => r ? r.text() : null)
    .then(async v => (v && await caches.has('vhl-' + v)) ? v : null); // its saved copy must still exist
  return currentP;
}
async function setCurrent(v) {
  const c = await caches.open(META);
  await c.put('current', new Response(v));
  currentP = Promise.resolve(v);
}
async function cleanUp(keep) {
  for (const k of await caches.keys()) if (k.startsWith('vhl-') && k !== META && !keep.includes(k)) await caches.delete(k);
}

self.addEventListener('install', e => {
  // Save this version's files. The new worker takes over right away, but keeps showing the user's current version.
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    let cur = await getCurrent();
    if (!cur) { cur = VER; await setCurrent(VER); } // first install (or the move from the older update system)
    await cleanUp(['vhl-' + cur, CACHE]);          // keep: the version in use + the newest download
    await self.clients.claim();
  })());
});
self.addEventListener('message', e => {
  const d = e.data || {}, port = e.ports[0];
  if (d.type === 'info' && port) {
    e.waitUntil(getCurrent().then(cur => port.postMessage({ version: cur || VER, latest: VER, notes: NOTES, required: isRequired(cur) })));
  }
  if (d.type === 'apply') { // the user tapped "Update now"
    e.waitUntil(setCurrent(VER).then(() => cleanUp([CACHE])).then(() => port && port.postMessage({ ok: true })));
  }
});
// Serve the saved copy of the user's current version; only go to the network for anything not saved.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith((async () => {
    let cur = (await getCurrent()) || VER;
    // A required update switches in when the app is opened (not while it's in use)
    if (e.request.mode === 'navigate' && isRequired(cur)) { await setCurrent(VER); await cleanUp([CACHE]); cur = VER; }
    const c = await caches.open('vhl-' + cur);
    const hit = await c.match(e.request, { ignoreSearch: true }) || (e.request.mode === 'navigate' ? await c.match('index.html') : null);
    return hit || fetch(e.request);
  })());
});
