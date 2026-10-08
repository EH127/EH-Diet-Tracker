// Imported by the generated service worker (workbox.importScripts). Paths are relative to the SW scope.
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* ignore malformed payloads */ }
  const title = data.title || 'מעקב תפריט';
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || '', icon: 'pwa-192x192.png', badge: 'pwa-64x64.png', dir: 'rtl', lang: 'he', data: { url: data.url },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || '#/today', self.registration.scope).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async list => {
    const client = list.find(c => c.url.startsWith(self.registration.scope));
    if (client) {
      if ('navigate' in client) { try { await client.navigate(target); } catch { /* fall through to focus */ } }
      return client.focus();
    }
    return self.clients.openWindow(target);
  }));
});
