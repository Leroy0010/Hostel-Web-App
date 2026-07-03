import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { requestPushPermission } from '../hooks/useWebPush';

const DISMISSAL_KEY = 'hostel_push_prompt_dismissed';
const COOLDOWN_PERIOD_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function PushNotificationPrompt() {
    const [isVisible, setIsVisible] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        // 1. Silent exit if push isn't supported
        if (!('Notification' in window) || !('serviceWorker' in navigator)) {
            return;
        }

        // 2. Silent exit if permission is already granted or denied
        if (Notification.permission !== 'default') {
            return;
        }

        // 3. Check if the user dismissed this recently
        const dismissedAt = localStorage.getItem(DISMISSAL_KEY);
        if (dismissedAt) {
            const timeSinceDismissal = Date.now() - parseInt(dismissedAt, 10);
            if (timeSinceDismissal < COOLDOWN_PERIOD_MS) {
                return;
            }
        }

        // 4. Show the prompt with a slight delay (better UX than instant pop-up)
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        // Record dismissal time to enforce the 30-day cooldown
        localStorage.setItem(DISMISSAL_KEY, Date.now().toString());
    };

    const handleEnable = async () => {
        setIsProcessing(true);
        try {
            // Trigger the native prompt
            await requestPushPermission(true);

            // Whether they accepted or denied the native prompt, we hide the soft prompt
            // and log the interaction so we don't ask again.
            localStorage.setItem(DISMISSAL_KEY, Date.now().toString());
            setIsVisible(false);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="fixed right-4 bottom-4 z-50 w-full max-w-sm rounded-xl border border-border bg-background p-4 shadow-xl sm:right-6 sm:bottom-6"
                >
                    <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Bell className="h-5 w-5" />
                        </div>

                        <div className="flex-1 space-y-1">
                            <h3 className="text-sm leading-none font-semibold tracking-tight">
                                Stay Updated
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Get instantly notified about maintenance
                                replies, warden announcements, and hostel
                                updates.
                            </p>
                        </div>

                        <button
                            onClick={handleDismiss}
                            className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            aria-label="Dismiss"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                        <button
                            onClick={handleDismiss}
                            disabled={isProcessing}
                            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                        >
                            Not Now
                        </button>
                        <button
                            onClick={handleEnable}
                            disabled={isProcessing}
                            className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                            {isProcessing ? 'Enabling...' : 'Enable Alerts'}
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
