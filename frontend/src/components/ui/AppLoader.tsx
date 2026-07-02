import { Loader2 } from 'lucide-react';

export function AppLoader() {
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gray-50 transition-colors duration-200 dark:bg-gray-900">
            <div className="flex flex-col items-center space-y-4">
                <div className="relative flex h-16 w-16 items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-gray-900 dark:text-gray-100" />
                    <div className="absolute h-16 w-16 animate-ping rounded-full border-2 border-gray-200/40 opacity-20 dark:border-gray-800/40" />
                </div>
                <p className="animate-pulse font-mono text-xs font-medium tracking-widest text-gray-400 uppercase dark:text-gray-500">
                    Loading...
                </p>
            </div>
        </div>
    );
}
