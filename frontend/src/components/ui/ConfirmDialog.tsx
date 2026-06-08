import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

// =============================================================================
// Types
// =============================================================================

interface ConfirmDialogProps {
    /** Controls dialog visibility. */
    open: boolean;
    /** Called when the dialog should close (cancel or backdrop click). */
    onOpenChange: (open: boolean) => void;
    /** Dialog heading. */
    title: string;
    /** Supporting description text. */
    description: string;
    /** Label for the confirm button. Defaults to "Confirm". */
    confirmLabel?: string;
    /** Label for the cancel button. Defaults to "Cancel". */
    cancelLabel?: string;
    /**
     * Visual variant of the confirm button.
     *  - `"destructive"` — red, used for delete / deactivate actions.
     *  - `"default"` — standard dark button for non-destructive confirmations.
     */
    variant?: 'destructive' | 'default';
    /** Called when the user clicks the confirm button. */
    onConfirm: () => void;
    /** Shows a spinner and disables buttons while true. */
    isPending?: boolean;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Global reusable confirmation dialog.
 *
 * Wraps Shadcn's {@code AlertDialog} with:
 *  - Framer Motion scale entrance / exit animation.
 *  - Destructive and default confirm-button variants.
 *  - Loading state with spinner while the mutation is in flight.
 *  - Proper focus management and keyboard accessibility via AlertDialog.
 *
 * @example Delete confirmation:
 * ```tsx
 * <ConfirmDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Delete room?"
 *   description="This action cannot be undone."
 *   confirmLabel="Delete"
 *   variant="destructive"
 *   onConfirm={handleDelete}
 *   isPending={isDeleting}
 * />
 * ```
 */
export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'default',
    onConfirm,
    isPending = false,
}: ConfirmDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AnimatePresence>
                {open && (
                    <AlertDialogContent asChild forceMount>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{
                                duration: 0.2,
                                ease: [0.22, 1, 0.36, 1],
                            }}
                            className="border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
                        >
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-gray-900 dark:text-gray-100">
                                    {title}
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-gray-500 dark:text-gray-400">
                                    {description}
                                </AlertDialogDescription>
                            </AlertDialogHeader>

                            <AlertDialogFooter>
                                {/* Cancel */}
                                <Button
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                    disabled={isPending}
                                    className="border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                >
                                    {cancelLabel}
                                </Button>

                                {/* Confirm */}
                                <Button
                                    variant={
                                        variant === 'destructive'
                                            ? 'destructive'
                                            : 'default'
                                    }
                                    onClick={onConfirm}
                                    disabled={isPending}
                                    className={
                                        variant === 'default'
                                            ? 'bg-gray-900 text-white hover:bg-gray-700 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200'
                                            : undefined
                                    }
                                >
                                    {isPending && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    {confirmLabel}
                                </Button>
                            </AlertDialogFooter>
                        </motion.div>
                    </AlertDialogContent>
                )}
            </AnimatePresence>
        </AlertDialog>
    );
}
