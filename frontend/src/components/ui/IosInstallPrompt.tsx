import { useState } from 'react';
import { Share, PlusSquare, X } from 'lucide-react';
import { isIos, isStandalone } from '../../hooks/ios-detection';

export function IosInstallPrompt() {
    // Pass a function to useState. React will run this exactly once on mount
    // to calculate the initial state, completely avoiding the useEffect.
    const [showPrompt, setShowPrompt] = useState(() => {
        if (typeof window === 'undefined') return false;

        if (isIos() && !isStandalone()) {
            const dismissed = localStorage.getItem('ios_install_dismissed');
            return !dismissed; // Show if it hasn't been dismissed
        }
        return false;
    });

    if (!showPrompt) return null;

    return (
        <div className="bottom-safe fixed right-4 left-4 z-50 mx-auto mb-20 max-w-sm rounded-xl border border-border bg-background p-4 shadow-xl sm:mb-6">
            <button
                onClick={() => {
                    setShowPrompt(false);
                    localStorage.setItem('ios_install_dismissed', 'true');
                }}
                className="absolute top-2 right-2 rounded-full p-1 text-muted-foreground hover:bg-muted"
            >
                <X className="h-4 w-4" />
            </button>

            <div className="mb-2 font-semibold">Install HostelLife+</div>
            <p className="text-sm text-muted-foreground">
                To get push notifications and access the app offline, install it
                to your home screen:
            </p>

            <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                    1. Tap the <Share className="h-4 w-4 text-blue-500" /> Share
                    button at the bottom.
                </li>
                <li className="flex items-center gap-2">
                    2. Scroll down and tap <PlusSquare className="h-4 w-4" />{' '}
                    "Add to Home Screen".
                </li>
            </ol>
        </div>
    );
}
