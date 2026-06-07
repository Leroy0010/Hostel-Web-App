import { motion } from 'framer-motion';

/**
 * Animated skeleton placeholder matching the {@link HostelCard} layout.
 *
 * Renders a shimmering pulse to indicate that content is loading.
 * Use in a grid identical to the hostel list grid so the layout
 * doesn't shift when real data arrives.
 *
 * @example
 * ```tsx
 * {isLoading
 *   ? Array.from({ length: 6 }).map((_, i) => <HostelCardSkeleton key={i} />)
 *   : hostels.map(h => <HostelCard key={h.id} hostel={h} />)
 * }
 * ```
 */
export function HostelCardSkeleton() {
    return (
        <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950"
            aria-hidden="true"
        >
            {/* Image placeholder */}
            <div className="aspect-video bg-gray-100 dark:bg-gray-800" />

            {/* Body placeholder */}
            <div className="space-y-2.5 p-4">
                <div className="h-3.5 w-3/4 rounded-md bg-gray-100 dark:bg-gray-800" />
                <div className="h-3 w-1/2 rounded-md bg-gray-100 dark:bg-gray-800" />
            </div>
        </motion.div>
    );
}
