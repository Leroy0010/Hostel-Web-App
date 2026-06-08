import { useEffect, useState } from 'react';

interface ServiceWorkerState {
    isSupported: boolean;
    isRegistered: boolean;
    isUpdateAvailable: boolean;
    registration: ServiceWorkerRegistration | null;
    error: string | null;
}

export function useServiceWorker() {
    const [state, setState] = useState<ServiceWorkerState>({
        isSupported: 'serviceWorker' in navigator,
        isRegistered: false,
        isUpdateAvailable: false,
        registration: null,
        error: null,
    });

    useEffect(() => {
        if (!state.isSupported) {
            return;
        }

        const registerServiceWorker = async () => {
            try {
                const registration = await navigator.serviceWorker.register(
                    '/sw.js',
                    {
                        scope: '/',
                    }
                );

                setState((prev) => ({
                    ...prev,
                    isRegistered: true,
                    registration,
                }));

                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (
                                newWorker.state === 'installed' &&
                                navigator.serviceWorker.controller
                            ) {
                                setState((prev) => ({
                                    ...prev,
                                    isUpdateAvailable: true,
                                }));
                            }
                        });
                    }
                });

                // Handle controller change
                navigator.serviceWorker.addEventListener(
                    'controllerchange',
                    () => {
                        window.location.reload();
                    }
                );
            } catch (error) {
                console.error('Service Worker registration failed:', error);
                setState((prev) => ({
                    ...prev,
                    error:
                        error instanceof Error
                            ? error.message
                            : 'Registration failed',
                }));
            }
        };

        registerServiceWorker();
    }, [state.isSupported]);

    const updateServiceWorker = async () => {
        if (state.registration && state.isUpdateAvailable) {
            try {
                await state.registration.update();
                setState((prev) => ({
                    ...prev,
                    isUpdateAvailable: false,
                }));
            } catch (error) {
                console.error('Service Worker update failed:', error);
                setState((prev) => ({
                    ...prev,
                    error:
                        error instanceof Error
                            ? error.message
                            : 'Update failed',
                }));
            }
        }
    };

    const skipWaiting = () => {
        if (state.registration && state.registration.waiting) {
            state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
    };

    return {
        ...state,
        updateServiceWorker,
        skipWaiting,
    };
}

// Hook for PWA install prompt
export function usePWAInstall() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstallable, setIsInstallable] = useState(false);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsInstallable(true);
        };

        const handleAppInstalled = () => {
            setDeferredPrompt(null);
            setIsInstallable(false);
        };

        window.addEventListener(
            'beforeinstallprompt',
            handleBeforeInstallPrompt
        );
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener(
                'beforeinstallprompt',
                handleBeforeInstallPrompt
            );
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const installApp = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                setDeferredPrompt(null);
                setIsInstallable(false);
            }
        }
    };

    return {
        isInstallable,
        installApp,
    };
}
