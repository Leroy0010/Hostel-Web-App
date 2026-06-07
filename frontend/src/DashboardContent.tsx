import { useTheme } from "./components/theme-provider";
import { useEffect } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { Button } from "./components/ui/button";

export default function DashboardContent() {
    const { theme, setTheme,  } = useTheme();

    // Listen for global "d" hotkey to safely cycle themes
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (
                event.key.toLowerCase() === 'd' &&
                !(document.activeElement instanceof HTMLInputElement) &&
                !(document.activeElement instanceof HTMLTextAreaElement)
            ) {
                setTheme(theme === 'dark' ? 'light' : 'dark');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [theme, setTheme]);

    return (
        <AppLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold tracking-tight">
                        Dashboard Overview
                    </h1>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                            setTheme(theme === 'dark' ? 'light' : 'dark')
                        }
                        className="border-gray-300 dark:border-gray-700"
                    >
                        Toggle {theme === 'dark' ? 'Light' : 'Dark'} Mode
                    </Button>
                </div>

                <div className="font-mono text-xs text-gray-500 dark:text-gray-400">
                    (Press{' '}
                    <kbd className="rounded border border-gray-300 bg-gray-200 px-1 py-0.5 text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                        d
                    </kbd>{' '}
                    to toggle dark mode instantly)
                </div>

                {/* Showcase responsive adaptive cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="h-32 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800/80 dark:bg-gray-800/40">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Total Bookings
                        </span>
                        <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                            1,248
                        </p>
                    </div>
                    <div className="h-32 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800/80 dark:bg-gray-800/40">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Available Rooms
                        </span>
                        <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                            42
                        </p>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
