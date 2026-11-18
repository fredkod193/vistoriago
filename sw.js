const V = 'vgo-335d58575f';
const CORE = ["./", "app.css", "pwa.js", "app.js", "pwa.css", "index.html", "icon-180.png", "icon-192.png", "manifest.webmanifest", "icon-512.png", "data/r1.js", "data/p4.js", "data/nbr_img.bin", "data/p3.js", "data/nbr_txt.bin", "data/r7.js", "data/tabpages.js", "data/r3.js", "data/r5.js", "data/r2.js", "data/p1.js", "data/modelos.js", "data/r4.js", "data/r8.js", "data/r6.js", "data/mapa.js", "data/p2.js", "data/catalogo.js", "data/exig.js", "data/nbr_meta.js", "data/p5.js", "fonts/jetbrains-mono-latin-400-normal.woff2", "fonts/jetbrains-mono-latin-500-normal.woff2", "fonts/barlow-condensed-latin-700-normal.woff2", "fonts/barlow-condensed-latin-600-normal.woff2", "fonts/barlow-latin-600-normal.woff2", "fonts/barlow-latin-400-normal.woff2", "fonts/barlow-latin-500-normal.woff2", "fonts/jetbrains-mono-latin-600-normal.woff2"];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(V).then(c => c.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(res => { if (res.ok && new URL(e.request.url).origin === location.origin) c.put(e.request, res.clone()); return res; }))));
});
self.addEventListener('message', async e => {
  if (!e.data || e.data.t !== 'baixar') return;
  const c = await caches.open(V); const list = e.data.files; let done = 0;
  const port = e.ports[0];
  const queue = list.slice();
  const worker = async () => { while (queue.length) { const f = queue.shift(); try { if (!(await c.match(f))) { const r = await fetch(f); if (r.ok) await c.put(f, r); } } catch (x) {} done++; if (done % 5 === 0 || done === list.length) port.postMessage({ done, total: list.length }); } };
  await Promise.all([worker(), worker(), worker(), worker()]);
  port.postMessage({ done: list.length, total: list.length, fim: true });
});
