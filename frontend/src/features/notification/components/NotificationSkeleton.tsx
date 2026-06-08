import { motion } from 'framer-motion';

export function NotificationSkeleton() {
    return (
        <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
                <motion.div
                    key={i}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                    className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950"
                >
                    <div className="mt-1 h-5 w-5 shrink-0 rounded-full bg-gray-200 dark:bg-gray-800" />
                    <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="h-4 w-1/3 rounded-md bg-gray-200 dark:bg-gray-800" />
                            <div className="h-3 w-16 rounded-md bg-gray-200 dark:bg-gray-800" />
                        </div>
                        <div className="space-y-2">
                            <div className="h-3 w-full rounded-md bg-gray-200 dark:bg-gray-800" />
                            <div className="h-3 w-4/5 rounded-md bg-gray-200 dark:bg-gray-800" />
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
