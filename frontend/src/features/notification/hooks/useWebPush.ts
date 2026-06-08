import { useMutation } from '@tanstack/react-query';
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

export const useWebPushSubscription = () => {
    const subscribeMutation = useMutation({
        mutationFn: notificationApi.subscribeToPush,
    });

    const requestPushPermission = async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            toast.error(
                'Push notifications are not supported in this browser.'
            );
            return;
        }

        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                toast.error('Notification permission denied.');
                return;
            }

            // 1. Register Service Worker and subscribe via PushManager
            const registration =
                await navigator.serviceWorker.register('/sw.js');
            await navigator.serviceWorker.ready;

            // 2. Get VAPID Key from backend
            const { publicKey } = await notificationApi.getVapidKey();

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlB64ToUint8Array(publicKey),
            });

            // 3. Extract keys safely
            const p256dh = subscription.getKey('p256dh');
            const auth = subscription.getKey('auth');

            if (!p256dh || !auth) throw new Error('Missing push keys');

            // 4. Send subscription to backend
            await subscribeMutation.mutateAsync({
                endpoint: subscription.endpoint,
                p256dh: btoa(
                    String.fromCharCode.apply(
                        null,
                        Array.from(new Uint8Array(p256dh))
                    )
                ),
                auth: btoa(
                    String.fromCharCode.apply(
                        null,
                        Array.from(new Uint8Array(auth))
                    )
                ),
                userAgent: navigator.userAgent,
            });

            toast.success('Successfully subscribed to push notifications!');
        } catch (error) {
            console.error('Push subscription failed:', error);
            toast.error('Failed to subscribe to push notifications.');
        }
    };

    return { requestPushPermission, isLoading: subscribeMutation.isPending };
};
