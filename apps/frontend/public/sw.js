/*
 * DCash service worker — Web Push for DCaos ("O Sistema Lembrou").
 * Kept dependency-free and network-transparent: no fetch handler/caching,
 * so it never serves stale app code. It only shows notifications and routes
 * clicks back into the app.
 */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }

  const title = data.title || '🔔 DCash';
  const options = {
    body: data.body || 'Tem novidade por aqui.',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: data.tag || 'dcaos',
    renotify: true,
    data: { link: data.link || '/painel' },
    lang: 'pt-BR',
  };

  const tasks = [self.registration.showNotification(title, options)];
  if (typeof data.badge === 'number' && 'setAppBadge' in self.navigator) {
    tasks.push(data.badge > 0 ? self.navigator.setAppBadge(data.badge) : self.navigator.clearAppBadge());
  }
  event.waitUntil(Promise.all(tasks).catch(() => undefined));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.link || '/painel', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      // Reuse an open app window when there is one
      for (const client of windows) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.navigate(target).catch(() => undefined);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});

// The browser may rotate the subscription; ask the app to re-register on next open.
self.addEventListener('pushsubscriptionchange', () => {
  self.registration.showNotification('DCash', {
    body: 'Abra o app para continuar recebendo os lembretes da casa.',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: 'dcaos-resubscribe',
    data: { link: '/dcaos/lembretes' },
  });
});
