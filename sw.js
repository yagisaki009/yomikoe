// 電波がないときもアプリを開けるよう、画面のファイルとフォントだけ手元に置いておく
const CACHE = 'yomikoe-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // フォントと、音声をMP3に圧縮する部品（lamejs）も手元に置いておく
  const isLib = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' || url.hostname === 'cdn.jsdelivr.net';
  if (url.origin !== location.origin && !isLib) return;
  // アプリのファイルは毎回GitHubに新しい版がないか確かめる（変わっていなければ通信はわずか）。
  // ブラウザの一時保存に任せると、更新が届くまで最大10分かかるため
  const fresh = isLib ? fetch(req) : fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' });
  e.respondWith(
    fresh
      .then((res) => {
        if (res.ok || res.type === 'opaque') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('./index.html'))),
  );
});
