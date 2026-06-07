import { type ReactNode, useState } from 'react';
import { Menu } from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetTrigger,
    SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { NavContent } from './NavContent';

interface AppLayoutProps {
    children: ReactNode;
}

/**
 * Root application shell.
 *
 * Layout:
 * - Desktop: fixed 256px sidebar (NavContent) + fluid main content area
 * - Mobile:  sticky top header with hamburger → Sheet (NavContent)
 *
 * The sidebar and header use `backdrop-blur` + semi-transparent backgrounds
 * so page content is visible scrolling underneath them.
 */
export function AppLayout({ children }: AppLayoutProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-900 transition-colors duration-200 selection:bg-gray-200 dark:bg-gray-900 dark:text-gray-100 dark:selection:bg-gray-800">
            {/* ── Desktop Sidebar ──────────────────────────────────────────── */}
            <aside className="fixed inset-y-0 hidden w-64 flex-col border-r border-gray-200 bg-white/80 backdrop-blur-xl lg:flex dark:border-gray-800 dark:bg-gray-900/50">
                <NavContent />
            </aside>

            {/* ── Main Content Area ────────────────────────────────────────── */}
            <main className="flex min-h-screen flex-1 flex-col lg:pl-64">
                {/* Mobile sticky header */}
                <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 px-4 backdrop-blur-md lg:hidden dark:border-gray-800 dark:bg-gray-900/80">
                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        Leroy Hostels
                    </span>

                    <Sheet
                        open={isMobileMenuOpen}
                        onOpenChange={setIsMobileMenuOpen}
                    >
                        <SheetTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Open navigation menu"
                                className="text-gray-600 dark:text-gray-300"
                            >
                                <Menu className="h-6 w-6" />
                            </Button>
                        </SheetTrigger>

                        <SheetContent
                            side="left"
                            className="w-64 border-r border-gray-200 bg-white p-0 text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
                        >
                            <SheetTitle className="sr-only">
                                Navigation Menu
                            </SheetTitle>
                            <NavContent
                                onItemClick={() => setIsMobileMenuOpen(false)}
                            />
                        </SheetContent>
                    </Sheet>
                </header>

                {/* Page content */}
                <div className="flex-1 p-4 md:p-6 lg:p-8">{children}</div>
            </main>
        </div>
    );
}
