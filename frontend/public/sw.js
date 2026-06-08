// public/sw.js

// Change this to look at the root folder where you just moved them
const iconUrl = new URL('/icon-192x192.png', self.location.origin).href;
const badgeUrl = new URL('/badge-96x96.png', self.location.origin).href;

self.addEventListener('push', (event) => {
    if (!event.data) return;

    try {
        const data = event.data.json();
        // Destructure based on your NotificationResponse DTO
        const { title, message, navigateUrl, id } = data;

        event.waitUntil(
            self.registration.showNotification(title || 'New Notification', {
                body: message,
                icon: iconUrl,
                badge: badgeUrl,
                data: { navigateUrl, id },
                tag: id,
                renotify: true,
            })
        );
    } catch (err) {
        console.error('Error parsing push event data:', err);
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const { navigateUrl } = event.notification.data || {};

    event.waitUntil(
        clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Default to root if no navigateUrl is provided
                const url = navigateUrl
                    ? new URL(navigateUrl, self.location.origin).href
                    : self.location.origin;

                // Focus an existing tab if it's already open to that URL
                for (const client of clientList) {
                    if (client.url === url && 'focus' in client) {
                        return client.focus();
                    }
                }

                // Otherwise, open a new window/tab
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
