// features/notification/hooks/useWebPush.ts
import { notificationApi } from '../api/notification.api';
import { toast } from 'sonner';

// Helper to convert VAPID key to Uint8Array required by the browser
function urlB64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const buffer = new ArrayBuffer(rawData.length);
    const outputArray = new Uint8Array(buffer);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * @param isUserInitiated - Set to true if triggered by a button click (shows toasts).
 * False for background auto-reconnections (fails silently).
 */
export const requestPushPermission = async (isUserInitiated = false) => {
    // 1. Silent exit if unsupported or not in a secure context (e.g., HTTP local dev)
    if (
        !('serviceWorker' in navigator) ||
        !('PushManager' in window) ||
        !window.isSecureContext
    ) {
        if (isUserInitiated) {
            toast.error(
                'Push notifications are not supported in this browser.'
            );
        }
        return;
    }

    // 2. Silent exit if the user previously denied permissions
    if (Notification.permission === 'denied') {
        if (isUserInitiated) {
            toast.error(
                'Notifications are blocked by your browser settings. Please enable them manually.'
            );
        }
        return;
    }

    try {
        let permission: NotificationPermission = Notification.permission;

        // 3. Only request permission if it hasn't been granted or denied yet
        if (permission === 'default') {
            permission = await Notification.requestPermission();
        }

        // If they dismissed the prompt or denied it, exit silently.
        if (permission !== 'granted') {
            return;
        }

        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        const { publicKey } = await notificationApi.getVapidKey();
        const applicationServerKey = urlB64ToUint8Array(publicKey);

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey,
        });

        const json = subscription.toJSON();
        const keys = json.keys as { p256dh: string; auth: string };

        const p256dh = keys.p256dh;
        const auth = keys.auth;

        if (!p256dh || !auth) throw new Error('Missing push keys');

        await notificationApi.subscribeToPush({
            endpoint: subscription.endpoint,
            p256dh: p256dh,
            auth: auth,
            userAgent: navigator.userAgent,
        });

        if (isUserInitiated) {
            toast.success('Successfully subscribed to push notifications!');
        }
    } catch (error) {
        console.error('Push subscription failed:', error);
        if (isUserInitiated) {
            toast.error('Failed to subscribe to push notifications.');
        }
    }
};
